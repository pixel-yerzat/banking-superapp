import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   GET /api/v1/notifications
 * @desc    Получение всех уведомлений пользователя
 * @access  Private
 * @query   ?limit=50&offset=0
 */
router.get('/', notificationController.getUserNotifications);

/**
 * @route   GET /api/v1/notifications/unread
 * @desc    Получение непрочитанных уведомлений
 * @access  Private
 */
router.get('/unread', notificationController.getUnreadNotifications);

/**
 * @route   GET /api/v1/notifications/settings
 * @desc    Получение настроек уведомлений
 * @access  Private
 */
router.get('/settings', notificationController.getSettings);

/**
 * @route   PATCH /api/v1/notifications/settings
 * @desc    Обновление настроек уведомлений
 * @access  Private
 */
router.patch('/settings', notificationController.updateSettings);

/**
 * @route   GET /api/v1/notifications/stats
 * @desc    Статистика уведомлений
 * @access  Private
 */
router.get('/stats', notificationController.getStats);

/**
 * @route   POST /api/v1/notifications/read-all
 * @desc    Отметка всех уведомлений как прочитанных
 * @access  Private
 */
router.post('/read-all', notificationController.markAllAsRead);

/**
 * @route   PATCH /api/v1/notifications/:notificationId/read
 * @desc    Отметка уведомления как прочитанного
 * @access  Private
 */
router.patch('/:notificationId/read', notificationController.markAsRead);

/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Удаление уведомления
 * @access  Private
 */
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;
