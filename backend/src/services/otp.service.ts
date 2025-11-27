import { query, getClient } from '../config/database';
import { generateOTP, getOTPExpiry, isExpired } from '../utils/generators';
import logger from '../utils/logger';

interface OTPCode {
  id: string;
  user_id: string;
  code: string;
  type: 'sms' | 'email' | '2fa';
  purpose: 'login' | 'registration' | 'password_reset' | 'transaction';
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

/**
 * Создание OTP кода
 */
export const createOTP = async (
  userId: string,
  type: 'sms' | 'email' | '2fa',
  purpose: 'login' | 'registration' | 'password_reset' | 'transaction',
  expiryMinutes: number = 5
): Promise<string> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Генерируем код
    const code = generateOTP(6);
    const expiresAt = getOTPExpiry(expiryMinutes);

    // Удаляем старые неиспользованные коды для этого пользователя и цели
    await client.query(
      `DELETE FROM otp_codes 
       WHERE user_id = $1 
       AND purpose = $2 
       AND is_used = false`,
      [userId, purpose]
    );

    // Сохраняем новый код
    await client.query(
      `INSERT INTO otp_codes (user_id, code, type, purpose, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, code, type, purpose, expiresAt]
    );

    await client.query('COMMIT');

    logger.info('OTP code created', { 
      userId, 
      type, 
      purpose,
      expiresIn: `${expiryMinutes} minutes`
    });

    return code;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating OTP code:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Верификация OTP кода
 */
export const verifyOTP = async (
  userId: string,
  code: string,
  purpose: 'login' | 'registration' | 'password_reset' | 'transaction'
): Promise<boolean> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем код из БД
    const result = await client.query(
      `SELECT * FROM otp_codes 
       WHERE user_id = $1 
       AND code = $2 
       AND purpose = $3 
       AND is_used = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, code, purpose]
    );

    if (result.rows.length === 0) {
      logger.warn('OTP code not found or already used', { userId, purpose });
      await client.query('ROLLBACK');
      return false;
    }

    const otpRecord = result.rows[0];

    // Проверяем срок действия
    if (isExpired(otpRecord.expires_at)) {
      logger.warn('OTP code expired', { userId, purpose });
      await client.query('ROLLBACK');
      return false;
    }

    // Помечаем код как использованный
    await client.query(
      'UPDATE otp_codes SET is_used = true WHERE id = $1',
      [otpRecord.id]
    );

    await client.query('COMMIT');

    logger.info('OTP code verified successfully', { userId, purpose });

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error verifying OTP code:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Проверка существования действующего OTP кода
 */
export const hasValidOTP = async (
  userId: string,
  purpose: 'login' | 'registration' | 'password_reset' | 'transaction'
): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT * FROM otp_codes 
       WHERE user_id = $1 
       AND purpose = $2 
       AND is_used = false 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking valid OTP:', error);
    throw error;
  }
};

/**
 * Получение оставшегося времени до истечения OTP
 */
export const getOTPTimeRemaining = async (
  userId: string,
  purpose: 'login' | 'registration' | 'password_reset' | 'transaction'
): Promise<number | null> => {
  try {
    const result = await query(
      `SELECT expires_at FROM otp_codes 
       WHERE user_id = $1 
       AND purpose = $2 
       AND is_used = false 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const expiresAt = new Date(result.rows[0].expires_at);
    const now = new Date();
    const remainingSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    return remainingSeconds > 0 ? remainingSeconds : 0;
  } catch (error) {
    logger.error('Error getting OTP time remaining:', error);
    throw error;
  }
};

/**
 * Удаление всех OTP кодов пользователя
 */
export const deleteUserOTPs = async (userId: string): Promise<void> => {
  try {
    await query(
      'DELETE FROM otp_codes WHERE user_id = $1',
      [userId]
    );

    logger.info('All OTP codes deleted for user', { userId });
  } catch (error) {
    logger.error('Error deleting user OTPs:', error);
    throw error;
  }
};

/**
 * Очистка истекших OTP кодов (для периодической очистки)
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
  try {
    const result = await query(
      'DELETE FROM otp_codes WHERE expires_at < CURRENT_TIMESTAMP'
    );

    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      logger.info('Expired OTP codes cleaned up', { count: deletedCount });
    }

    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up expired OTPs:', error);
    throw error;
  }
};

/**
 * Отправка OTP по SMS (заглушка, будет реализовано позже)
 */
export const sendOTPviaSMS = async (phone: string, code: string): Promise<boolean> => {
  try {
    // TODO: Интеграция с SMS провайдером (Twilio, AWS SNS и т.д.)
    logger.info('OTP SMS would be sent', { 
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      code: '******' // Не логируем реальный код в production
    });

    // В режиме разработки просто логируем
    if (process.env.NODE_ENV === 'development') {
      logger.debug('OTP Code (dev only):', { code });
    }

    return true;
  } catch (error) {
    logger.error('Error sending OTP via SMS:', error);
    return false;
  }
};

/**
 * Отправка OTP по Email (заглушка, будет реализовано позже)
 */
export const sendOTPviaEmail = async (email: string, code: string): Promise<boolean> => {
  try {
    // TODO: Интеграция с Email провайдером (SendGrid, AWS SES и т.д.)
    logger.info('OTP Email would be sent', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      code: '******' // Не логируем реальный код в production
    });

    // В режиме разработки просто логируем
    if (process.env.NODE_ENV === 'development') {
      logger.debug('OTP Code (dev only):', { code });
    }

    return true;
  } catch (error) {
    logger.error('Error sending OTP via Email:', error);
    return false;
  }
};

export default {
  createOTP,
  verifyOTP,
  hasValidOTP,
  getOTPTimeRemaining,
  deleteUserOTPs,
  cleanupExpiredOTPs,
  sendOTPviaSMS,
  sendOTPviaEmail,
};
