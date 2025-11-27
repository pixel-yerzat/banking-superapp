import { query, getClient } from '../config/database';
import {
  PaymentTemplate,
  CreatePaymentTemplateDto,
  UpdatePaymentTemplateDto,
  PaymentCategory,
} from '../types';
import logger from '../utils/logger';

/**
 * Создание шаблона платежа
 */
export const createTemplate = async (
  userId: string,
  templateData: CreatePaymentTemplateDto
): Promise<PaymentTemplate> => {
  try {
    const result = await query(
      `INSERT INTO payment_templates (
        user_id, template_name, recipient_name, recipient_account,
        recipient_phone, amount, currency, category, description,
        is_auto_payment, auto_payment_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        templateData.template_name,
        templateData.recipient_name || null,
        templateData.recipient_account || null,
        templateData.recipient_phone || null,
        templateData.amount || null,
        templateData.currency,
        templateData.category,
        templateData.description || null,
        templateData.is_auto_payment || false,
        templateData.auto_payment_day || null,
      ]
    );

    logger.info('Payment template created', {
      userId,
      templateId: result.rows[0].id,
      isAutoPayment: templateData.is_auto_payment,
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Error creating payment template:', error);
    throw error;
  }
};

/**
 * Получение всех шаблонов пользователя
 */
export const getUserTemplates = async (userId: string): Promise<PaymentTemplate[]> => {
  try {
    const result = await query(
      `SELECT * FROM payment_templates 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user templates:', error);
    throw error;
  }
};

/**
 * Получение шаблонов по категории
 */
export const getTemplatesByCategory = async (
  userId: string,
  category: PaymentCategory
): Promise<PaymentTemplate[]> => {
  try {
    const result = await query(
      `SELECT * FROM payment_templates 
       WHERE user_id = $1 AND category = $2 
       ORDER BY created_at DESC`,
      [userId, category]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting templates by category:', error);
    throw error;
  }
};

/**
 * Получение автоплатежей пользователя
 */
export const getAutoPayments = async (userId: string): Promise<PaymentTemplate[]> => {
  try {
    const result = await query(
      `SELECT * FROM payment_templates 
       WHERE user_id = $1 AND is_auto_payment = true 
       ORDER BY auto_payment_day ASC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting auto payments:', error);
    throw error;
  }
};

/**
 * Получение шаблона по ID
 */
export const getTemplateById = async (
  templateId: string
): Promise<PaymentTemplate | null> => {
  try {
    const result = await query(
      'SELECT * FROM payment_templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting template by ID:', error);
    throw error;
  }
};

/**
 * Проверка принадлежности шаблона пользователю
 */
export const isTemplateOwner = async (
  templateId: string,
  userId: string
): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT id FROM payment_templates WHERE id = $1 AND user_id = $2',
      [templateId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking template ownership:', error);
    throw error;
  }
};

/**
 * Обновление шаблона
 */
export const updateTemplate = async (
  templateId: string,
  updates: UpdatePaymentTemplateDto
): Promise<PaymentTemplate> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Динамически строим SQL запрос
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(templateId);

    const result = await query(
      `UPDATE payment_templates 
       SET ${fields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Template not found');
    }

    logger.info('Payment template updated', { templateId });

    return result.rows[0];
  } catch (error) {
    logger.error('Error updating payment template:', error);
    throw error;
  }
};

/**
 * Удаление шаблона
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM payment_templates WHERE id = $1',
      [templateId]
    );

    if (result.rowCount === 0) {
      throw new Error('Template not found');
    }

    logger.info('Payment template deleted', { templateId });
  } catch (error) {
    logger.error('Error deleting payment template:', error);
    throw error;
  }
};

/**
 * Включение/выключение автоплатежа
 */
export const toggleAutoPayment = async (
  templateId: string,
  enabled: boolean,
  autoPaymentDay?: number
): Promise<void> => {
  try {
    await query(
      `UPDATE payment_templates 
       SET is_auto_payment = $1, auto_payment_day = $2 
       WHERE id = $3`,
      [enabled, autoPaymentDay || null, templateId]
    );

    logger.info('Auto payment toggled', { templateId, enabled });
  } catch (error) {
    logger.error('Error toggling auto payment:', error);
    throw error;
  }
};

/**
 * Получение автоплатежей, которые нужно выполнить сегодня
 */
export const getAutoPaymentsDueToday = async (): Promise<PaymentTemplate[]> => {
  try {
    const today = new Date().getDate();

    const result = await query(
      `SELECT * FROM payment_templates 
       WHERE is_auto_payment = true 
       AND auto_payment_day = $1`,
      [today]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting auto payments due today:', error);
    throw error;
  }
};

/**
 * Получение популярных шаблонов (по частоте использования)
 */
export const getPopularTemplates = async (
  userId: string,
  limit: number = 5
): Promise<PaymentTemplate[]> => {
  try {
    // Это упрощенная версия - в реальности нужно учитывать частоту использования
    // из истории транзакций
    const result = await query(
      `SELECT * FROM payment_templates 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting popular templates:', error);
    throw error;
  }
};

/**
 * Поиск шаблонов по имени
 */
export const searchTemplates = async (
  userId: string,
  searchQuery: string
): Promise<PaymentTemplate[]> => {
  try {
    const result = await query(
      `SELECT * FROM payment_templates 
       WHERE user_id = $1 
       AND (
         template_name ILIKE $2 
         OR recipient_name ILIKE $2 
         OR description ILIKE $2
       )
       ORDER BY created_at DESC`,
      [userId, `%${searchQuery}%`]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error searching templates:', error);
    throw error;
  }
};

/**
 * Получение статистики по шаблонам
 */
export const getTemplateStats = async (
  userId: string
): Promise<{
  total: number;
  by_category: Record<string, number>;
  auto_payments_count: number;
}> => {
  try {
    // Общее количество
    const totalResult = await query(
      'SELECT COUNT(*) as count FROM payment_templates WHERE user_id = $1',
      [userId]
    );

    // По категориям
    const categoryResult = await query(
      `SELECT category, COUNT(*) as count 
       FROM payment_templates 
       WHERE user_id = $1 
       GROUP BY category`,
      [userId]
    );

    // Автоплатежи
    const autoPaymentsResult = await query(
      'SELECT COUNT(*) as count FROM payment_templates WHERE user_id = $1 AND is_auto_payment = true',
      [userId]
    );

    const byCategory: Record<string, number> = {};
    categoryResult.rows.forEach(row => {
      byCategory[row.category] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult.rows[0].count),
      by_category: byCategory,
      auto_payments_count: parseInt(autoPaymentsResult.rows[0].count),
    };
  } catch (error) {
    logger.error('Error getting template stats:', error);
    throw error;
  }
};

export default {
  createTemplate,
  getUserTemplates,
  getTemplatesByCategory,
  getAutoPayments,
  getTemplateById,
  isTemplateOwner,
  updateTemplate,
  deleteTemplate,
  toggleAutoPayment,
  getAutoPaymentsDueToday,
  getPopularTemplates,
  searchTemplates,
  getTemplateStats,
};
