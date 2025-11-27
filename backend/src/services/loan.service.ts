import { query, getClient } from '../config/database';
import { Loan, LoanType, LoanStatus } from '../types';
import * as accountService from './account.service';
import logger from '../utils/logger';

interface CreateLoanDto {
  loan_type: LoanType;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
}

interface LoanPaymentSchedule {
  payment_number: number;
  payment_date: Date;
  principal_payment: number;
  interest_payment: number;
  total_payment: number;
  remaining_balance: number;
}

/**
 * Калькулятор кредита (аннуитетный платеж)
 */
export const calculateLoan = (
  principal: number,
  annualRate: number,
  termMonths: number
): {
  monthly_payment: number;
  total_payment: number;
  total_interest: number;
  schedule: LoanPaymentSchedule[];
} => {
  // Месячная процентная ставка
  const monthlyRate = annualRate / 12 / 100;
  
  // Формула аннуитетного платежа
  const monthlyPayment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  // График платежей
  const schedule: LoanPaymentSchedule[] = [];
  let remainingBalance = principal;

  for (let i = 1; i <= termMonths; i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;

    // Защита от отрицательного остатка из-за округления
    if (i === termMonths) {
      remainingBalance = 0;
    }

    const paymentDate = new Date();
    paymentDate.setMonth(paymentDate.getMonth() + i);

    schedule.push({
      payment_number: i,
      payment_date: paymentDate,
      principal_payment: Math.round(principalPayment * 100) / 100,
      interest_payment: Math.round(interestPayment * 100) / 100,
      total_payment: Math.round(monthlyPayment * 100) / 100,
      remaining_balance: Math.max(0, Math.round(remainingBalance * 100) / 100),
    });
  }

  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - principal;

  return {
    monthly_payment: Math.round(monthlyPayment * 100) / 100,
    total_payment: Math.round(totalPayment * 100) / 100,
    total_interest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
};

/**
 * Создание заявки на кредит
 */
export const createLoanApplication = async (
  userId: string,
  loanData: CreateLoanDto
): Promise<Loan> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Рассчитываем параметры кредита
    const calculation = calculateLoan(
      loanData.principal_amount,
      loanData.interest_rate,
      loanData.term_months
    );

    // Создаем заявку
    const result = await client.query(
      `INSERT INTO loans (
        user_id, loan_type, principal_amount, interest_rate,
        term_months, monthly_payment, remaining_balance, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        loanData.loan_type,
        loanData.principal_amount,
        loanData.interest_rate,
        loanData.term_months,
        calculation.monthly_payment,
        loanData.principal_amount,
        LoanStatus.PENDING,
      ]
    );

    await client.query('COMMIT');

    logger.info('Loan application created', {
      userId,
      loanId: result.rows[0].id,
      amount: loanData.principal_amount,
    });

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating loan application:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Одобрение кредита и выдача средств
 */
export const approveLoan = async (
  loanId: string,
  accountId: string
): Promise<Loan> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем кредит
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1 FOR UPDATE',
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      throw new Error('Loan not found');
    }

    const loan = loanResult.rows[0];

    if (loan.status !== LoanStatus.PENDING) {
      throw new Error('Loan is not pending approval');
    }

    // Проверяем что счет существует и принадлежит пользователю
    const account = await accountService.getAccountById(accountId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.user_id !== loan.user_id) {
      throw new Error('Account does not belong to loan applicant');
    }

    // Выдаем средства на счет
    await accountService.updateAccountBalance(accountId, loan.principal_amount, false);

    // Даты
    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setMonth(maturityDate.getMonth() + loan.term_months);
    
    const nextPaymentDate = new Date(now);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    // Обновляем кредит
    const updateResult = await client.query(
      `UPDATE loans 
       SET status = $1, account_id = $2, disbursement_date = $3,
           maturity_date = $4, next_payment_date = $5
       WHERE id = $6
       RETURNING *`,
      [
        LoanStatus.ACTIVE,
        accountId,
        now,
        maturityDate,
        nextPaymentDate,
        loanId,
      ]
    );

    // Создаем график платежей
    const schedule = calculateLoan(
      loan.principal_amount,
      loan.interest_rate,
      loan.term_months
    ).schedule;

    for (const payment of schedule) {
      await client.query(
        `INSERT INTO loan_payments (
          loan_id, payment_number, due_date, principal_amount,
          interest_amount, total_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          loanId,
          payment.payment_number,
          payment.payment_date,
          payment.principal_payment,
          payment.interest_payment,
          payment.total_payment,
          'pending',
        ]
      );
    }

    await client.query('COMMIT');

    logger.info('Loan approved and disbursed', {
      loanId,
      accountId,
      amount: loan.principal_amount,
    });

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving loan:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Отклонение заявки на кредит
 */
export const rejectLoan = async (loanId: string): Promise<void> => {
  try {
    const result = await query(
      'UPDATE loans SET status = $1 WHERE id = $2',
      ['rejected', loanId]
    );

    if (result.rowCount === 0) {
      throw new Error('Loan not found');
    }

    logger.info('Loan rejected', { loanId });
  } catch (error) {
    logger.error('Error rejecting loan:', error);
    throw error;
  }
};

/**
 * Получение всех кредитов пользователя
 */
export const getUserLoans = async (userId: string): Promise<Loan[]> => {
  try {
    const result = await query(
      'SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user loans:', error);
    throw error;
  }
};

/**
 * Получение кредита по ID
 */
export const getLoanById = async (loanId: string): Promise<Loan | null> => {
  try {
    const result = await query(
      'SELECT * FROM loans WHERE id = $1',
      [loanId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting loan by ID:', error);
    throw error;
  }
};

/**
 * Проверка принадлежности кредита пользователю
 */
export const isLoanOwner = async (
  loanId: string,
  userId: string
): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [loanId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking loan ownership:', error);
    throw error;
  }
};

/**
 * Получение графика платежей
 */
export const getLoanPaymentSchedule = async (
  loanId: string
): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT * FROM loan_payments 
       WHERE loan_id = $1 
       ORDER BY payment_number ASC`,
      [loanId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting loan payment schedule:', error);
    throw error;
  }
};

/**
 * Платеж по кредиту
 */
export const makeLoanPayment = async (
  loanId: string,
  accountId: string,
  amount: number
): Promise<void> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем кредит
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1 FOR UPDATE',
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      throw new Error('Loan not found');
    }

    const loan = loanResult.rows[0];

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Loan is not active');
    }

    // Списываем средства со счета
    await accountService.updateAccountBalance(accountId, amount, true);

    // Находим следующий неоплаченный платеж
    const paymentResult = await client.query(
      `SELECT * FROM loan_payments 
       WHERE loan_id = $1 AND status = 'pending'
       ORDER BY payment_number ASC
       LIMIT 1`,
      [loanId]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];

      // Отмечаем платеж как оплаченный
      await client.query(
        `UPDATE loan_payments 
         SET status = 'paid', paid_date = CURRENT_TIMESTAMP, paid_amount = $1
         WHERE id = $2`,
        [amount, payment.id]
      );
    }

    // Обновляем остаток по кредиту
    const newBalance = Math.max(0, loan.remaining_balance - amount);
    
    await client.query(
      'UPDATE loans SET remaining_balance = $1 WHERE id = $2',
      [newBalance, loanId]
    );

    // Если кредит погашен полностью
    if (newBalance === 0) {
      await client.query(
        'UPDATE loans SET status = $1 WHERE id = $2',
        [LoanStatus.PAID_OFF, loanId]
      );
    } else {
      // Обновляем дату следующего платежа
      const nextPayment = await client.query(
        `SELECT due_date FROM loan_payments 
         WHERE loan_id = $1 AND status = 'pending'
         ORDER BY payment_number ASC
         LIMIT 1`,
        [loanId]
      );

      if (nextPayment.rows.length > 0) {
        await client.query(
          'UPDATE loans SET next_payment_date = $1 WHERE id = $2',
          [nextPayment.rows[0].due_date, loanId]
        );
      }
    }

    await client.query('COMMIT');

    logger.info('Loan payment made', { loanId, amount });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error making loan payment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Досрочное погашение кредита
 */
export const earlyRepayment = async (
  loanId: string,
  accountId: string
): Promise<void> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем кредит
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1 FOR UPDATE',
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      throw new Error('Loan not found');
    }

    const loan = loanResult.rows[0];

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Loan is not active');
    }

    const remainingAmount = loan.remaining_balance;

    // Списываем полную сумму со счета
    await accountService.updateAccountBalance(accountId, remainingAmount, true);

    // Обновляем кредит
    await client.query(
      `UPDATE loans 
       SET remaining_balance = 0, status = $1 
       WHERE id = $2`,
      [LoanStatus.PAID_OFF, loanId]
    );

    // Отмечаем все неоплаченные платежи как отмененные
    await client.query(
      `UPDATE loan_payments 
       SET status = 'cancelled' 
       WHERE loan_id = $1 AND status = 'pending'`,
      [loanId]
    );

    await client.query('COMMIT');

    logger.info('Loan early repayment completed', { loanId, amount: remainingAmount });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in early repayment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Статистика по кредитам пользователя
 */
export const getUserLoanStats = async (
  userId: string
): Promise<{
  total_loans: number;
  active_loans: number;
  total_borrowed: number;
  total_remaining: number;
  monthly_payment_total: number;
}> => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COALESCE(SUM(principal_amount), 0) as total_borrowed,
        COALESCE(SUM(CASE WHEN status = 'active' THEN remaining_balance ELSE 0 END), 0) as total_remaining,
        COALESCE(SUM(CASE WHEN status = 'active' THEN monthly_payment ELSE 0 END), 0) as monthly_payment_total
       FROM loans 
       WHERE user_id = $1`,
      [userId]
    );

    return {
      total_loans: parseInt(result.rows[0].total_loans),
      active_loans: parseInt(result.rows[0].active_loans),
      total_borrowed: parseFloat(result.rows[0].total_borrowed),
      total_remaining: parseFloat(result.rows[0].total_remaining),
      monthly_payment_total: parseFloat(result.rows[0].monthly_payment_total),
    };
  } catch (error) {
    logger.error('Error getting loan stats:', error);
    throw error;
  }
};

export default {
  calculateLoan,
  createLoanApplication,
  approveLoan,
  rejectLoan,
  getUserLoans,
  getLoanById,
  isLoanOwner,
  getLoanPaymentSchedule,
  makeLoanPayment,
  earlyRepayment,
  getUserLoanStats,
};
