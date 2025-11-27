import crypto from 'crypto';
import logger from './logger';

/**
 * Генерация 6-значного OTP кода
 */
export const generateOTP = (length: number = 6): string => {
  try {
    const digits = '0123456789';
    let otp = '';
    
    const bytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      otp += digits[bytes[i] % 10];
    }
    
    return otp;
  } catch (error) {
    logger.error('Error generating OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Генерация кода с буквами и цифрами (для email верификации)
 */
export const generateVerificationCode = (length: number = 8): string => {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    const bytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }
    
    return code;
  } catch (error) {
    logger.error('Error generating verification code:', error);
    throw new Error('Failed to generate verification code');
  }
};

/**
 * Вычисление времени истечения OTP (в минутах)
 */
export const getOTPExpiry = (minutes: number = 5): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

/**
 * Проверка истечения срока действия
 */
export const isExpired = (expiryDate: Date): boolean => {
  return new Date() > new Date(expiryDate);
};

/**
 * Генерация уникального номера транзакции
 */
export const generateReferenceNumber = (): string => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

/**
 * Генерация номера счета (20 цифр)
 */
export const generateAccountNumber = (): string => {
  const timestamp = Date.now().toString().slice(-10);
  const random = crypto.randomBytes(5).toString('hex');
  const digits = timestamp + random.replace(/[^0-9]/g, '');
  return digits.slice(0, 20).padEnd(20, '0');
};

/**
 * Генерация номера карты (16 цифр, формат: 4-4-4-4)
 */
export const generateCardNumber = (bin: string = '5555'): string => {
  // BIN (Bank Identification Number) - первые 6 цифр
  // Для тестирования используем 555555 (начало карт Mastercard)
  const prefix = bin.padEnd(6, '5');
  
  // Генерируем остальные цифры
  let cardNumber = prefix;
  for (let i = 6; i < 15; i++) {
    cardNumber += Math.floor(Math.random() * 10);
  }
  
  // Последняя цифра - контрольная сумма Luhn
  const checkDigit = calculateLuhnChecksum(cardNumber);
  cardNumber += checkDigit;
  
  return cardNumber;
};

/**
 * Алгоритм Luhn для проверки/генерации контрольной суммы номера карты
 */
const calculateLuhnChecksum = (cardNumber: string): number => {
  let sum = 0;
  let shouldDouble = true;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (10 - (sum % 10)) % 10;
};

/**
 * Валидация номера карты по алгоритму Luhn
 */
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

/**
 * Маскировка номера карты (показываем только последние 4 цифры)
 */
export const maskCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '****';
  
  const lastFour = cleaned.slice(-4);
  return `**** **** **** ${lastFour}`;
};

/**
 * Маскировка email (показываем первую букву и домен)
 */
export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  if (!username || !domain) return '***@***';
  
  return `${username[0]}***@${domain}`;
};

/**
 * Маскировка телефона (показываем код страны и последние 2 цифры)
 */
export const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***';
  
  const countryCode = cleaned.slice(0, 1);
  const lastTwo = cleaned.slice(-2);
  return `+${countryCode}********${lastTwo}`;
};

export default {
  generateOTP,
  generateVerificationCode,
  getOTPExpiry,
  isExpired,
  generateReferenceNumber,
  generateAccountNumber,
  generateCardNumber,
  validateCardNumber,
  maskCardNumber,
  maskEmail,
  maskPhone,
};
