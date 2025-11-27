import { Router } from 'express';
import * as cardController from '../controllers/card.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateCreateCard, validateUpdateCardLimits } from '../middleware/validation.middleware';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/cards
 * @desc    Создание новой карты
 * @access  Private
 */
router.post('/', validateCreateCard, cardController.createCard);

/**
 * @route   GET /api/v1/cards
 * @desc    Получение всех карт пользователя
 * @access  Private
 */
router.get('/', cardController.getUserCards);

/**
 * @route   GET /api/v1/cards/:cardId
 * @desc    Получение карты по ID
 * @access  Private
 */
router.get('/:cardId', cardController.getCardById);

/**
 * @route   POST /api/v1/cards/:cardId/block
 * @desc    Блокировка карты
 * @access  Private
 */
router.post('/:cardId/block', cardController.blockCard);

/**
 * @route   POST /api/v1/cards/:cardId/unblock
 * @desc    Разблокировка карты
 * @access  Private
 */
router.post('/:cardId/unblock', cardController.unblockCard);

/**
 * @route   POST /api/v1/cards/:cardId/report-lost
 * @desc    Отметить карту как утерянную
 * @access  Private
 */
router.post('/:cardId/report-lost', cardController.reportCardLost);

/**
 * @route   PATCH /api/v1/cards/:cardId/limits
 * @desc    Обновление лимитов карты
 * @access  Private
 */
router.patch('/:cardId/limits', validateUpdateCardLimits, cardController.updateCardLimits);

/**
 * @route   PATCH /api/v1/cards/:cardId/contactless
 * @desc    Включение/выключение бесконтактных платежей
 * @access  Private
 */
router.patch('/:cardId/contactless', cardController.toggleContactless);

/**
 * @route   PATCH /api/v1/cards/:cardId/online-payments
 * @desc    Включение/выключение онлайн платежей
 * @access  Private
 */
router.patch('/:cardId/online-payments', cardController.toggleOnlinePayments);

export default router;
