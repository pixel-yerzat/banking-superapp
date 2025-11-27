import { Router } from 'express';
import * as accountController from '../controllers/account.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateCreateAccount } from '../middleware/validation.middleware';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/accounts
 * @desc    Создание нового счета
 * @access  Private
 */
router.post('/', validateCreateAccount, accountController.createAccount);

/**
 * @route   GET /api/v1/accounts
 * @desc    Получение всех счетов пользователя
 * @access  Private
 */
router.get('/', accountController.getUserAccounts);

/**
 * @route   GET /api/v1/accounts/total-balance
 * @desc    Получение общего баланса по всем счетам
 * @access  Private
 */
router.get('/total-balance', accountController.getTotalBalance);

/**
 * @route   GET /api/v1/accounts/:accountId
 * @desc    Получение счета по ID
 * @access  Private
 */
router.get('/:accountId', accountController.getAccountById);

/**
 * @route   GET /api/v1/accounts/:accountId/balance
 * @desc    Получение баланса счета
 * @access  Private
 */
router.get('/:accountId/balance', accountController.getAccountBalance);

/**
 * @route   POST /api/v1/accounts/:accountId/block
 * @desc    Блокировка счета
 * @access  Private
 */
router.post('/:accountId/block', accountController.blockAccount);

/**
 * @route   POST /api/v1/accounts/:accountId/unblock
 * @desc    Разблокировка счета
 * @access  Private
 */
router.post('/:accountId/unblock', accountController.unblockAccount);

/**
 * @route   POST /api/v1/accounts/:accountId/close
 * @desc    Закрытие счета
 * @access  Private
 */
router.post('/:accountId/close', accountController.closeAccount);

/**
 * @route   GET /api/v1/accounts/:accountId/transactions
 * @desc    Получение транзакций счета
 * @access  Private
 */
import * as transactionController from '../controllers/transaction.controller';
router.get('/:accountId/transactions', transactionController.getAccountTransactions);

export default router;
