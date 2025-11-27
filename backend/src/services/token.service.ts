import { query, getClient } from '../config/database';
import logger from '../utils/logger';

interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  device_info?: any;
  ip_address?: string;
}

/**
 * Сохранение refresh токена
 */
export const saveRefreshToken = async (
  userId: string,
  token: string,
  expiresAt: Date,
  deviceInfo?: any,
  ipAddress?: string
): Promise<void> => {
  try {
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, token, expiresAt, deviceInfo ? JSON.stringify(deviceInfo) : null, ipAddress]
    );

    logger.info('Refresh token saved', { userId });
  } catch (error) {
    logger.error('Error saving refresh token:', error);
    throw error;
  }
};

/**
 * Поиск refresh токена
 */
export const findRefreshToken = async (token: string): Promise<RefreshToken | null> => {
  try {
    const result = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error finding refresh token:', error);
    throw error;
  }
};

/**
 * Проверка валидности refresh токена
 */
export const isRefreshTokenValid = async (token: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 
       AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error validating refresh token:', error);
    throw error;
  }
};

/**
 * Удаление refresh токена (logout)
 */
export const deleteRefreshToken = async (token: string): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [token]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info('Refresh token deleted');
    }
  } catch (error) {
    logger.error('Error deleting refresh token:', error);
    throw error;
  }
};

/**
 * Удаление всех refresh токенов пользователя (logout from all devices)
 */
export const deleteAllUserRefreshTokens = async (userId: string): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    logger.info('All refresh tokens deleted for user', { 
      userId, 
      count: result.rowCount || 0 
    });
  } catch (error) {
    logger.error('Error deleting all user refresh tokens:', error);
    throw error;
  }
};

/**
 * Получение всех активных сессий пользователя
 */
export const getUserActiveSessions = async (userId: string): Promise<RefreshToken[]> => {
  try {
    const result = await query(
      `SELECT id, created_at, device_info, ip_address 
       FROM refresh_tokens 
       WHERE user_id = $1 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user active sessions:', error);
    throw error;
  }
};

/**
 * Удаление конкретной сессии по ID
 */
export const deleteSession = async (sessionId: string, userId: string): Promise<boolean> => {
  try {
    const result = await query(
      'DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info('Session deleted', { sessionId, userId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error deleting session:', error);
    throw error;
  }
};

/**
 * Очистка истекших токенов (для периодической очистки)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const result = await query(
      'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP'
    );

    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      logger.info('Expired refresh tokens cleaned up', { count: deletedCount });
    }

    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up expired tokens:', error);
    throw error;
  }
};

/**
 * Ограничение количества активных сессий на пользователя
 */
export const limitUserSessions = async (
  userId: string,
  maxSessions: number = 5
): Promise<void> => {
  try {
    // Получаем количество активных сессий
    const countResult = await query(
      `SELECT COUNT(*) as count 
       FROM refresh_tokens 
       WHERE user_id = $1 
       AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );

    const sessionCount = parseInt(countResult.rows[0].count);

    if (sessionCount >= maxSessions) {
      // Удаляем самые старые сессии
      await query(
        `DELETE FROM refresh_tokens 
         WHERE id IN (
           SELECT id FROM refresh_tokens 
           WHERE user_id = $1 
           AND expires_at > CURRENT_TIMESTAMP
           ORDER BY created_at ASC
           LIMIT ${sessionCount - maxSessions + 1}
         )`,
        [userId]
      );

      logger.info('Old sessions removed due to limit', { userId, maxSessions });
    }
  } catch (error) {
    logger.error('Error limiting user sessions:', error);
    throw error;
  }
};

export default {
  saveRefreshToken,
  findRefreshToken,
  isRefreshTokenValid,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
  getUserActiveSessions,
  deleteSession,
  cleanupExpiredTokens,
  limitUserSessions,
};
