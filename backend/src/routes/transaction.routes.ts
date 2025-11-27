import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateCreateTransaction,
  validateTransferToPhone,
  validateTransferToAccount,
} from '../middleware/validation.middleware';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/transactions
 * @desc    Создание транзакции
 * @access  Private
 */
router.post('/', validateCreateTransaction, transactionController.createTransaction);

/**
 * @route   POST /api/v1/transactions/transfer/phone
 * @desc    Перевод по номеру телефона
 * @access  Private
 */
router.post(
  '/transfer/phone',
  validateTransferToPhone,
  transactionController.transferToPhone
);

/**
 * @route   POST /api/v1/transactions/transfer/account
 * @desc    Перевод по номеру счета
 * @access  Private
 */
router.post(
  '/transfer/account',
  validateTransferToAccount,
  transactionController.transferToAccount
);

/**
 * @route   GET /api/v1/transactions
 * @desc    Получение всех транзакций пользователя
 * @access  Private
 */
router.get('/', transactionController.getUserTransactions);

/**
 * @route   GET /api/v1/transactions/stats
 * @desc    Получение статистики транзакций
 * @access  Private
 */
router.get('/stats', transactionController.getUserTransactionStats);

/**
 * @route   GET /api/v1/transactions/:transactionId
 * @desc    Получение транзакции по ID
 * @access  Private
 */
router.get('/:transactionId', transactionController.getTransactionById);

/**
 * @route   POST /api/v1/transactions/:transactionId/cancel
 * @desc    Отмена транзакции
 * @access  Private
 */
router.post('/:transactionId/cancel', transactionController.cancelTransaction);

export default router;
