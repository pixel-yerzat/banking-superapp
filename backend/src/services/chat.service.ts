import { query } from '../config/database';
import logger from '../utils/logger';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  response?: string;
  is_bot: boolean;
  created_at: Date;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

/**
 * База знаний FAQ
 */
const FAQ_DATABASE: FAQItem[] = [
  // Общие вопросы
  {
    id: 'faq-1',
    question: 'Как открыть счет?',
    answer: 'Для открытия счета используйте API endpoint POST /accounts с указанием типа счета (checking, savings, deposit, credit) и валюты (KZT, USD, EUR, RUB).',
    category: 'accounts',
    keywords: ['счет', 'открыть', 'создать', 'новый счет', 'account'],
  },
  {
    id: 'faq-2',
    question: 'Как создать карту?',
    answer: 'Используйте POST /cards с указанием account_id, card_type (debit/credit/virtual) и payment_system (visa/mastercard/mir/unionpay).',
    category: 'cards',
    keywords: ['карта', 'создать карту', 'выпустить', 'card'],
  },
  {
    id: 'faq-3',
    question: 'Как перевести деньги?',
    answer: 'Есть 2 способа: 1) По номеру телефона через POST /transactions/transfer/phone, 2) По номеру счета через POST /transactions/transfer/account.',
    category: 'transfers',
    keywords: ['перевод', 'отправить', 'деньги', 'transfer', 'отправить деньги'],
  },
  
  // Шаблоны и платежи
  {
    id: 'faq-4',
    question: 'Как создать шаблон платежа?',
    answer: 'Используйте POST /templates с указанием template_name, recipient_name, amount, currency и category.',
    category: 'templates',
    keywords: ['шаблон', 'создать шаблон', 'template', 'платеж'],
  },
  {
    id: 'faq-5',
    question: 'Как настроить автоплатеж?',
    answer: 'При создании шаблона установите is_auto_payment: true и укажите auto_payment_day (1-31) - день месяца для автоматического платежа.',
    category: 'auto-payments',
    keywords: ['автоплатеж', 'автоматический', 'регулярный', 'auto payment'],
  },
  {
    id: 'faq-6',
    question: 'Какие провайдеры доступны?',
    answer: 'Доступно 15 провайдеров: Kcell, Beeline, Activ, Tele2, Казахтелеком, Алматы Су, Алем Тас и другие. Используйте GET /providers для полного списка.',
    category: 'providers',
    keywords: ['провайдер', 'оператор', 'provider', 'услуги', 'мобильная связь'],
  },

  // Кредиты
  {
    id: 'faq-7',
    question: 'Как рассчитать кредит?',
    answer: 'Используйте калькулятор POST /loans/calculate с параметрами: principal_amount, interest_rate, term_months. Получите ежемесячный платеж и график.',
    category: 'loans',
    keywords: ['кредит', 'займ', 'рассчитать', 'калькулятор', 'loan'],
  },
  {
    id: 'faq-8',
    question: 'Как подать заявку на кредит?',
    answer: 'Используйте POST /loans с указанием loan_type (consumer/mortgage/car/business), principal_amount, interest_rate, term_months.',
    category: 'loans',
    keywords: ['заявка', 'кредит', 'оформить', 'получить кредит'],
  },
  {
    id: 'faq-9',
    question: 'Как досрочно погасить кредит?',
    answer: 'Используйте POST /loans/:loanId/early-repay с указанием account_id. Будет списана вся оставшаяся сумма.',
    category: 'loans',
    keywords: ['досрочно', 'погасить', 'закрыть кредит', 'early repayment'],
  },

  // Депозиты
  {
    id: 'faq-10',
    question: 'Какие типы депозитов есть?',
    answer: 'Доступны 3 типа: fixed (фиксированный, сложные проценты), flexible (гибкий, простые проценты), savings (накопительный, простые проценты).',
    category: 'deposits',
    keywords: ['депозит', 'вклад', 'типы', 'deposit'],
  },
  {
    id: 'faq-11',
    question: 'Как открыть депозит?',
    answer: 'Используйте POST /deposits с параметрами: account_id, deposit_type, principal_amount, interest_rate, term_months, is_auto_renewal.',
    category: 'deposits',
    keywords: ['открыть депозит', 'вклад', 'deposit'],
  },
  {
    id: 'faq-12',
    question: 'Что такое автопролонгация?',
    answer: 'Автопролонгация - автоматическое продление депозита на новый срок. При is_auto_renewal: true депозит продлевается с суммой + проценты.',
    category: 'deposits',
    keywords: ['автопролонгация', 'продление', 'renewal', 'автоматическое'],
  },

  // Безопасность
  {
    id: 'faq-13',
    question: 'Как включить 2FA?',
    answer: 'Используйте POST /auth/2fa/enable. Получите secret_key и настройте приложение-аутентификатор (Google Authenticator, Authy). Подтвердите через POST /auth/2fa/verify.',
    category: 'security',
    keywords: ['2fa', 'двухфакторная', 'безопасность', 'аутентификация'],
  },
  {
    id: 'faq-14',
    question: 'Как сменить пароль?',
    answer: 'Используйте POST /auth/change-password с указанием old_password и new_password.',
    category: 'security',
    keywords: ['пароль', 'сменить', 'изменить', 'password'],
  },

  // Аналитика
  {
    id: 'faq-15',
    question: 'Как посмотреть статистику расходов?',
    answer: 'Используйте GET /analytics/spending?period=month для анализа за месяц. Доступны периоды: day, week, month, year.',
    category: 'analytics',
    keywords: ['статистика', 'расходы', 'аналитика', 'spending'],
  },

  // Техническая поддержка
  {
    id: 'faq-16',
    question: 'Что делать если недостаточно средств?',
    answer: 'Ошибка "Insufficient funds" означает, что на счету недостаточно денег для операции. Пополните счет или выберите счет с большим балансом.',
    category: 'troubleshooting',
    keywords: ['ошибка', 'недостаточно', 'средств', 'insufficient funds'],
  },
  {
    id: 'faq-17',
    question: 'Что делать если токен истек?',
    answer: 'Используйте POST /auth/refresh с refresh_token для получения нового access_token. Если refresh_token тоже истек - авторизуйтесь заново.',
    category: 'troubleshooting',
    keywords: ['токен', 'истек', 'expired', 'token'],
  },
];

/**
 * Поиск в FAQ по ключевым словам
 */
const searchFAQ = (query: string): FAQItem[] => {
  const normalizedQuery = query.toLowerCase();
  const words = normalizedQuery.split(' ').filter(w => w.length > 2);

  const results = FAQ_DATABASE.map(faq => {
    let score = 0;

    // Проверяем вопрос
    if (faq.question.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }

    // Проверяем ключевые слова
    faq.keywords.forEach(keyword => {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 5;
      }
    });

    // Проверяем отдельные слова
    words.forEach(word => {
      if (faq.question.toLowerCase().includes(word)) {
        score += 2;
      }
      faq.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(word)) {
          score += 1;
        }
      });
    });

    return { faq, score };
  });

  // Сортируем по релевантности
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.faq);
};

/**
 * Генерация ответа бота
 */
const generateBotResponse = (userMessage: string): string => {
  const faqResults = searchFAQ(userMessage);

  if (faqResults.length === 0) {
    return 'К сожалению, я не нашел ответа на ваш вопрос. Попробуйте переформулировать или обратитесь в техподдержку.';
  }

  if (faqResults.length === 1) {
    return `${faqResults[0].answer}\n\nЕсли этот ответ не помог, попробуйте переформулировать вопрос или обратитесь в поддержку.`;
  }

  // Несколько результатов
  let response = 'Нашел несколько ответов на ваш вопрос:\n\n';
  faqResults.forEach((faq, index) => {
    response += `${index + 1}. ${faq.question}\n${faq.answer}\n\n`;
  });
  response += 'Если ни один из ответов не подошел, обратитесь в поддержку.';

  return response;
};

/**
 * Сохранение сообщения в БД
 */
export const saveMessage = async (
  userId: string,
  message: string,
  isBot: boolean = false,
  response?: string
): Promise<ChatMessage> => {
  try {
    const result = await query(
      `INSERT INTO chat_messages (user_id, message, response, is_bot)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, message, response || null, isBot]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error saving chat message:', error);
    throw error;
  }
};

/**
 * Обработка сообщения пользователя
 */
export const processUserMessage = async (
  userId: string,
  message: string
): Promise<{ userMessage: ChatMessage; botResponse: ChatMessage }> => {
  try {
    // Сохраняем сообщение пользователя
    const userMessage = await saveMessage(userId, message, false);

    // Генерируем ответ бота
    const botResponseText = generateBotResponse(message);

    // Сохраняем ответ бота
    const botResponse = await saveMessage(userId, botResponseText, true);

    logger.info('Chat message processed', {
      userId,
      messageLength: message.length,
    });

    return { userMessage, botResponse };
  } catch (error) {
    logger.error('Error processing user message:', error);
    throw error;
  }
};

/**
 * Получение истории чата
 */
export const getChatHistory = async (
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> => {
  try {
    const result = await query(
      `SELECT * FROM chat_messages 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.reverse(); // Возвращаем в хронологическом порядке
  } catch (error) {
    logger.error('Error getting chat history:', error);
    throw error;
  }
};

/**
 * Очистка истории чата
 */
export const clearChatHistory = async (userId: string): Promise<void> => {
  try {
    await query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);

    logger.info('Chat history cleared', { userId });
  } catch (error) {
    logger.error('Error clearing chat history:', error);
    throw error;
  }
};

/**
 * Получение всех FAQ
 */
export const getAllFAQ = (): FAQItem[] => {
  return FAQ_DATABASE;
};

/**
 * Получение FAQ по категории
 */
export const getFAQByCategory = (category: string): FAQItem[] => {
  return FAQ_DATABASE.filter(faq => faq.category === category);
};

/**
 * Поиск FAQ
 */
export const searchFAQPublic = (query: string): FAQItem[] => {
  return searchFAQ(query);
};

/**
 * Статистика чата
 */
export const getChatStats = async (
  userId: string
): Promise<{
  total_messages: number;
  user_messages: number;
  bot_messages: number;
}> => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN is_bot = false THEN 1 END) as user_messages,
        COUNT(CASE WHEN is_bot = true THEN 1 END) as bot_messages
       FROM chat_messages 
       WHERE user_id = $1`,
      [userId]
    );

    return {
      total_messages: parseInt(result.rows[0].total_messages),
      user_messages: parseInt(result.rows[0].user_messages),
      bot_messages: parseInt(result.rows[0].bot_messages),
    };
  } catch (error) {
    logger.error('Error getting chat stats:', error);
    throw error;
  }
};

export default {
  processUserMessage,
  getChatHistory,
  clearChatHistory,
  getAllFAQ,
  getFAQByCategory,
  searchFAQPublic,
  getChatStats,
};
