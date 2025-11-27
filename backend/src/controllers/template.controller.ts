import { Request, Response } from 'express';
import * as templateService from '../services/template.service';
import * as transactionService from '../services/transaction.service';
import * as accountService from '../services/account.service';
import { CreatePaymentTemplateDto, PaymentCategory } from '../types';
import logger from '../utils/logger';

/**
 * Создание шаблона платежа
 * POST /api/v1/templates
 */
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const templateData: CreatePaymentTemplateDto = req.body;

    const template = await templateService.createTemplate(req.user.userId, templateData);

    res.status(201).json({
      success: true,
      message: 'Payment template created successfully',
      data: template,
    });
  } catch (error) {
    logger.error('Create template controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Template Creation Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create template',
    });
  }
};

/**
 * Получение всех шаблонов пользователя
 * GET /api/v1/templates
 */
export const getUserTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { category } = req.query;

    let templates;
    if (category) {
      templates = await templateService.getTemplatesByCategory(
        req.user.userId,
        category as PaymentCategory
      );
    } else {
      templates = await templateService.getUserTemplates(req.user.userId);
    }

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Get user templates controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get templates',
    });
  }
};

/**
 * Получение автоплатежей
 * GET /api/v1/templates/auto-payments
 */
export const getAutoPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const autoPayments = await templateService.getAutoPayments(req.user.userId);

    res.status(200).json({
      success: true,
      data: autoPayments,
    });
  } catch (error) {
    logger.error('Get auto payments controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get auto payments',
    });
  }
};

/**
 * Получение шаблона по ID
 * GET /api/v1/templates/:templateId
 */
export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { templateId } = req.params;

    // Проверяем принадлежность
    const isOwner = await templateService.isTemplateOwner(templateId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this template',
      });
      return;
    }

    const template = await templateService.getTemplateById(templateId);

    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Template not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Get template by ID controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get template',
    });
  }
};

/**
 * Обновление шаблона
 * PATCH /api/v1/templates/:templateId
 */
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { templateId } = req.params;

    // Проверяем принадлежность
    const isOwner = await templateService.isTemplateOwner(templateId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this template',
      });
      return;
    }

    const template = await templateService.updateTemplate(templateId, req.body);

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  } catch (error) {
    logger.error('Update template controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Update Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update template',
    });
  }
};

/**
 * Удаление шаблона
 * DELETE /api/v1/templates/:templateId
 */
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { templateId } = req.params;

    // Проверяем принадлежность
    const isOwner = await templateService.isTemplateOwner(templateId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this template',
      });
      return;
    }

    await templateService.deleteTemplate(templateId);

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    logger.error('Delete template controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete template',
    });
  }
};

/**
 * Оплата по шаблону
 * POST /api/v1/templates/:templateId/pay
 */
export const payByTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { templateId } = req.params;
    const { account_id, amount, description } = req.body;

    // Проверяем принадлежность шаблона
    const isOwner = await templateService.isTemplateOwner(templateId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this template',
      });
      return;
    }

    // Получаем шаблон
    const template = await templateService.getTemplateById(templateId);
    
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Template not found',
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

    // Используем сумму из шаблона или из запроса
    const paymentAmount = amount || template.amount;
    
    if (!paymentAmount) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Payment amount is required',
      });
      return;
    }

    // Создаем транзакцию
    let transaction;
    
    if (template.recipient_phone) {
      // Перевод по телефону
      transaction = await transactionService.transferToPhone(
        req.user.userId,
        account_id,
        template.recipient_phone,
        paymentAmount,
        description || template.description
      );
    } else if (template.recipient_account) {
      // Перевод по номеру счета
      transaction = await transactionService.transferToAccount(
        account_id,
        template.recipient_account,
        paymentAmount,
        description || template.description
      );
    } else {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Template must have recipient_phone or recipient_account',
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Payment completed successfully',
      data: transaction,
    });
  } catch (error) {
    logger.error('Pay by template controller error:', error);
    
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

/**
 * Включение/выключение автоплатежа
 * PATCH /api/v1/templates/:templateId/auto-payment
 */
export const toggleAutoPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { templateId } = req.params;
    const { enabled, auto_payment_day } = req.body;

    // Проверяем принадлежность
    const isOwner = await templateService.isTemplateOwner(templateId, req.user.userId);
    
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this template',
      });
      return;
    }

    await templateService.toggleAutoPayment(templateId, enabled, auto_payment_day);

    res.status(200).json({
      success: true,
      message: `Auto payment ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error('Toggle auto payment controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to toggle auto payment',
    });
  }
};

/**
 * Поиск шаблонов
 * GET /api/v1/templates/search
 */
export const searchTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Search query is required',
      });
      return;
    }

    const templates = await templateService.searchTemplates(req.user.userId, q);

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Search templates controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to search templates',
    });
  }
};

/**
 * Получение статистики по шаблонам
 * GET /api/v1/templates/stats
 */
export const getTemplateStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const stats = await templateService.getTemplateStats(req.user.userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get template stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get template statistics',
    });
  }
};

export default {
  createTemplate,
  getUserTemplates,
  getAutoPayments,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  payByTemplate,
  toggleAutoPayment,
  searchTemplates,
  getTemplateStats,
};
