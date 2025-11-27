import { query, getClient } from '../config/database';
import { Deposit, DepositType, DepositStatus } from '../types';
import * as accountService from './account.service';
import logger from '../utils/logger';

interface CreateDepositDto {
  deposit_type: DepositType;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  is_auto_renewal?: boolean;
}

/**
 * Калькулятор депозита (простые проценты)
 */
export const calculateDeposit = (
  principal: number,
  annualRate: number,
  termMonths: number
): {
  interest_earned: number;
  final_amount: number;
  monthly_interest: number;
} => {
  // Простые проценты
  const interest = (principal * annualRate * termMonths) / (12 * 100);
  const finalAmount = principal + interest;
  const monthlyInterest = interest / termMonths;

  return {
    interest_earned: Math.round(interest * 100) / 100,
    final_amount: Math.round(finalAmount * 100) / 100,
    monthly_interest: Math.round(monthlyInterest * 100) / 100,
  };
};

/**
 * Калькулятор депозита (сложные проценты)
 */
export const calculateCompoundDeposit = (
  principal: number,
  annualRate: number,
  termMonths: number
): {
  interest_earned: number;
  final_amount: number;
  monthly_interest_avg: number;
} => {
  // Сложные проценты (ежемесячная капитализация)
  const monthlyRate = annualRate / 12 / 100;
  const finalAmount = principal * Math.pow(1 + monthlyRate, termMonths);
  const interest = finalAmount - principal;

  return {
    interest_earned: Math.round(interest * 100) / 100,
    final_amount: Math.round(finalAmount * 100) / 100,
    monthly_interest_avg: Math.round((interest / termMonths) * 100) / 100,
  };
};

/**
 * Открытие депозита
 */
export const openDeposit = async (
  userId: string,
  accountId: string,
  depositData: CreateDepositDto
): Promise<Deposit> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Проверяем счет
    const isOwner = await accountService.isAccountOwner(accountId, userId);
    
    if (!isOwner) {
      throw new Error('Account does not belong to user');
    }

    // Списываем средства со счета
    await accountService.updateAccountBalance(
      accountId,
      depositData.principal_amount,
      true // списание
    );

    // Рассчитываем параметры
    const calculation = depositData.deposit_type === DepositType.FIXED
      ? calculateCompoundDeposit(
          depositData.principal_amount,
          depositData.interest_rate,
          depositData.term_months
        )
      : calculateDeposit(
          depositData.principal_amount,
          depositData.interest_rate,
          depositData.term_months
        );

    // Даты
    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + depositData.term_months);

    // Создаем депозит
    const result = await client.query(
      `INSERT INTO deposits (
        user_id, account_id, deposit_type, principal_amount,
        interest_rate, term_months, current_balance, status,
        start_date, maturity_date, is_auto_renewal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        accountId,
        depositData.deposit_type,
        depositData.principal_amount,
        depositData.interest_rate,
        depositData.term_months,
        depositData.principal_amount,
        DepositStatus.ACTIVE,
        startDate,
        maturityDate,
        depositData.is_auto_renewal || false,
      ]
    );

    await client.query('COMMIT');

    logger.info('Deposit opened', {
      userId,
      depositId: result.rows[0].id,
      amount: depositData.principal_amount,
    });

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error opening deposit:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получение всех депозитов пользователя
 */
export const getUserDeposits = async (userId: string): Promise<Deposit[]> => {
  try {
    const result = await query(
      'SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user deposits:', error);
    throw error;
  }
};

/**
 * Получение депозита по ID
 */
export const getDepositById = async (depositId: string): Promise<Deposit | null> => {
  try {
    const result = await query(
      'SELECT * FROM deposits WHERE id = $1',
      [depositId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting deposit by ID:', error);
    throw error;
  }
};

/**
 * Проверка принадлежности депозита пользователю
 */
export const isDepositOwner = async (
  depositId: string,
  userId: string
): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT id FROM deposits WHERE id = $1 AND user_id = $2',
      [depositId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking deposit ownership:', error);
    throw error;
  }
};

/**
 * Начисление процентов по депозиту
 */
export const accrueInterest = async (depositId: string): Promise<void> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем депозит
    const depositResult = await client.query(
      'SELECT * FROM deposits WHERE id = $1 FOR UPDATE',
      [depositId]
    );

    if (depositResult.rows.length === 0) {
      throw new Error('Deposit not found');
    }

    const deposit = depositResult.rows[0];

    if (deposit.status !== DepositStatus.ACTIVE) {
      throw new Error('Deposit is not active');
    }

    // Рассчитываем проценты за месяц
    const monthlyRate = deposit.interest_rate / 12 / 100;
    const interestAmount = deposit.current_balance * monthlyRate;

    // Обновляем баланс (для депозитов с капитализацией)
    if (deposit.deposit_type === DepositType.FIXED) {
      const newBalance = deposit.current_balance + interestAmount;
      
      await client.query(
        'UPDATE deposits SET current_balance = $1 WHERE id = $2',
        [newBalance, depositId]
      );
    }

    await client.query('COMMIT');

    logger.info('Interest accrued', { depositId, amount: interestAmount });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error accruing interest:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Закрытие депозита (досрочное или по сроку)
 */
export const closeDeposit = async (
  depositId: string,
  isEarly: boolean = false
): Promise<number> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем депозит
    const depositResult = await client.query(
      'SELECT * FROM deposits WHERE id = $1 FOR UPDATE',
      [depositId]
    );

    if (depositResult.rows.length === 0) {
      throw new Error('Deposit not found');
    }

    const deposit = depositResult.rows[0];

    if (deposit.status !== DepositStatus.ACTIVE) {
      throw new Error('Deposit is not active');
    }

    let returnAmount: number;

    if (isEarly) {
      // При досрочном закрытии возвращаем только основную сумму
      // (без процентов или с пониженной ставкой)
      if (deposit.deposit_type === DepositType.FIXED) {
        // Фиксированный депозит: штраф - теряем все проценты
        returnAmount = deposit.principal_amount;
      } else {
        // Гибкий депозит: возвращаем текущий баланс
        returnAmount = deposit.current_balance;
      }
    } else {
      // По сроку: рассчитываем финальную сумму
      const calculation = deposit.deposit_type === DepositType.FIXED
        ? calculateCompoundDeposit(
            deposit.principal_amount,
            deposit.interest_rate,
            deposit.term_months
          )
        : calculateDeposit(
            deposit.principal_amount,
            deposit.interest_rate,
            deposit.term_months
          );

      returnAmount = calculation.final_amount;
    }

    // Возвращаем средства на счет
    if (deposit.account_id) {
      await accountService.updateAccountBalance(
        deposit.account_id,
        returnAmount,
        false // пополнение
      );
    }

    // Закрываем депозит
    await client.query(
      `UPDATE deposits 
       SET status = $1, current_balance = $2 
       WHERE id = $3`,
      [DepositStatus.CLOSED, returnAmount, depositId]
    );

    await client.query('COMMIT');

    logger.info('Deposit closed', { depositId, returnAmount, isEarly });

    return returnAmount;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error closing deposit:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Пролонгация депозита (автоматическое продление)
 */
export const renewDeposit = async (depositId: string): Promise<Deposit> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем депозит
    const depositResult = await client.query(
      'SELECT * FROM deposits WHERE id = $1 FOR UPDATE',
      [depositId]
    );

    if (depositResult.rows.length === 0) {
      throw new Error('Deposit not found');
    }

    const deposit = depositResult.rows[0];

    if (!deposit.is_auto_renewal) {
      throw new Error('Auto renewal is not enabled for this deposit');
    }

    // Рассчитываем финальную сумму
    const calculation = deposit.deposit_type === DepositType.FIXED
      ? calculateCompoundDeposit(
          deposit.principal_amount,
          deposit.interest_rate,
          deposit.term_months
        )
      : calculateDeposit(
          deposit.principal_amount,
          deposit.interest_rate,
          deposit.term_months
        );

    // Новые даты
    const newStartDate = new Date();
    const newMaturityDate = new Date(newStartDate);
    newMaturityDate.setMonth(newMaturityDate.getMonth() + deposit.term_months);

    // Обновляем депозит (новый срок на ту же сумму + проценты)
    const updateResult = await client.query(
      `UPDATE deposits 
       SET principal_amount = $1, current_balance = $2,
           start_date = $3, maturity_date = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [
        calculation.final_amount,
        calculation.final_amount,
        newStartDate,
        newMaturityDate,
        DepositStatus.ACTIVE,
        depositId,
      ]
    );

    await client.query('COMMIT');

    logger.info('Deposit renewed', { depositId, newAmount: calculation.final_amount });

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error renewing deposit:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Проверка созревших депозитов
 */
export const checkMaturedDeposits = async (): Promise<Deposit[]> => {
  try {
    const result = await query(
      `SELECT * FROM deposits 
       WHERE status = $1 
       AND maturity_date <= CURRENT_TIMESTAMP`,
      [DepositStatus.ACTIVE]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error checking matured deposits:', error);
    throw error;
  }
};

/**
 * Обработка созревших депозитов (автоматическая задача)
 */
export const processMaturedDeposits = async (): Promise<void> => {
  try {
    const maturedDeposits = await checkMaturedDeposits();

    for (const deposit of maturedDeposits) {
      try {
        if (deposit.is_auto_renewal) {
          // Пролонгируем
          await renewDeposit(deposit.id);
        } else {
          // Закрываем и возвращаем средства
          await closeDeposit(deposit.id, false);
        }
      } catch (error) {
        logger.error('Error processing matured deposit:', { depositId: deposit.id, error });
      }
    }

    logger.info('Matured deposits processed', { count: maturedDeposits.length });
  } catch (error) {
    logger.error('Error in processMaturedDeposits:', error);
    throw error;
  }
};

/**
 * Статистика по депозитам пользователя
 */
export const getUserDepositStats = async (
  userId: string
): Promise<{
  total_deposits: number;
  active_deposits: number;
  total_invested: number;
  current_balance_total: number;
  estimated_interest: number;
}> => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_deposits,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_deposits,
        COALESCE(SUM(principal_amount), 0) as total_invested,
        COALESCE(SUM(CASE WHEN status = 'active' THEN current_balance ELSE 0 END), 0) as current_balance_total
       FROM deposits 
       WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    const estimatedInterest = parseFloat(stats.current_balance_total) - parseFloat(stats.total_invested);

    return {
      total_deposits: parseInt(stats.total_deposits),
      active_deposits: parseInt(stats.active_deposits),
      total_invested: parseFloat(stats.total_invested),
      current_balance_total: parseFloat(stats.current_balance_total),
      estimated_interest: Math.max(0, estimatedInterest),
    };
  } catch (error) {
    logger.error('Error getting deposit stats:', error);
    throw error;
  }
};

/**
 * Включение/выключение автопролонгации
 */
export const toggleAutoRenewal = async (
  depositId: string,
  enabled: boolean
): Promise<void> => {
  try {
    await query(
      'UPDATE deposits SET is_auto_renewal = $1 WHERE id = $2',
      [enabled, depositId]
    );

    logger.info('Deposit auto renewal toggled', { depositId, enabled });
  } catch (error) {
    logger.error('Error toggling auto renewal:', error);
    throw error;
  }
};

export default {
  calculateDeposit,
  calculateCompoundDeposit,
  openDeposit,
  getUserDeposits,
  getDepositById,
  isDepositOwner,
  accrueInterest,
  closeDeposit,
  renewDeposit,
  checkMaturedDeposits,
  processMaturedDeposits,
  getUserDepositStats,
  toggleAutoRenewal,
};
