import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import * as userService from '../services/user.service';
import * as otpService from '../services/otp.service';
import { CreateUserDto, LoginDto } from '../types';
import logger from '../utils/logger';

/**
 * Регистрация нового пользователя
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserDto = req.body;

    const result = await authService.register(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your phone number.',
      data: result,
    });
  } catch (error) {
    logger.error('Register controller error:', error);
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Registration Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Registration failed',
    });
  }
};

/**
 * Вход пользователя
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials: LoginDto = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.login(
      credentials,
      deviceInfo ? { userAgent: deviceInfo } : undefined,
      ipAddress
    );

    // Проверяем требуется ли 2FA
    if ((result.user as any).requires2FA) {
      res.status(200).json({
        success: true,
        message: '2FA required. OTP code sent to your phone.',
        data: {
          userId: result.user.id,
          phone: result.user.phone,
          requires2FA: true,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    logger.error('Login controller error:', error);
    
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
};

/**
 * Верификация 2FA
 * POST /api/v1/auth/verify-2fa
 */
export const verify2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, code } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.verify2FAAndLogin(
      userId,
      code,
      deviceInfo ? { userAgent: deviceInfo } : undefined,
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: '2FA verification successful',
      data: result,
    });
  } catch (error) {
    logger.error('2FA verification controller error:', error);
    
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: 'Verification Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '2FA verification failed',
    });
  }
};

/**
 * Обновление access токена
 * POST /api/v1/auth/refresh
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    logger.error('Refresh token controller error:', error);
    
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: 'Token Refresh Failed',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Token refresh failed',
    });
  }
};

/**
 * Выход пользователя
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Logout failed',
    });
  }
};

/**
 * Выход со всех устройств
 * POST /api/v1/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    await authService.logoutAllDevices(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    logger.error('Logout all controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Logout all failed',
    });
  }
};

/**
 * Отправка OTP для верификации
 * POST /api/v1/auth/send-otp
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, type } = req.body;

    const user = await userService.findUserByPhone(phone);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    const code = await otpService.createOTP(user.id, type, 'registration');

    if (type === 'sms') {
      await otpService.sendOTPviaSMS(phone, code);
    } else {
      if (!user.email) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Email not registered',
        });
        return;
      }
      await otpService.sendOTPviaEmail(user.email, code);
    }

    res.status(200).json({
      success: true,
      message: `OTP sent via ${type}`,
    });
  } catch (error) {
    logger.error('Send OTP controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to send OTP',
    });
  }
};

/**
 * Верификация OTP
 * POST /api/v1/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code } = req.body;

    const user = await userService.findUserByPhone(phone);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    const isValid = await otpService.verifyOTP(user.id, code, 'registration');

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid OTP',
        message: 'Invalid or expired OTP code',
      });
      return;
    }

    await userService.verifyUser(user.id);

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
    });
  } catch (error) {
    logger.error('Verify OTP controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'OTP verification failed',
    });
  }
};

/**
 * Запрос на сброс пароля
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    await authService.sendPasswordResetOTP(phone);

    res.status(200).json({
      success: true,
      message: 'If this phone number is registered, you will receive an OTP',
    });
  } catch (error) {
    logger.error('Forgot password controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process password reset request',
    });
  }
};

/**
 * Сброс пароля с OTP
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp, newPassword } = req.body;

    const user = await userService.findUserByPhone(phone);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    const isValid = await otpService.verifyOTP(user.id, otp, 'password_reset');

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid OTP',
        message: 'Invalid or expired OTP code',
      });
      return;
    }

    // Сбрасываем пароль напрямую через обновление пользователя
    const { hashPassword } = await import('../utils/password');
    const passwordHash = await hashPassword(newPassword);
    
    await userService.updateUser(user.id, { password_hash: passwordHash } as any);

    // Выходим со всех устройств для безопасности
    await authService.logoutAllDevices(user.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    logger.error('Reset password controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Password reset failed',
    });
  }
};

/**
 * Получение информации о текущем пользователе
 * GET /api/v1/auth/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const user = await userService.findUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    const { password_hash, pin_code_hash, ...userWithoutSensitiveData } = user;

    res.status(200).json({
      success: true,
      data: userWithoutSensitiveData,
    });
  } catch (error) {
    logger.error('Get me controller error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get user information',
    });
  }
};

export default {
  register,
  login,
  verify2FA,
  refresh,
  logout,
  logoutAll,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  getMe,
};
