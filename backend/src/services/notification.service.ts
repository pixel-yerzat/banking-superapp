import { query, getClient } from '../config/database';
import { Notification, NotificationType, NotificationPriority } from '../types';
import logger from '../utils/logger';
import * as websocketService from './websocket.service';

interface CreateNotificationDto {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

interface NotificationSettings {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  transaction_notifications: boolean;
  security_notifications: boolean;
  marketing_notifications: boolean;
  system_notifications: boolean;
}

/**
 * Создание уведомления
 */
export const createNotification = async (
  notificationData: CreateNotificationDto
): Promise<Notification> => {
  try {
    // Проверяем настройки пользователя
    const settings = await getNotificationSettings(notificationData.user_id);
    
    // Проверяем, включены ли уведомления этого типа
    if (!shouldSendNotification(settings, notificationData.notification_type)) {
      logger.info('Notification blocked by user settings', {
        userId: notificationData.user_id,
        type: notificationData.notification_type,
      });
      throw new Error('Notification type is disabled by user');
    }

    const result = await query(
      `INSERT INTO notifications (
        user_id, notification_type, title, message, priority, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        notificationData.user_id,
        notificationData.notification_type,
        notificationData.title,
        notificationData.message,
        notificationData.priority || NotificationPriority.NORMAL,
        JSON.stringify(notificationData.metadata || {}),
      ]
    );

    logger.info('Notification created', {
      userId: notificationData.user_id,
      type: notificationData.notification_type,
      notificationId: result.rows[0].id,
    });

    // Отправляем уведомление по каналам
    await sendNotification(result.rows[0], settings);

    return result.rows[0];
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Проверка, нужно ли отправлять уведомление
 */
const shouldSendNotification = (
  settings: NotificationSettings,
  type: NotificationType
): boolean => {
  switch (type) {
    case NotificationType.TRANSACTION:
      return settings.transaction_notifications;
    case NotificationType.SECURITY:
      return settings.security_notifications;
    case NotificationType.MARKETING:
      return settings.marketing_notifications;
    case NotificationType.SYSTEM:
      return settings.system_notifications;
    case NotificationType.LOAN_PAYMENT:
      return settings.transaction_notifications;
    case NotificationType.CARD:
      return settings.security_notifications;
    default:
      return true;
  }
};

/**
 * Отправка уведомления по каналам
 */
const sendNotification = async (
  notification: Notification,
  settings: NotificationSettings
): Promise<void> => {
  try {
    // Push-уведомление
    if (settings.push_enabled) {
      await sendPushNotification(notification);
    }

    // Email
    if (settings.email_enabled) {
      await sendEmailNotification(notification);
    }

    // SMS (только для важных уведомлений)
    if (settings.sms_enabled && notification.priority === NotificationPriority.URGENT) {
      await sendSMSNotification(notification);
    }

    // Real-time WebSocket уведомление
    try {
      websocketService.sendNotificationToUser(notification.user_id, notification);
    } catch (error) {
      logger.error('Error sending WebSocket notification:', error);
    }
  } catch (error) {
    logger.error('Error sending notification:', error);
  }
};

/**
 * Отправка push-уведомления (заглушка)
 */
const sendPushNotification = async (notification: Notification): Promise<void> => {
  // В реальности: Firebase Cloud Messaging, OneSignal и т.д.
  logger.info('Push notification sent', {
    notificationId: notification.id,
    title: notification.title,
  });
};

/**
 * Отправка email (заглушка)
 */
const sendEmailNotification = async (notification: Notification): Promise<void> => {
  // В реальности: SendGrid, AWS SES, Mailgun и т.д.
  logger.info('Email notification sent', {
    notificationId: notification.id,
    title: notification.title,
  });
};

/**
 * Отправка SMS (заглушка)
 */
const sendSMSNotification = async (notification: Notification): Promise<void> => {
  // В реальности: Twilio, AWS SNS и т.д.
  logger.info('SMS notification sent', {
    notificationId: notification.id,
    title: notification.title,
  });
};

/**
 * Получение всех уведомлений пользователя
 */
export const getUserNotifications = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ notifications: Notification[]; total: number }> => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [userId]
    );

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Получение непрочитанных уведомлений
 */
export const getUnreadNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND is_read = false 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting unread notifications:', error);
    throw error;
  }
};

/**
 * Отметка уведомления как прочитанного
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    await query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [notificationId]
    );

    logger.info('Notification marked as read', { notificationId });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Отметка всех уведомлений как прочитанных
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    await query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    logger.info('All notifications marked as read', { userId });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Удаление уведомления
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await query('DELETE FROM notifications WHERE id = $1', [notificationId]);

    logger.info('Notification deleted', { notificationId });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Получение настроек уведомлений
 */
export const getNotificationSettings = async (
  userId: string
): Promise<NotificationSettings> => {
  try {
    const result = await query(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Создаем настройки по умолчанию
      return await createDefaultSettings(userId);
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting notification settings:', error);
    throw error;
  }
};

/**
 * Создание настроек по умолчанию
 */
const createDefaultSettings = async (userId: string): Promise<NotificationSettings> => {
  try {
    const result = await query(
      `INSERT INTO notification_settings (
        user_id, push_enabled, email_enabled, sms_enabled,
        transaction_notifications, security_notifications,
        marketing_notifications, system_notifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [userId, true, true, false, true, true, false, true]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error creating default settings:', error);
    throw error;
  }
};

/**
 * Обновление настроек уведомлений
 */
export const updateNotificationSettings = async (
  userId: string,
  updates: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'user_id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);

    const result = await query(
      `UPDATE notification_settings 
       SET ${fields.join(', ')} 
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      // Создаем настройки, если их нет
      return await createDefaultSettings(userId);
    }

    logger.info('Notification settings updated', { userId });

    return result.rows[0];
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    throw error;
  }
};

/**
 * Получение статистики уведомлений
 */
export const getNotificationStats = async (
  userId: string
): Promise<{
  total: number;
  unread: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}> => {
  try {
    const totalResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
      [userId]
    );

    const unreadResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    const byTypeResult = await query(
      `SELECT notification_type, COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 
       GROUP BY notification_type`,
      [userId]
    );

    const byPriorityResult = await query(
      `SELECT priority, COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 
       GROUP BY priority`,
      [userId]
    );

    const byType: Record<string, number> = {};
    byTypeResult.rows.forEach(row => {
      byType[row.notification_type] = parseInt(row.count);
    });

    const byPriority: Record<string, number> = {};
    byPriorityResult.rows.forEach(row => {
      byPriority[row.priority] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult.rows[0].count),
      unread: parseInt(unreadResult.rows[0].count),
      by_type: byType,
      by_priority: byPriority,
    };
  } catch (error) {
    logger.error('Error getting notification stats:', error);
    throw error;
  }
};

/**
 * Системные уведомления (хелперы)
 */

export const sendTransactionNotification = async (
  userId: string,
  amount: number,
  type: 'sent' | 'received',
  recipient?: string
): Promise<void> => {
  const title = type === 'sent' ? 'Списание средств' : 'Поступление средств';
  const message = type === 'sent'
    ? `Списано ${amount} тенге${recipient ? ` на счет ${recipient}` : ''}`
    : `Получено ${amount} тенге${recipient ? ` от ${recipient}` : ''}`;

  await createNotification({
    user_id: userId,
    notification_type: NotificationType.TRANSACTION,
    title,
    message,
    priority: NotificationPriority.NORMAL,
    metadata: { amount, type, recipient },
  });
};

export const sendSecurityNotification = async (
  userId: string,
  event: string,
  details?: string
): Promise<void> => {
  await createNotification({
    user_id: userId,
    notification_type: NotificationType.SECURITY,
    title: 'Безопасность аккаунта',
    message: `${event}${details ? `: ${details}` : ''}`,
    priority: NotificationPriority.HIGH,
    metadata: { event, details },
  });
};

export const sendLoanPaymentNotification = async (
  userId: string,
  amount: number,
  dueDate: Date
): Promise<void> => {
  await createNotification({
    user_id: userId,
    notification_type: NotificationType.LOAN_PAYMENT,
    title: 'Платеж по кредиту',
    message: `Платеж ${amount} тенге. Срок: ${dueDate.toLocaleDateString()}`,
    priority: NotificationPriority.HIGH,
    metadata: { amount, dueDate },
  });
};

export default {
  createNotification,
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationStats,
  sendTransactionNotification,
  sendSecurityNotification,
  sendLoanPaymentNotification,
};
