import { Router } from 'express';
import * as providerController from '../controllers/provider.controller';

const router = Router();

/**
 * @route   GET /api/v1/providers
 * @desc    Получение всех провайдеров
 * @access  Public
 * @query   ?category=utilities
 */
router.get('/', providerController.getAllProviders);

/**
 * @route   GET /api/v1/providers/popular
 * @desc    Получение популярных провайдеров
 * @access  Public
 * @query   ?limit=10
 */
router.get('/popular', providerController.getPopularProviders);

/**
 * @route   GET /api/v1/providers/search
 * @desc    Поиск провайдеров
 * @access  Public
 * @query   ?q=search_query
 */
router.get('/search', providerController.searchProviders);

/**
 * @route   GET /api/v1/providers/:providerId
 * @desc    Получение провайдера по ID
 * @access  Public
 */
router.get('/:providerId', providerController.getProviderById);

/**
 * @route   POST /api/v1/providers/:providerId/pay
 * @desc    Оплата через провайдера
 * @access  Private
 */
import { authenticate } from '../middleware/auth.middleware';
router.post('/:providerId/pay', authenticate, providerController.payToProvider);

export default router;
