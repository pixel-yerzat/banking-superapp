import { Router } from 'express';
import * as depositController from '../controllers/deposit.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/deposits/calculate
 * @desc    Калькулятор депозита
 * @access  Public
 */
router.post('/calculate', depositController.calculateDeposit);

// Все остальные роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/deposits
 * @desc    Открытие депозита
 * @access  Private
 */
router.post('/', depositController.openDeposit);

/**
 * @route   GET /api/v1/deposits
 * @desc    Получение всех депозитов пользователя
 * @access  Private
 */
router.get('/', depositController.getUserDeposits);

/**
 * @route   GET /api/v1/deposits/stats
 * @desc    Статистика по депозитам
 * @access  Private
 */
router.get('/stats', depositController.getDepositStats);

/**
 * @route   GET /api/v1/deposits/:depositId
 * @desc    Получение депозита по ID
 * @access  Private
 */
router.get('/:depositId', depositController.getDepositById);

/**
 * @route   POST /api/v1/deposits/:depositId/close
 * @desc    Закрытие депозита
 * @access  Private
 */
router.post('/:depositId/close', depositController.closeDeposit);

/**
 * @route   PATCH /api/v1/deposits/:depositId/auto-renewal
 * @desc    Включение/выключение автопролонгации
 * @access  Private
 */
router.patch('/:depositId/auto-renewal', depositController.toggleAutoRenewal);

export default router;
