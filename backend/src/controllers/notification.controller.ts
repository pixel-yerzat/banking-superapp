import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service';
import logger from '../utils/logger';

/**
 * Получение всех уведомлений пользователя
 * GET /api/v1/notifications
 */
export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    const result = await notificationService.getUserNotifications(
      req.user.userId,
      limitNum,
      offsetNum
    );

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    logger.error('Get user notifications controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get notifications',
    });
  }
};

/**
 * Получение непрочитанных уведомлений
 * GET /api/v1/notifications/unread
 */
export const getUnreadNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const notifications = await notificationService.getUnreadNotifications(req.user.userId);

    res.status(200).json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    logger.error('Get unread notifications controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get unread notifications',
    });
  }
};

/**
 * Отметка уведомления как прочитанного
 * PATCH /api/v1/notifications/:notificationId/read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { notificationId } = req.params;

    await notificationService.markAsRead(notificationId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Mark as read controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to mark notification as read',
    });
  }
};

/**
 * Отметка всех уведомлений как прочитанных
 * POST /api/v1/notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    await notificationService.markAllAsRead(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.error('Mark all as read controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to mark all notifications as read',
    });
  }
};

/**
 * Удаление уведомления
 * DELETE /api/v1/notifications/:notificationId
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Delete notification controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete notification',
    });
  }
};

/**
 * Получение настроек уведомлений
 * GET /api/v1/notifications/settings
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const settings = await notificationService.getNotificationSettings(req.user.userId);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Get notification settings controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get notification settings',
    });
  }
};

/**
 * Обновление настроек уведомлений
 * PATCH /api/v1/notifications/settings
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const settings = await notificationService.updateNotificationSettings(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Notification settings updated',
      data: settings,
    });
  } catch (error) {
    logger.error('Update notification settings controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update notification settings',
    });
  }
};

/**
 * Получение статистики уведомлений
 * GET /api/v1/notifications/stats
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const stats = await notificationService.getNotificationStats(req.user.userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get notification stats controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get notification statistics',
    });
  }
};

export default {
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getSettings,
  updateSettings,
  getStats,
};
