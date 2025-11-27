-- ===============================================
-- МИГРАЦИЯ: Добавление таблиц для уведомлений и чата (Этап 6)
-- ===============================================

-- ===============================================
-- 1. NOTIFICATION_SETTINGS (Настройки уведомлений)
-- ===============================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Каналы уведомлений
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    
    -- Типы уведомлений
    transaction_notifications BOOLEAN DEFAULT true,
    security_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    system_notifications BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- ===============================================
-- 2. CHAT_MESSAGES (Сообщения чата)
-- ===============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    is_bot BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ===============================================
-- ТРИГГЕРЫ
-- ===============================================

-- Триггер для notification_settings
CREATE TRIGGER update_notification_settings_updated_at 
BEFORE UPDATE ON notification_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- ПРИМЕЧАНИЯ
-- ===============================================
-- Эта миграция добавляет таблицы для:
-- 1. notification_settings - настройки уведомлений пользователя
-- 2. chat_messages - история чата с ботом
--
-- Запуск миграции:
-- psql -U postgres -d banking_superapp -f database/migrations/006_notifications_chat.sql
