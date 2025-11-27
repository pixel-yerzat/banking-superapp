import { Request, Response } from 'express';
import * as providerService from '../services/provider.service';
import * as transactionService from '../services/transaction.service';
import * as accountService from '../services/account.service';
import { PaymentCategory, TransactionType } from '../types';
import logger from '../utils/logger';

/**
 * Получение всех провайдеров
 * GET /api/v1/providers
 */
export const getAllProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    let providers;
    if (category) {
      providers = await providerService.getProvidersByCategory(category as PaymentCategory);
    } else {
      providers = await providerService.getAllProviders();
    }

    res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    logger.error('Get all providers controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get providers',
    });
  }
};

/**
 * Получение провайдера по ID
 * GET /api/v1/providers/:providerId
 */
export const getProviderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    const provider = await providerService.getProviderById(providerId);

    if (!provider) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Provider not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    logger.error('Get provider by ID controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get provider',
    });
  }
};

/**
 * Поиск провайдеров
 * GET /api/v1/providers/search
 */
export const searchProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Search query is required',
      });
      return;
    }

    const providers = await providerService.searchProviders(q);

    res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    logger.error('Search providers controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to search providers',
    });
  }
};

/**
 * Получение популярных провайдеров
 * GET /api/v1/providers/popular
 */
export const getPopularProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 10;

    const providers = await providerService.getPopularProviders(limitNum);

    res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    logger.error('Get popular providers controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get popular providers',
    });
  }
};

/**
 * Оплата через провайдера
 * POST /api/v1/providers/:providerId/pay
 */
export const payToProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { providerId } = req.params;
    const { account_id, amount, payment_data } = req.body;

    // Получаем провайдера
    const provider = await providerService.getProviderById(providerId);

    if (!provider) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Provider not found',
      });
      return;
    }

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

    // Валидация данных платежа
    const validation = providerService.validatePaymentData(provider, payment_data || {});
    
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid payment data',
        errors: validation.errors,
      });
      return;
    }

    // Валидация суммы
    const amountValidation = providerService.validateAmount(provider, amount);
    
    if (!amountValidation.valid) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: amountValidation.error,
      });
      return;
    }

    // Расчет комиссии
    const commission = providerService.calculateCommission(provider, amount);

    // Получаем счет для валюты
    const account = await accountService.getAccountById(account_id);
    
    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Account not found',
      });
      return;
    }

    // Создаем транзакцию (для провайдера to_account_id будет null)
    const transaction = await transactionService.createTransaction({
      from_account_id: account_id,
      to_account_id: undefined,
      transaction_type: TransactionType.PAYMENT,
      amount,
      currency: account.currency,
      description: `Payment to ${provider.name} (Commission: ${commission} KZT)`,
      metadata: {
        provider_id: providerId,
        provider_name: provider.name,
        payment_data,
        commission,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        transaction,
        provider: {
          id: provider.id,
          name: provider.name,
        },
        commission,
        total_amount: amount + commission,
      },
    });
  } catch (error) {
    logger.error('Pay to provider controller error:', error);
    
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
      message: 'Failed to complete payment',
    });
  }
};

export default {
  getAllProviders,
  getProviderById,
  searchProviders,
  getPopularProviders,
  payToProvider,
};
