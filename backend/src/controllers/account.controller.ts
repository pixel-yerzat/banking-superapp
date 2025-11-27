import { Request, Response } from 'express';
import * as accountService from '../services/account.service';
import { CreateAccountDto } from '../types';
import logger from '../utils/logger';

/**
 * Создание нового счета
 * POST /api/v1/accounts
 */
export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const accountData: CreateAccountDto = req.body;

    const account = await accountService.createAccount(req.user.userId, accountData);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account,
    });
  } catch (error) {
    logger.error('Create account controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Account Creation Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create account',
    });
  }
};

/**
 * Получение всех счетов пользователя
 * GET /api/v1/accounts
 */
export const getUserAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const accounts = await accountService.getUserAccounts(req.user.userId);

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    logger.error('Get user accounts controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get accounts',
    });
  }
};

/**
 * Получение счета по ID
 * GET /api/v1/accounts/:accountId
 */
export const getAccountById = async (req: Request, res: Response): Promise<void> => {
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

    const account = await accountService.getAccountById(accountId);

    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Account not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    logger.error('Get account by ID controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get account',
    });
  }
};

/**
 * Получение баланса счета
 * GET /api/v1/accounts/:accountId/balance
 */
export const getAccountBalance = async (req: Request, res: Response): Promise<void> => {
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

    const balance = await accountService.getAccountBalance(accountId);

    res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Get account balance controller error:', error);
    
    if (error instanceof Error && error.message === 'Account not found') {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Account not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get account balance',
    });
  }
};

/**
 * Получение общего баланса по всем счетам
 * GET /api/v1/accounts/total-balance
 */
export const getTotalBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const totalBalance = await accountService.getTotalBalance(req.user.userId);

    res.status(200).json({
      success: true,
      data: totalBalance,
    });
  } catch (error) {
    logger.error('Get total balance controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get total balance',
    });
  }
};

/**
 * Блокировка счета
 * POST /api/v1/accounts/:accountId/block
 */
export const blockAccount = async (req: Request, res: Response): Promise<void> => {
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

    await accountService.blockAccount(accountId);

    res.status(200).json({
      success: true,
      message: 'Account blocked successfully',
    });
  } catch (error) {
    logger.error('Block account controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to block account',
    });
  }
};

/**
 * Разблокировка счета
 * POST /api/v1/accounts/:accountId/unblock
 */
export const unblockAccount = async (req: Request, res: Response): Promise<void> => {
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

    await accountService.unblockAccount(accountId);

    res.status(200).json({
      success: true,
      message: 'Account unblocked successfully',
    });
  } catch (error) {
    logger.error('Unblock account controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to unblock account',
    });
  }
};

/**
 * Закрытие счета
 * POST /api/v1/accounts/:accountId/close
 */
export const closeAccount = async (req: Request, res: Response): Promise<void> => {
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

    await accountService.closeAccount(accountId);

    res.status(200).json({
      success: true,
      message: 'Account closed successfully',
    });
  } catch (error) {
    logger.error('Close account controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Account Closure Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to close account',
    });
  }
};

export default {
  createAccount,
  getUserAccounts,
  getAccountById,
  getAccountBalance,
  getTotalBalance,
  blockAccount,
  unblockAccount,
  closeAccount,
};
