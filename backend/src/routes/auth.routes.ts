import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateVerifyOTP,
  validateSendOTP,
  validateResetPassword,
} from '../middleware/validation.middleware';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Регистрация нового пользователя
 * @access  Public
 */
router.post('/register', validateRegister, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Вход пользователя
 * @access  Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/v1/auth/verify-2fa
 * @desc    Верификация 2FA кода
 * @access  Public
 */
router.post('/verify-2fa', authController.verify2FA);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Обновление access токена
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, authController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Выход пользователя (удаление refresh токена)
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Выход со всех устройств
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Отправка OTP кода
 * @access  Public
 */
router.post('/send-otp', validateSendOTP, authController.sendOTP);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Верификация OTP кода
 * @access  Public
 */
router.post('/verify-otp', validateVerifyOTP, authController.verifyOTP);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Запрос на сброс пароля (отправка OTP)
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Сброс пароля с OTP
 * @access  Public
 */
router.post('/reset-password', validateResetPassword, authController.resetPassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Получение информации о текущем пользователе
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

export default router;
