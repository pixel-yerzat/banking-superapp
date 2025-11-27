import bcrypt from 'bcryptjs';
import config from '../config/config';
import logger from './logger';

/**
 * Хеширование пароля
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Сравнение пароля с хешем
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
};

/**
 * Хеширование PIN-кода
 */
export const hashPin = async (pin: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    return await bcrypt.hash(pin, salt);
  } catch (error) {
    logger.error('Error hashing PIN:', error);
    throw new Error('Failed to hash PIN');
  }
};

/**
 * Сравнение PIN-кода с хешем
 */
export const comparePin = async (pin: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(pin, hash);
  } catch (error) {
    logger.error('Error comparing PIN:', error);
    throw new Error('Failed to compare PIN');
  }
};

/**
 * Валидация силы пароля
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Минимум 8 символов
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Максимум 128 символов
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Хотя бы одна заглавная буква
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Хотя бы одна строчная буква
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Хотя бы одна цифра
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Хотя бы один специальный символ
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Валидация PIN-кода (4 или 6 цифр)
 */
export const validatePin = (pin: string): boolean => {
  return /^\d{4}$|^\d{6}$/.test(pin);
};

/**
 * Генерация случайного пароля
 */
export const generateRandomPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  
  // Гарантируем наличие всех типов символов
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Заполняем остальное
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Перемешиваем символы
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

export default {
  hashPassword,
  comparePassword,
  hashPin,
  comparePin,
  validatePasswordStrength,
  validatePin,
  generateRandomPassword,
};
