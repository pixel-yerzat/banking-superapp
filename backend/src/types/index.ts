/**
 * Основные типы данных для банковского приложения
 */

// ===============================================
// USER TYPES
// ===============================================

export interface User {
  id: string;
  phone: string;
  email?: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: Date;
  iin?: string; // ИИН для Казахстана
  status: UserStatus;
  is_verified: boolean;
  is_2fa_enabled: boolean;
  pin_code_hash?: string;
  biometric_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export interface CreateUserDto {
  phone: string;
  email?: string;
  password: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: string;
  iin?: string;
}

export interface UpdateUserDto {
  email?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
}

// ===============================================
// ACCOUNT TYPES
// ===============================================

export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  account_type: AccountType;
  currency: Currency;
  balance: number;
  available_balance: number;
  status: AccountStatus;
  interest_rate?: number;
  opened_at: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  DEPOSIT = 'deposit',
  CREDIT = 'credit',
}

export enum AccountStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  CLOSED = 'closed',
}

export enum Currency {
  KZT = 'KZT',
  USD = 'USD',
  EUR = 'EUR',
  RUB = 'RUB',
}

export interface CreateAccountDto {
  account_type: AccountType;
  currency: Currency;
}

// ===============================================
// CARD TYPES
// ===============================================

export interface Card {
  id: string;
  account_id: string;
  card_number: string;
  card_holder_name: string;
  card_type: CardType;
  payment_system: PaymentSystem;
  expiry_date: Date;
  cvv_hash: string;
  status: CardStatus;
  daily_limit?: number;
  monthly_limit?: number;
  is_contactless: boolean;
  is_online_payments: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum CardType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  VIRTUAL = 'virtual',
}

export enum PaymentSystem {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  MIR = 'mir',
  UNIONPAY = 'unionpay',
}

export enum CardStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  EXPIRED = 'expired',
  LOST = 'lost',
}

// ===============================================
// TRANSACTION TYPES
// ===============================================

export interface Transaction {
  id: string;
  from_account_id?: string;
  to_account_id?: string;
  transaction_type: TransactionType;
  amount: number;
  currency: Currency;
  exchange_rate: number;
  fee: number;
  status: TransactionStatus;
  description?: string;
  reference_number: string;
  metadata?: Record<string, any>;
  created_at: Date;
  completed_at?: Date;
}

export enum TransactionType {
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FEE = 'fee',
  INTEREST = 'interest',
  CASHBACK = 'cashback',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface CreateTransactionDto {
  from_account_id?: string;
  to_account_id?: string;
  transaction_type: TransactionType;
  amount: number;
  currency: Currency;
  description?: string;
  metadata?: Record<string, any>;
}

// ===============================================
// PAYMENT TEMPLATE TYPES
// ===============================================

export interface PaymentTemplate {
  id: string;
  user_id: string;
  template_name: string;
  recipient_name?: string;
  recipient_account?: string;
  recipient_phone?: string;
  amount?: number;
  currency: Currency;
  category?: string;
  description?: string;
  is_auto_payment: boolean;
  auto_payment_day?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentTemplateDto {
  template_name: string;
  recipient_name?: string;
  recipient_account?: string;
  recipient_phone?: string;
  amount?: number;
  currency: Currency;
  category?: string;
  description?: string;
  is_auto_payment?: boolean;
  auto_payment_day?: number;
}

// ===============================================
// LOAN TYPES
// ===============================================

export interface Loan {
  id: string;
  user_id: string;
  account_id?: string;
  loan_type: LoanType;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  remaining_balance: number;
  status: LoanStatus;
  disbursement_date?: Date;
  maturity_date?: Date;
  next_payment_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum LoanType {
  CONSUMER = 'consumer',
  MORTGAGE = 'mortgage',
  CAR = 'car',
  BUSINESS = 'business',
}

export enum LoanStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAID_OFF = 'paid_off',
  DEFAULTED = 'defaulted',
}

// ===============================================
// DEPOSIT TYPES
// ===============================================

export interface Deposit {
  id: string;
  user_id: string;
  account_id?: string;
  deposit_type: DepositType;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  current_balance: number;
  status: DepositStatus;
  start_date: Date;
  maturity_date: Date;
  is_auto_renewal: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum DepositType {
  FIXED = 'fixed',
  FLEXIBLE = 'flexible',
  SAVINGS = 'savings',
}

export enum DepositStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  MATURED = 'matured',
}

// ===============================================
// NOTIFICATION TYPES
// ===============================================

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
  created_at: Date;
  read_at?: Date;
}

export enum NotificationType {
  TRANSACTION = 'transaction',
  SECURITY = 'security',
  MARKETING = 'marketing',
  SYSTEM = 'system',
  LOAN_PAYMENT = 'loan_payment',
  CARD = 'card',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ===============================================
// AUTH TYPES
// ===============================================

export interface LoginDto {
  phone: string;
  password: string;
}

export interface RegisterDto extends CreateUserDto {
  confirm_password: string;
}

export interface TokenPayload {
  userId: string;
  phone: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}

// ===============================================
// API RESPONSE TYPES
// ===============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// ===============================================
// ERROR TYPES
// ===============================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ===============================================
// PAYMENT CATEGORIES AND PROVIDERS (Этап 4)
// ===============================================

export * from './payments';
