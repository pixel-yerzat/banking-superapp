import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/categories
 * @desc    Статистика по категориям
 * @access  Private
 * @query   ?start_date=2024-01-01&end_date=2024-01-31&currency=KZT
 */
router.get('/categories', analyticsController.getCategoryStats);

/**
 * @route   GET /api/v1/analytics/spending
 * @desc    Анализ расходов
 * @access  Private
 * @query   ?period=month&currency=KZT
 */
router.get('/spending', analyticsController.getSpendingAnalysis);

/**
 * @route   GET /api/v1/analytics/compare
 * @desc    Сравнение расходов
 * @access  Private
 * @query   ?current_start=...&current_end=...&previous_start=...&previous_end=...
 */
router.get('/compare', analyticsController.compareSpending);

/**
 * @route   GET /api/v1/analytics/forecast
 * @desc    Прогноз расходов
 * @access  Private
 */
router.get('/forecast', analyticsController.forecastSpending);

/**
 * @route   GET /api/v1/analytics/recommendations
 * @desc    Рекомендации по оптимизации
 * @access  Private
 */
router.get('/recommendations', analyticsController.getRecommendations);

export default router;
