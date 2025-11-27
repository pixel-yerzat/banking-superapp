import { Request, Response } from 'express';
import * as transactionService from '../services/transaction.service';
import * as accountService from '../services/account.service';
import { CreateTransactionDto, PaginationQuery } from '../types';
import logger from '../utils/logger';

/**
 * Создание транзакции
 * POST /api/v1/transactions
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const transactionData: CreateTransactionDto = req.body;

    // Проверяем принадлежность счета отправителя
    if (transactionData.from_account_id) {
      const isOwner = await accountService.isAccountOwner(
        transactionData.from_account_id,
        req.user.userId
      );
      
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to the source account',
        });
        return;
      }
    }

    const transaction = await transactionService.createTransaction(transactionData);

    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      data: transaction,
    });
  } catch (error) {
    logger.error('Create transaction controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Transaction Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create transaction',
    });
  }
};

/**
 * Перевод по номеру телефона
 * POST /api/v1/transactions/transfer/phone
 */
export const transferToPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { from_account_id, to_phone, amount, description } = req.body;

    // Проверяем принадлежность счета
    const isOwner = await accountService.isAccountOwner(from_account_id, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this account',
      });
      return;
    }

    const transaction = await transactionService.transferToPhone(
      req.user.userId,
      from_account_id,
      to_phone,
      amount,
      description
    );

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: transaction,
    });
  } catch (error) {
    logger.error('Transfer to phone controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Transfer Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to complete transfer',
    });
  }
};

/**
 * Перевод по номеру счета
 * POST /api/v1/transactions/transfer/account
 */
export const transferToAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { from_account_id, to_account_number, amount, description } = req.body;

    // Проверяем принадлежность счета
    const isOwner = await accountService.isAccountOwner(from_account_id, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this account',
      });
      return;
    }

    const transaction = await transactionService.transferToAccount(
      from_account_id,
      to_account_number,
      amount,
      description
    );

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: transaction,
    });
  } catch (error) {
    logger.error('Transfer to account controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Transfer Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to complete transfer',
    });
  }
};

/**
 * Получение транзакции по ID
 * GET /api/v1/transactions/:transactionId
 */
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { transactionId } = req.params;

    const transaction = await transactionService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Transaction not found',
      });
      return;
    }

    // Проверяем принадлежность транзакции пользователю
    let hasAccess = false;
    
    if (transaction.from_account_id) {
      hasAccess = await accountService.isAccountOwner(
        transaction.from_account_id,
        req.user.userId
      );
    }
    
    if (!hasAccess && transaction.to_account_id) {
      hasAccess = await accountService.isAccountOwner(
        transaction.to_account_id,
        req.user.userId
      );
    }

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this transaction',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    logger.error('Get transaction by ID controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get transaction',
    });
  }
};

/**
 * Получение транзакций счета
 * GET /api/v1/accounts/:accountId/transactions
 */
export const getAccountTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { accountId } = req.params;
    const { page, limit } = req.query;

    // Проверяем принадлежность счета
    const isOwner = await accountService.isAccountOwner(accountId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this account',
      });
      return;
    }

    const pagination: PaginationQuery = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    };

    const transactions = await transactionService.getAccountTransactions(
      accountId,
      pagination
    );

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    logger.error('Get account transactions controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get transactions',
    });
  }
};

/**
 * Получение всех транзакций пользователя
 * GET /api/v1/transactions
 */
export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { page, limit } = req.query;

    const pagination: PaginationQuery = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    };

    const transactions = await transactionService.getUserTransactions(
      req.user.userId,
      pagination
    );

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    logger.error('Get user transactions controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get transactions',
    });
  }
};

/**
 * Получение статистики транзакций
 * GET /api/v1/transactions/stats
 */
export const getUserTransactionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { start_date, end_date } = req.query;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (start_date) {
      startDate = new Date(start_date as string);
    }

    if (end_date) {
      endDate = new Date(end_date as string);
    }

    const stats = await transactionService.getUserTransactionStats(
      req.user.userId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get transaction stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get transaction statistics',
    });
  }
};

/**
 * Отмена транзакции
 * POST /api/v1/transactions/:transactionId/cancel
 */
export const cancelTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { transactionId } = req.params;

    const transaction = await transactionService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Transaction not found',
      });
      return;
    }

    // Проверяем принадлежность транзакции
    if (transaction.from_account_id) {
      const isOwner = await accountService.isAccountOwner(
        transaction.from_account_id,
        req.user.userId
      );
      
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this transaction',
        });
        return;
      }
    }

    await transactionService.cancelTransaction(transactionId);

    res.status(200).json({
      success: true,
      message: 'Transaction cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel transaction controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Cancellation Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to cancel transaction',
    });
  }
};

export default {
  createTransaction,
  transferToPhone,
  transferToAccount,
  getTransactionById,
  getAccountTransactions,
  getUserTransactions,
  getUserTransactionStats,
  cancelTransaction,
};
