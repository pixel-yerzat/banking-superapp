import { Request, Response } from 'express';
import * as depositService from '../services/deposit.service';
import * as accountService from '../services/account.service';
import { DepositType } from '../types';
import logger from '../utils/logger';

/**
 * Калькулятор депозита
 * POST /api/v1/deposits/calculate
 */
export const calculateDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { principal_amount, interest_rate, term_months, deposit_type } = req.body;

    if (!principal_amount || !interest_rate || !term_months) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'principal_amount, interest_rate, and term_months are required',
      });
      return;
    }

    const calculation = deposit_type === 'fixed'
      ? depositService.calculateCompoundDeposit(principal_amount, interest_rate, term_months)
      : depositService.calculateDeposit(principal_amount, interest_rate, term_months);

    res.status(200).json({
      success: true,
      data: {
        ...calculation,
        deposit_type: deposit_type || 'flexible',
      },
    });
  } catch (error) {
    logger.error('Calculate deposit controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to calculate deposit',
    });
  }
};

/**
 * Открытие депозита
 * POST /api/v1/deposits
 */
export const openDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { account_id, deposit_type, principal_amount, interest_rate, term_months, is_auto_renewal } = req.body;

    // Проверяем принадлежность счета
    const isOwner = await accountService.isAccountOwner(account_id, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this account',
      });
      return;
    }

    const deposit = await depositService.openDeposit(req.user.userId, account_id, {
      deposit_type,
      principal_amount,
      interest_rate,
      term_months,
      is_auto_renewal,
    });

    res.status(201).json({
      success: true,
      message: 'Deposit opened successfully',
      data: deposit,
    });
  } catch (error) {
    logger.error('Open deposit controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Deposit Creation Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to open deposit',
    });
  }
};

/**
 * Получение всех депозитов пользователя
 * GET /api/v1/deposits
 */
export const getUserDeposits = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const deposits = await depositService.getUserDeposits(req.user.userId);

    res.status(200).json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    logger.error('Get user deposits controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get deposits',
    });
  }
};

/**
 * Получение депозита по ID
 * GET /api/v1/deposits/:depositId
 */
export const getDepositById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { depositId } = req.params;

    // Проверяем принадлежность
    const isOwner = await depositService.isDepositOwner(depositId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this deposit',
      });
      return;
    }

    const deposit = await depositService.getDepositById(depositId);

    if (!deposit) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Deposit not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: deposit,
    });
  } catch (error) {
    logger.error('Get deposit by ID controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get deposit',
    });
  }
};

/**
 * Закрытие депозита
 * POST /api/v1/deposits/:depositId/close
 */
export const closeDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { depositId } = req.params;
    const { is_early } = req.body;

    // Проверяем принадлежность
    const isOwner = await depositService.isDepositOwner(depositId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this deposit',
      });
      return;
    }

    const returnAmount = await depositService.closeDeposit(depositId, is_early || false);

    res.status(200).json({
      success: true,
      message: is_early 
        ? 'Deposit closed early. Funds returned to account.'
        : 'Deposit matured and closed. Funds returned to account.',
      data: {
        return_amount: returnAmount,
      },
    });
  } catch (error) {
    logger.error('Close deposit controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Closure Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to close deposit',
    });
  }
};

/**
 * Включение/выключение автопролонгации
 * PATCH /api/v1/deposits/:depositId/auto-renewal
 */
export const toggleAutoRenewal = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { depositId } = req.params;
    const { enabled } = req.body;

    // Проверяем принадлежность
    const isOwner = await depositService.isDepositOwner(depositId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this deposit',
      });
      return;
    }

    await depositService.toggleAutoRenewal(depositId, enabled);

    res.status(200).json({
      success: true,
      message: `Auto renewal ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error('Toggle auto renewal controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to toggle auto renewal',
    });
  }
};

/**
 * Статистика по депозитам
 * GET /api/v1/deposits/stats
 */
export const getDepositStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const stats = await depositService.getUserDepositStats(req.user.userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get deposit stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get deposit statistics',
    });
  }
};

export default {
  calculateDeposit,
  openDeposit,
  getUserDeposits,
  getDepositById,
  closeDeposit,
  toggleAutoRenewal,
  getDepositStats,
};
