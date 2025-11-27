import { ServiceProvider, PaymentCategory, PaymentField } from '../types';
import logger from '../utils/logger';

/**
 * База данных провайдеров услуг (в реальности - из БД или внешнего API)
 */
const serviceProviders: ServiceProvider[] = [
  // ===== КОММУНАЛЬНЫЕ УСЛУГИ =====
  {
    id: 'almaty-su',
    name: 'Алматы Су',
    category: PaymentCategory.UTILITIES,
    description: 'Оплата воды в Алматы',
    fields: [
      {
        name: 'account_number',
        label: 'Лицевой счет',
        type: 'number',
        required: true,
        placeholder: '12345678',
        validation: '^\\d{8}$',
      },
      {
        name: 'period',
        label: 'Период',
        type: 'text',
        required: true,
        placeholder: '01.2024',
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 100000,
  },
  {
    id: 'alem-tas',
    name: 'Алем Тас',
    category: PaymentCategory.UTILITIES,
    description: 'Вывоз мусора',
    fields: [
      {
        name: 'account_number',
        label: 'Номер договора',
        type: 'text',
        required: true,
      },
    ],
    commission: 0,
    min_amount: 50,
    max_amount: 10000,
  },

  // ===== ИНТЕРНЕТ =====
  {
    id: 'beeline-internet',
    name: 'Beeline Домашний Интернет',
    category: PaymentCategory.INTERNET,
    description: 'Оплата интернета Beeline',
    fields: [
      {
        name: 'account_number',
        label: 'Номер договора',
        type: 'text',
        required: true,
        placeholder: '10000012345',
      },
    ],
    commission: 0,
    min_amount: 1000,
    max_amount: 50000,
  },
  {
    id: 'kazakhtelecom',
    name: 'Казахтелеком',
    category: PaymentCategory.INTERNET,
    description: 'Интернет и телефония',
    fields: [
      {
        name: 'phone_number',
        label: 'Номер телефона',
        type: 'phone',
        required: true,
        placeholder: '+77xxxxxxxxx',
      },
    ],
    commission: 1,
    min_amount: 500,
    max_amount: 100000,
  },

  // ===== МОБИЛЬНАЯ СВЯЗЬ =====
  {
    id: 'kcell',
    name: 'Kcell',
    category: PaymentCategory.MOBILE,
    description: 'Пополнение счета Kcell',
    fields: [
      {
        name: 'phone_number',
        label: 'Номер телефона',
        type: 'phone',
        required: true,
        placeholder: '+7705xxxxxxx',
        validation: '^\\+7705\\d{7}$',
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 50000,
  },
  {
    id: 'activ',
    name: 'Activ',
    category: PaymentCategory.MOBILE,
    description: 'Пополнение счета Activ',
    fields: [
      {
        name: 'phone_number',
        label: 'Номер телефона',
        type: 'phone',
        required: true,
        placeholder: '+7777xxxxxxx',
        validation: '^\\+7777\\d{7}$',
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 50000,
  },
  {
    id: 'beeline-mobile',
    name: 'Beeline',
    category: PaymentCategory.MOBILE,
    description: 'Пополнение счета Beeline',
    fields: [
      {
        name: 'phone_number',
        label: 'Номер телефона',
        type: 'phone',
        required: true,
        placeholder: '+7700xxxxxxx',
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 50000,
  },
  {
    id: 'tele2',
    name: 'Tele2',
    category: PaymentCategory.MOBILE,
    description: 'Пополнение счета Tele2',
    fields: [
      {
        name: 'phone_number',
        label: 'Номер телефона',
        type: 'phone',
        required: true,
        placeholder: '+7700xxxxxxx',
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 50000,
  },

  // ===== ТЕЛЕВИДЕНИЕ =====
  {
    id: 'beeline-tv',
    name: 'Beeline TV',
    category: PaymentCategory.TV,
    description: 'Оплата телевидения',
    fields: [
      {
        name: 'contract_number',
        label: 'Номер договора',
        type: 'text',
        required: true,
      },
    ],
    commission: 0,
    min_amount: 1000,
    max_amount: 20000,
  },
  {
    id: 'alma-tv',
    name: 'Alma TV',
    category: PaymentCategory.TV,
    description: 'Кабельное телевидение',
    fields: [
      {
        name: 'account_number',
        label: 'Лицевой счет',
        type: 'text',
        required: true,
      },
    ],
    commission: 0,
    min_amount: 500,
    max_amount: 10000,
  },

  // ===== СТРАХОВАНИЕ =====
  {
    id: 'nomad-insurance',
    name: 'Nomad Insurance',
    category: PaymentCategory.INSURANCE,
    description: 'Страховые взносы',
    fields: [
      {
        name: 'policy_number',
        label: 'Номер полиса',
        type: 'text',
        required: true,
      },
      {
        name: 'iin',
        label: 'ИИН',
        type: 'number',
        required: true,
        validation: '^\\d{12}$',
      },
    ],
    commission: 0,
    min_amount: 1000,
    max_amount: 500000,
  },

  // ===== ОБРАЗОВАНИЕ =====
  {
    id: 'kundelik-kz',
    name: 'Kündelik.kz',
    category: PaymentCategory.EDUCATION,
    description: 'Оплата школьного питания',
    fields: [
      {
        name: 'student_id',
        label: 'ID ученика',
        type: 'text',
        required: true,
      },
    ],
    commission: 0,
    min_amount: 1000,
    max_amount: 50000,
  },

  // ===== ГОСУСЛУГИ =====
  {
    id: 'egov-kz',
    name: 'eGov.kz',
    category: PaymentCategory.GOVERNMENT,
    description: 'Оплата госуслуг',
    fields: [
      {
        name: 'iin',
        label: 'ИИН',
        type: 'number',
        required: true,
        validation: '^\\d{12}$',
      },
      {
        name: 'service_code',
        label: 'Код услуги',
        type: 'text',
        required: true,
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 1000000,
  },

  // ===== ТРАНСПОРТ =====
  {
    id: 'almaty-transport',
    name: 'Алматы Транспорт',
    category: PaymentCategory.TRANSPORT,
    description: 'Пополнение транспортной карты',
    fields: [
      {
        name: 'card_number',
        label: 'Номер карты',
        type: 'text',
        required: true,
      },
    ],
    commission: 0,
    min_amount: 100,
    max_amount: 10000,
  },
];

/**
 * Получение всех провайдеров
 */
export const getAllProviders = async (): Promise<ServiceProvider[]> => {
  try {
    return serviceProviders;
  } catch (error) {
    logger.error('Error getting all providers:', error);
    throw error;
  }
};

/**
 * Получение провайдеров по категории
 */
export const getProvidersByCategory = async (
  category: PaymentCategory
): Promise<ServiceProvider[]> => {
  try {
    return serviceProviders.filter(p => p.category === category);
  } catch (error) {
    logger.error('Error getting providers by category:', error);
    throw error;
  }
};

/**
 * Получение провайдера по ID
 */
export const getProviderById = async (
  providerId: string
): Promise<ServiceProvider | null> => {
  try {
    const provider = serviceProviders.find(p => p.id === providerId);
    return provider || null;
  } catch (error) {
    logger.error('Error getting provider by ID:', error);
    throw error;
  }
};

/**
 * Поиск провайдеров
 */
export const searchProviders = async (
  searchQuery: string
): Promise<ServiceProvider[]> => {
  try {
    const query = searchQuery.toLowerCase();
    return serviceProviders.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  } catch (error) {
    logger.error('Error searching providers:', error);
    throw error;
  }
};

/**
 * Получение популярных провайдеров
 */
export const getPopularProviders = async (
  limit: number = 10
): Promise<ServiceProvider[]> => {
  try {
    // В реальности - по статистике платежей
    // Сейчас просто возвращаем первые N
    return serviceProviders.slice(0, limit);
  } catch (error) {
    logger.error('Error getting popular providers:', error);
    throw error;
  }
};

/**
 * Валидация данных платежа для провайдера
 */
export const validatePaymentData = (
  provider: ServiceProvider,
  paymentData: Record<string, any>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  provider.fields.forEach(field => {
    const value = paymentData[field.name];

    // Проверка обязательности
    if (field.required && (!value || value === '')) {
      errors.push(`${field.label} is required`);
      return;
    }

    // Проверка по regex
    if (value && field.validation) {
      const regex = new RegExp(field.validation);
      if (!regex.test(value)) {
        errors.push(`${field.label} has invalid format`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Расчет комиссии
 */
export const calculateCommission = (
  provider: ServiceProvider,
  amount: number
): number => {
  if (!provider.commission) return 0;
  return (amount * provider.commission) / 100;
};

/**
 * Валидация суммы платежа
 */
export const validateAmount = (
  provider: ServiceProvider,
  amount: number
): { valid: boolean; error?: string } => {
  if (provider.min_amount && amount < provider.min_amount) {
    return {
      valid: false,
      error: `Minimum amount is ${provider.min_amount}`,
    };
  }

  if (provider.max_amount && amount > provider.max_amount) {
    return {
      valid: false,
      error: `Maximum amount is ${provider.max_amount}`,
    };
  }

  return { valid: true };
};

export default {
  getAllProviders,
  getProvidersByCategory,
  getProviderById,
  searchProviders,
  getPopularProviders,
  validatePaymentData,
  calculateCommission,
  validateAmount,
};
