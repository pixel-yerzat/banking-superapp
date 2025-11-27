import { Router } from 'express';
import * as templateController from '../controllers/template.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/templates
 * @desc    Создание шаблона платежа
 * @access  Private
 */
router.post('/', templateController.createTemplate);

/**
 * @route   GET /api/v1/templates
 * @desc    Получение всех шаблонов пользователя
 * @access  Private
 * @query   ?category=utilities
 */
router.get('/', templateController.getUserTemplates);

/**
 * @route   GET /api/v1/templates/auto-payments
 * @desc    Получение автоплатежей
 * @access  Private
 */
router.get('/auto-payments', templateController.getAutoPayments);

/**
 * @route   GET /api/v1/templates/search
 * @desc    Поиск шаблонов
 * @access  Private
 * @query   ?q=search_query
 */
router.get('/search', templateController.searchTemplates);

/**
 * @route   GET /api/v1/templates/stats
 * @desc    Статистика по шаблонам
 * @access  Private
 */
router.get('/stats', templateController.getTemplateStats);

/**
 * @route   GET /api/v1/templates/:templateId
 * @desc    Получение шаблона по ID
 * @access  Private
 */
router.get('/:templateId', templateController.getTemplateById);

/**
 * @route   PATCH /api/v1/templates/:templateId
 * @desc    Обновление шаблона
 * @access  Private
 */
router.patch('/:templateId', templateController.updateTemplate);

/**
 * @route   DELETE /api/v1/templates/:templateId
 * @desc    Удаление шаблона
 * @access  Private
 */
router.delete('/:templateId', templateController.deleteTemplate);

/**
 * @route   POST /api/v1/templates/:templateId/pay
 * @desc    Оплата по шаблону
 * @access  Private
 */
router.post('/:templateId/pay', templateController.payByTemplate);

/**
 * @route   PATCH /api/v1/templates/:templateId/auto-payment
 * @desc    Включение/выключение автоплатежа
 * @access  Private
 */
router.patch('/:templateId/auto-payment', templateController.toggleAutoPayment);

export default router;
