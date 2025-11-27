import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validatePasswordStrength } from '../utils/password';

/**
 * Middleware для обработки результатов валидации
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
      })),
    });
    return;
  }
  
  next();
};

/**
 * Валидация регистрации
 */
export const validateRegister = [
  body('phone')
    .trim()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Phone number must be between 10 and 15 digits'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .custom((value) => {
      const validation = validatePasswordStrength(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),
  
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('First name must contain only letters, spaces and hyphens'),
  
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Last name must contain only letters, spaces and hyphens'),
  
  body('middle_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Middle name must contain only letters, spaces and hyphens'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const birthDate = new Date(value);
      const age = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) {
        throw new Error('Must be at least 18 years old');
      }
      if (age > 120) {
        throw new Error('Invalid birth date');
      }
      return true;
    }),
  
  body('iin')
    .optional()
    .trim()
    .matches(/^\d{12}$/)
    .withMessage('IIN must be exactly 12 digits'),
  
  validate,
];

/**
 * Валидация входа
 */
export const validateLogin = [
  body('phone')
    .trim()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validate,
];

/**
 * Валидация refresh token
 */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
  
  validate,
];

/**
 * Валидация верификации OTP
 */
export const validateVerifyOTP = [
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP code must be exactly 6 digits'),
  
  body('phone')
    .trim()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  
  validate,
];

/**
 * Валидация отправки OTP
 */
export const validateSendOTP = [
  body('phone')
    .trim()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  
  body('type')
    .isIn(['sms', 'email'])
    .withMessage('Type must be either sms or email'),
  
  validate,
];

/**
 * Валидация смены пароля
 */
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .custom((value) => {
      const validation = validatePasswordStrength(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    })
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate,
];

/**
 * Валидация сброса пароля
 */
export const validateResetPassword = [
  body('phone')
    .trim()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP code must be exactly 6 digits'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .custom((value) => {
      const validation = validatePasswordStrength(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate,
];

/**
 * Валидация установки PIN-кода
 */
export const validateSetPin = [
  body('pin')
    .trim()
    .matches(/^\d{4}$|^\d{6}$/)
    .withMessage('PIN must be either 4 or 6 digits'),
  
  body('confirmPin')
    .custom((value, { req }) => {
      if (value !== req.body.pin) {
        throw new Error('PINs do not match');
      }
      return true;
    }),
  
  validate,
];

/**
 * Валидация обновления профиля
 */
export const validateUpdateProfile = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('First name must contain only letters, spaces and hyphens'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Last name must contain only letters, spaces and hyphens'),
  
  body('middle_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s-]+$/)
    .withMessage('Middle name must contain only letters, spaces and hyphens'),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  validate,
];

/**
 * Валидация создания счета
 */
export const validateCreateAccount = [
  body('account_type')
    .isIn(['checking', 'savings', 'deposit', 'credit'])
    .withMessage('Account type must be checking, savings, deposit, or credit'),
  
  body('currency')
    .isIn(['KZT', 'USD', 'EUR', 'RUB'])
    .withMessage('Currency must be KZT, USD, EUR, or RUB'),
  
  validate,
];

/**
 * Валидация создания карты
 */
export const validateCreateCard = [
  body('account_id')
    .notEmpty()
    .isUUID()
    .withMessage('Valid account ID is required'),
  
  body('card_type')
    .isIn(['debit', 'credit', 'virtual'])
    .withMessage('Card type must be debit, credit, or virtual'),
  
  body('payment_system')
    .isIn(['visa', 'mastercard', 'mir', 'unionpay'])
    .withMessage('Payment system must be visa, mastercard, mir, or unionpay'),
  
  body('daily_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily limit must be a positive number'),
  
  body('monthly_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly limit must be a positive number'),
  
  validate,
];

/**
 * Валидация обновления лимитов карты
 */
export const validateUpdateCardLimits = [
  body('daily_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily limit must be a positive number'),
  
  body('monthly_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly limit must be a positive number'),
  
  validate,
];

/**
 * Валидация создания транзакции
 */
export const validateCreateTransaction = [
  body('transaction_type')
    .isIn(['transfer', 'payment', 'deposit', 'withdrawal', 'fee', 'interest', 'cashback', 'refund'])
    .withMessage('Invalid transaction type'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('currency')
    .isIn(['KZT', 'USD', 'EUR', 'RUB'])
    .withMessage('Currency must be KZT, USD, EUR, or RUB'),
  
  body('from_account_id')
    .optional()
    .isUUID()
    .withMessage('Invalid source account ID'),
  
  body('to_account_id')
    .optional()
    .isUUID()
    .withMessage('Invalid destination account ID'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  validate,
];

/**
 * Валидация перевода по телефону
 */
export const validateTransferToPhone = [
  body('from_account_id')
    .notEmpty()
    .isUUID()
    .withMessage('Valid source account ID is required'),
  
  body('to_phone')
    .trim()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  validate,
];

/**
 * Валидация перевода по номеру счета
 */
export const validateTransferToAccount = [
  body('from_account_id')
    .notEmpty()
    .isUUID()
    .withMessage('Valid source account ID is required'),
  
  body('to_account_number')
    .trim()
    .matches(/^\d{20}$/)
    .withMessage('Account number must be exactly 20 digits'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  validate,
];

export default {
  validate,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateVerifyOTP,
  validateSendOTP,
  validateChangePassword,
  validateResetPassword,
  validateSetPin,
  validateUpdateProfile,
  validateCreateAccount,
  validateCreateCard,
  validateUpdateCardLimits,
  validateCreateTransaction,
  validateTransferToPhone,
  validateTransferToAccount,
};
