import { Request, Response } from 'express';
import * as loanService from '../services/loan.service';
import * as accountService from '../services/account.service';
import { LoanType } from '../types';
import logger from '../utils/logger';

/**
 * Калькулятор кредита
 * POST /api/v1/loans/calculate
 */
export const calculateLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { principal_amount, interest_rate, term_months } = req.body;

    if (!principal_amount || !interest_rate || !term_months) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'principal_amount, interest_rate, and term_months are required',
      });
      return;
    }

    const calculation = loanService.calculateLoan(
      principal_amount,
      interest_rate,
      term_months
    );

    res.status(200).json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    logger.error('Calculate loan controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to calculate loan',
    });
  }
};

/**
 * Создание заявки на кредит
 * POST /api/v1/loans
 */
export const createLoanApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { loan_type, principal_amount, interest_rate, term_months } = req.body;

    const loan = await loanService.createLoanApplication(req.user.userId, {
      loan_type,
      principal_amount,
      interest_rate,
      term_months,
    });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: loan,
    });
  } catch (error) {
    logger.error('Create loan application controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Application Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create loan application',
    });
  }
};

/**
 * Получение всех кредитов пользователя
 * GET /api/v1/loans
 */
export const getUserLoans = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const loans = await loanService.getUserLoans(req.user.userId);

    res.status(200).json({
      success: true,
      data: loans,
    });
  } catch (error) {
    logger.error('Get user loans controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get loans',
    });
  }
};

/**
 * Получение кредита по ID
 * GET /api/v1/loans/:loanId
 */
export const getLoanById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { loanId } = req.params;

    // Проверяем принадлежность
    const isOwner = await loanService.isLoanOwner(loanId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this loan',
      });
      return;
    }

    const loan = await loanService.getLoanById(loanId);

    if (!loan) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Loan not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    logger.error('Get loan by ID controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get loan',
    });
  }
};

/**
 * Получение графика платежей
 * GET /api/v1/loans/:loanId/schedule
 */
export const getLoanSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { loanId } = req.params;

    // Проверяем принадлежность
    const isOwner = await loanService.isLoanOwner(loanId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this loan',
      });
      return;
    }

    const schedule = await loanService.getLoanPaymentSchedule(loanId);

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    logger.error('Get loan schedule controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get payment schedule',
    });
  }
};

/**
 * Платеж по кредиту
 * POST /api/v1/loans/:loanId/pay
 */
export const makeLoanPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { loanId } = req.params;
    const { account_id, amount } = req.body;

    // Проверяем принадлежность кредита
    const isLoanOwner = await loanService.isLoanOwner(loanId, req.user.userId);
    
    if (!isLoanOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this loan',
      });
      return;
    }

    // Проверяем принадлежность счета
    const isAccountOwner = await accountService.isAccountOwner(account_id, req.user.userId);
    
    if (!isAccountOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this account',
      });
      return;
    }

    await loanService.makeLoanPayment(loanId, account_id, amount);

    res.status(200).json({
      success: true,
      message: 'Loan payment successful',
    });
  } catch (error) {
    logger.error('Make loan payment controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Payment Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to make loan payment',
    });
  }
};

/**
 * Досрочное погашение кредита
 * POST /api/v1/loans/:loanId/early-repay
 */
export const earlyRepayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { loanId } = req.params;
    const { account_id } = req.body;

    // Проверяем принадлежность кредита
    const isLoanOwner = await loanService.isLoanOwner(loanId, req.user.userId);
    
    if (!isLoanOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this loan',
      });
      return;
    }

    // Проверяем принадлежность счета
    const isAccountOwner = await accountService.isAccountOwner(account_id, req.user.userId);
    
    if (!isAccountOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this account',
      });
      return;
    }

    await loanService.earlyRepayment(loanId, account_id);

    res.status(200).json({
      success: true,
      message: 'Loan fully repaid successfully',
    });
  } catch (error) {
    logger.error('Early repayment controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Repayment Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to complete early repayment',
    });
  }
};

/**
 * Статистика по кредитам
 * GET /api/v1/loans/stats
 */
export const getLoanStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const stats = await loanService.getUserLoanStats(req.user.userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get loan stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get loan statistics',
    });
  }
};

/**
 * Одобрение кредита (только для админа, но для демо доступно всем)
 * POST /api/v1/loans/:loanId/approve
 */
export const approveLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { loanId } = req.params;
    const { account_id } = req.body;

    // Проверяем принадлежность кредита (для демо)
    const isLoanOwner = await loanService.isLoanOwner(loanId, req.user.userId);
    
    if (!isLoanOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this loan',
      });
      return;
    }

    const loan = await loanService.approveLoan(loanId, account_id);

    res.status(200).json({
      success: true,
      message: 'Loan approved and funds disbursed',
      data: loan,
    });
  } catch (error) {
    logger.error('Approve loan controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Approval Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to approve loan',
    });
  }
};

export default {
  calculateLoan,
  createLoanApplication,
  getUserLoans,
  getLoanById,
  getLoanSchedule,
  makeLoanPayment,
  earlyRepayment,
  getLoanStats,
  approveLoan,
};
