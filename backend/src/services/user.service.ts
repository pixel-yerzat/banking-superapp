import { query, getClient } from '../config/database';
import { User, CreateUserDto, UpdateUserDto, UserStatus } from '../types';
import { hashPassword, comparePassword } from '../utils/password';
import logger from '../utils/logger';

/**
 * Создание нового пользователя
 */
export const createUser = async (userData: CreateUserDto): Promise<User> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Проверяем существование пользователя
    const existingUser = await client.query(
      'SELECT id FROM users WHERE phone = $1 OR email = $2',
      [userData.phone, userData.email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this phone or email already exists');
    }

    // Хешируем пароль
    const passwordHash = await hashPassword(userData.password);

    // Создаем пользователя
    const result = await client.query(
      `INSERT INTO users (
        phone, email, password_hash, first_name, last_name, 
        middle_name, date_of_birth, iin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userData.phone,
        userData.email || null,
        passwordHash,
        userData.first_name,
        userData.last_name,
        userData.middle_name || null,
        userData.date_of_birth || null,
        userData.iin || null,
      ]
    );

    await client.query('COMMIT');

    logger.info('User created successfully', { 
      userId: result.rows[0].id,
      phone: userData.phone 
    });

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating user:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Поиск пользователя по ID
 */
export const findUserById = async (userId: string): Promise<User | null> => {
  try {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw error;
  }
};

/**
 * Поиск пользователя по телефону
 */
export const findUserByPhone = async (phone: string): Promise<User | null> => {
  try {
    const result = await query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error finding user by phone:', error);
    throw error;
  }
};

/**
 * Поиск пользователя по email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw error;
  }
};

/**
 * Обновление данных пользователя
 */
export const updateUser = async (
  userId: string,
  updates: UpdateUserDto
): Promise<User> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Динамически строим SQL запрос
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);

    const result = await query(
      `UPDATE users 
       SET ${fields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    logger.info('User updated successfully', { userId });

    return result.rows[0];
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Изменение пароля пользователя
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Получаем текущий хеш пароля
    const userResult = await client.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    // Проверяем текущий пароль
    const isValid = await comparePassword(
      currentPassword,
      userResult.rows[0].password_hash
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Хешируем новый пароль
    const newPasswordHash = await hashPassword(newPassword);

    // Обновляем пароль
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    await client.query('COMMIT');

    logger.info('Password changed successfully', { userId });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error changing password:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Верификация пользователя
 */
export const verifyUser = async (userId: string): Promise<void> => {
  try {
    await query(
      'UPDATE users SET is_verified = true WHERE id = $1',
      [userId]
    );

    logger.info('User verified successfully', { userId });
  } catch (error) {
    logger.error('Error verifying user:', error);
    throw error;
  }
};

/**
 * Включение/выключение 2FA
 */
export const toggle2FA = async (userId: string, enabled: boolean): Promise<void> => {
  try {
    await query(
      'UPDATE users SET is_2fa_enabled = $1 WHERE id = $2',
      [enabled, userId]
    );

    logger.info('2FA toggled', { userId, enabled });
  } catch (error) {
    logger.error('Error toggling 2FA:', error);
    throw error;
  }
};

/**
 * Блокировка пользователя
 */
export const blockUser = async (userId: string, reason?: string): Promise<void> => {
  try {
    await query(
      'UPDATE users SET status = $1 WHERE id = $2',
      [UserStatus.BLOCKED, userId]
    );

    logger.info('User blocked', { userId, reason });
  } catch (error) {
    logger.error('Error blocking user:', error);
    throw error;
  }
};

/**
 * Разблокировка пользователя
 */
export const unblockUser = async (userId: string): Promise<void> => {
  try {
    await query(
      'UPDATE users SET status = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
      [UserStatus.ACTIVE, userId]
    );

    logger.info('User unblocked', { userId });
  } catch (error) {
    logger.error('Error unblocking user:', error);
    throw error;
  }
};

/**
 * Увеличение счетчика неудачных попыток входа
 */
export const incrementFailedLoginAttempts = async (userId: string): Promise<number> => {
  try {
    const result = await query(
      `UPDATE users 
       SET failed_login_attempts = failed_login_attempts + 1 
       WHERE id = $1 
       RETURNING failed_login_attempts`,
      [userId]
    );

    const attempts = result.rows[0].failed_login_attempts;

    // Блокируем пользователя после 5 неудачных попыток на 15 минут
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
      await query(
        'UPDATE users SET locked_until = $1 WHERE id = $2',
        [lockUntil, userId]
      );
      logger.warn('User locked due to too many failed login attempts', { userId });
    }

    return attempts;
  } catch (error) {
    logger.error('Error incrementing failed login attempts:', error);
    throw error;
  }
};

/**
 * Сброс счетчика неудачных попыток входа
 */
export const resetFailedLoginAttempts = async (userId: string): Promise<void> => {
  try {
    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [userId]
    );
  } catch (error) {
    logger.error('Error resetting failed login attempts:', error);
    throw error;
  }
};

/**
 * Обновление времени последнего входа
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  } catch (error) {
    logger.error('Error updating last login:', error);
    throw error;
  }
};

export default {
  createUser,
  findUserById,
  findUserByPhone,
  findUserByEmail,
  updateUser,
  changePassword,
  verifyUser,
  toggle2FA,
  blockUser,
  unblockUser,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  updateLastLogin,
};
