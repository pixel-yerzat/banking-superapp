import { Router } from 'express';
import * as loanController from '../controllers/loan.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/loans/calculate
 * @desc    Калькулятор кредита
 * @access  Public
 */
router.post('/calculate', loanController.calculateLoan);

// Все остальные роуты требуют аутентификации
router.use(authenticate);

/**
 * @route   POST /api/v1/loans
 * @desc    Создание заявки на кредит
 * @access  Private
 */
router.post('/', loanController.createLoanApplication);

/**
 * @route   GET /api/v1/loans
 * @desc    Получение всех кредитов пользователя
 * @access  Private
 */
router.get('/', loanController.getUserLoans);

/**
 * @route   GET /api/v1/loans/stats
 * @desc    Статистика по кредитам
 * @access  Private
 */
router.get('/stats', loanController.getLoanStats);

/**
 * @route   GET /api/v1/loans/:loanId
 * @desc    Получение кредита по ID
 * @access  Private
 */
router.get('/:loanId', loanController.getLoanById);

/**
 * @route   GET /api/v1/loans/:loanId/schedule
 * @desc    Получение графика платежей
 * @access  Private
 */
router.get('/:loanId/schedule', loanController.getLoanSchedule);

/**
 * @route   POST /api/v1/loans/:loanId/approve
 * @desc    Одобрение кредита (демо)
 * @access  Private
 */
router.post('/:loanId/approve', loanController.approveLoan);

/**
 * @route   POST /api/v1/loans/:loanId/pay
 * @desc    Платеж по кредиту
 * @access  Private
 */
router.post('/:loanId/pay', loanController.makeLoanPayment);

/**
 * @route   POST /api/v1/loans/:loanId/early-repay
 * @desc    Досрочное погашение кредита
 * @access  Private
 */
router.post('/:loanId/early-repay', loanController.earlyRepayment);

export default router;
