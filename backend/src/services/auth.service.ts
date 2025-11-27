import { 
  createUser, 
  findUserByPhone, 
  findUserById,
  updateLastLogin,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  verifyUser,
} from './user.service';
import { 
  saveRefreshToken, 
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
  limitUserSessions,
  isRefreshTokenValid,
} from './token.service';
import {
  createOTP,
  verifyOTP,
  sendOTPviaSMS,
  sendOTPviaEmail,
} from './otp.service';
import { 
  generateTokenPair, 
  verifyRefreshToken 
} from '../utils/jwt';
import { comparePassword } from '../utils/password';
import { 
  CreateUserDto, 
  LoginDto, 
  AuthResponse, 
  User,
  UserStatus 
} from '../types';
import logger from '../utils/logger';

/**
 * Регистрация нового пользователя
 */
export const register = async (userData: CreateUserDto): Promise<AuthResponse> => {
  try {
    // Создаем пользователя
    const user = await createUser(userData);

    // Создаем OTP для верификации
    const otpCode = await createOTP(user.id, 'sms', 'registration');

    // Отправляем OTP
    await sendOTPviaSMS(user.phone, otpCode);

    // Генерируем токены
    const tokens = generateTokenPair({
      userId: user.id,
      phone: user.phone,
    });

    // Сохраняем refresh токен
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней
    await saveRefreshToken(user.id, tokens.refreshToken, expiresAt);

    // Удаляем чувствительные данные
    const { password_hash, pin_code_hash, ...userWithoutSensitiveData } = user;

    logger.info('User registered successfully', { userId: user.id });

    return {
      user: userWithoutSensitiveData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

/**
 * Вход пользователя
 */
export const login = async (
  credentials: LoginDto,
  deviceInfo?: any,
  ipAddress?: string
): Promise<AuthResponse> => {
  try {
    // Находим пользователя
    const user = await findUserByPhone(credentials.phone);

    if (!user) {
      throw new Error('Invalid phone or password');
    }

    // Проверяем статус пользователя
    if (user.status === UserStatus.BLOCKED) {
      throw new Error('Account is blocked. Please contact support.');
    }

    // Проверяем блокировку из-за неудачных попыток
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      throw new Error(
        `Account is temporarily locked. Try again in ${minutesLeft} minutes.`
      );
    }

    // Проверяем пароль
    const isPasswordValid = await comparePassword(
      credentials.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      // Увеличиваем счетчик неудачных попыток
      const failedAttempts = await incrementFailedLoginAttempts(user.id);
      
      const remainingAttempts = 5 - failedAttempts;
      if (remainingAttempts > 0) {
        throw new Error(
          `Invalid phone or password. ${remainingAttempts} attempts remaining.`
        );
      } else {
        throw new Error(
          'Too many failed login attempts. Account locked for 15 minutes.'
        );
      }
    }

    // Сбрасываем счетчик неудачных попыток
    await resetFailedLoginAttempts(user.id);

    // Если включена 2FA, создаем и отправляем OTP
    if (user.is_2fa_enabled) {
      const otpCode = await createOTP(user.id, 'sms', 'login');
      await sendOTPviaSMS(user.phone, otpCode);

      // Возвращаем специальный ответ, требующий 2FA
      return {
        user: {
          id: user.id,
          phone: user.phone,
          requires2FA: true,
        } as any,
        accessToken: '',
        refreshToken: '',
      };
    }

    // Генерируем токены
    const tokens = generateTokenPair({
      userId: user.id,
      phone: user.phone,
    });

    // Сохраняем refresh токен
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней
    await saveRefreshToken(
      user.id, 
      tokens.refreshToken, 
      expiresAt, 
      deviceInfo, 
      ipAddress
    );

    // Ограничиваем количество активных сессий
    await limitUserSessions(user.id, 5);

    // Обновляем время последнего входа
    await updateLastLogin(user.id);

    // Удаляем чувствительные данные
    const { password_hash, pin_code_hash, ...userWithoutSensitiveData } = user;

    logger.info('User logged in successfully', { userId: user.id });

    return {
      user: userWithoutSensitiveData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

/**
 * Верификация 2FA и завершение входа
 */
export const verify2FAAndLogin = async (
  userId: string,
  otpCode: string,
  deviceInfo?: any,
  ipAddress?: string
): Promise<AuthResponse> => {
  try {
    // Проверяем OTP
    const isValid = await verifyOTP(userId, otpCode, 'login');

    if (!isValid) {
      throw new Error('Invalid or expired OTP code');
    }

    // Получаем пользователя
    const user = await findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Генерируем токены
    const tokens = generateTokenPair({
      userId: user.id,
      phone: user.phone,
    });

    // Сохраняем refresh токен
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await saveRefreshToken(
      user.id, 
      tokens.refreshToken, 
      expiresAt, 
      deviceInfo, 
      ipAddress
    );

    // Обновляем время последнего входа
    await updateLastLogin(user.id);

    // Удаляем чувствительные данные
    const { password_hash, pin_code_hash, ...userWithoutSensitiveData } = user;

    logger.info('2FA verified and user logged in', { userId: user.id });

    return {
      user: userWithoutSensitiveData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    logger.error('2FA verification error:', error);
    throw error;
  }
};

/**
 * Обновление access токена через refresh токен
 */
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    // Проверяем валидность refresh токена в БД
    const isValid = await isRefreshTokenValid(refreshToken);

    if (!isValid) {
      throw new Error('Invalid or expired refresh token');
    }

    // Верифицируем refresh токен
    const decoded = verifyRefreshToken(refreshToken);

    // Генерируем новую пару токенов
    const tokens = generateTokenPair({
      userId: decoded.userId,
      phone: decoded.phone,
    });

    // Удаляем старый refresh токен
    await deleteRefreshToken(refreshToken);

    // Сохраняем новый refresh токен
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await saveRefreshToken(decoded.userId, tokens.refreshToken, expiresAt);

    logger.info('Access token refreshed', { userId: decoded.userId });

    return tokens;
  } catch (error) {
    logger.error('Token refresh error:', error);
    throw error;
  }
};

/**
 * Выход пользователя (logout)
 */
export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await deleteRefreshToken(refreshToken);
    logger.info('User logged out');
  } catch (error) {
    logger.error('Logout error:', error);
    throw error;
  }
};

/**
 * Выход со всех устройств
 */
export const logoutAllDevices = async (userId: string): Promise<void> => {
  try {
    await deleteAllUserRefreshTokens(userId);
    logger.info('User logged out from all devices', { userId });
  } catch (error) {
    logger.error('Logout all devices error:', error);
    throw error;
  }
};

/**
 * Отправка OTP для сброса пароля
 */
export const sendPasswordResetOTP = async (phone: string): Promise<void> => {
  try {
    const user = await findUserByPhone(phone);

    if (!user) {
      // Не раскрываем информацию о существовании пользователя
      logger.info('Password reset requested for non-existent phone', { phone });
      return;
    }

    const otpCode = await createOTP(user.id, 'sms', 'password_reset', 10); // 10 минут
    await sendOTPviaSMS(user.phone, otpCode);

    logger.info('Password reset OTP sent', { userId: user.id });
  } catch (error) {
    logger.error('Send password reset OTP error:', error);
    throw error;
  }
};

/**
 * Верификация пользователя после регистрации
 */
export const verifyRegistration = async (
  userId: string,
  otpCode: string
): Promise<void> => {
  try {
    const isValid = await verifyOTP(userId, otpCode, 'registration');

    if (!isValid) {
      throw new Error('Invalid or expired verification code');
    }

    await verifyUser(userId);

    logger.info('User verified successfully', { userId });
  } catch (error) {
    logger.error('Verification error:', error);
    throw error;
  }
};

export default {
  register,
  login,
  verify2FAAndLogin,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  sendPasswordResetOTP,
  verifyRegistration,
};
