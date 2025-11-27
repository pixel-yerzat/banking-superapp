// Добавляем новые типы для Этапа 4
import { Currency } from './index';

/**
 * Категории платежей
 */
export enum PaymentCategory {
  UTILITIES = 'utilities', // Коммунальные услуги
  INTERNET = 'internet', // Интернет
  MOBILE = 'mobile', // Мобильная связь
  TV = 'tv', // Телевидение
  INSURANCE = 'insurance', // Страхование
  LOAN = 'loan', // Кредиты
  EDUCATION = 'education', // Образование
  HEALTHCARE = 'healthcare', // Здравоохранение
  GOVERNMENT = 'government', // Госуслуги
  CHARITY = 'charity', // Благотворительность
  ENTERTAINMENT = 'entertainment', // Развлечения
  TRANSPORT = 'transport', // Транспорт
  OTHER = 'other', // Прочее
}

/**
 * Провайдеры услуг (заглушки, в реальности будет интеграция)
 */
export interface ServiceProvider {
  id: string;
  name: string;
  category: PaymentCategory;
  logo_url?: string;
  description?: string;
  fields: PaymentField[]; // Поля для заполнения при оплате
  commission?: number; // Комиссия в процентах
  min_amount?: number;
  max_amount?: number;
}

/**
 * Поля для заполнения при оплате
 */
export interface PaymentField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'phone' | 'email' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // Для select
  validation?: string; // Regex для валидации
}

/**
 * Шаблон платежа (обновленный)
 */
export interface PaymentTemplate {
  id: string;
  user_id: string;
  template_name: string;
  recipient_name: string;
  recipient_account?: string;
  recipient_phone?: string;
  amount?: number;
  currency: Currency;
  category: PaymentCategory;
  description?: string;
  is_auto_payment: boolean;
  auto_payment_day?: number; // День месяца для автоплатежа (1-31)
  provider_id?: string; // ID провайдера услуг
  payment_data?: Record<string, any>; // Дополнительные данные для провайдера
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO для создания шаблона
 */
export interface CreatePaymentTemplateDto {
  template_name: string;
  recipient_name: string;
  recipient_account?: string;
  recipient_phone?: string;
  amount?: number;
  currency: Currency;
  category: PaymentCategory;
  description?: string;
  is_auto_payment?: boolean;
  auto_payment_day?: number;
  provider_id?: string;
  payment_data?: Record<string, any>;
}

/**
 * DTO для обновления шаблона
 */
export interface UpdatePaymentTemplateDto {
  template_name?: string;
  recipient_name?: string;
  recipient_account?: string;
  recipient_phone?: string;
  amount?: number;
  description?: string;
  is_auto_payment?: boolean;
  auto_payment_day?: number;
}

/**
 * История автоплатежей
 */
export interface AutoPaymentExecution {
  id: string;
  template_id: string;
  transaction_id: string;
  execution_date: Date;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
}

/**
 * Статистика по категориям
 */
export interface CategoryStats {
  category: PaymentCategory;
  count: number;
  total_amount: number;
  currency: Currency;
  percentage: number;
}

/**
 * Анализ расходов
 */
export interface SpendingAnalysis {
  period: 'day' | 'week' | 'month' | 'year';
  start_date: Date;
  end_date: Date;
  total_spent: number;
  total_received: number;
  by_category: CategoryStats[];
  top_recipients: {
    name: string;
    amount: number;
    count: number;
  }[];
  daily_average: number;
  monthly_average: number;
}
