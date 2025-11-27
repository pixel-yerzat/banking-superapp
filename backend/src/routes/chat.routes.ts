import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/chat/faq
 * @desc    Получение всех FAQ
 * @access  Public
 * @query   ?category=accounts
 */
router.get('/faq', chatController.getAllFAQ);

/**
 * @route   GET /api/v1/chat/faq/search
 * @desc    Поиск в FAQ
 * @access  Public
 * @query   ?q=search_query
 */
router.get('/faq/search', chatController.searchFAQ);

// Остальные роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/chat/message
 * @desc    Отправка сообщения в чат
 * @access  Private
 */
router.post('/message', chatController.sendMessage);

/**
 * @route   GET /api/v1/chat/history
 * @desc    Получение истории чата
 * @access  Private
 * @query   ?limit=50
 */
router.get('/history', chatController.getChatHistory);

/**
 * @route   DELETE /api/v1/chat/history
 * @desc    Очистка истории чата
 * @access  Private
 */
router.delete('/history', chatController.clearHistory);

/**
 * @route   GET /api/v1/chat/stats
 * @desc    Статистика чата
 * @access  Private
 */
router.get('/stats', chatController.getChatStats);

export default router;
