-- ===============================================
-- BANKING SUPERAPP DATABASE SCHEMA
-- PostgreSQL 14+
-- ===============================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- 1. USERS (Пользователи)
-- ===============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    iin VARCHAR(12), -- ИИН для Казахстана
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending', 'suspended')),
    is_verified BOOLEAN DEFAULT false,
    is_2fa_enabled BOOLEAN DEFAULT false,
    pin_code_hash VARCHAR(255), -- PIN для быстрого входа
    biometric_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP
);

-- Индексы для users
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- ===============================================
-- 2. REFRESH TOKENS (Токены обновления)
-- ===============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_info JSONB, -- Информация об устройстве
    ip_address INET
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ===============================================
-- 3. OTP CODES (Коды двухфакторной аутентификации)
-- ===============================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sms', 'email', '2fa')),
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'registration', 'password_reset', 'transaction')),
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_code ON otp_codes(code);

-- ===============================================
-- 4. ACCOUNTS (Счета)
-- ===============================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings', 'deposit', 'credit')),
    currency VARCHAR(3) NOT NULL DEFAULT 'KZT', -- KZT, USD, EUR, RUB
    balance DECIMAL(18, 2) DEFAULT 0.00 CHECK (balance >= 0),
    available_balance DECIMAL(18, 2) DEFAULT 0.00, -- Доступный баланс (с учетом блокировок)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'closed')),
    interest_rate DECIMAL(5, 2) DEFAULT 0.00, -- Для депозитов
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);

-- ===============================================
-- 5. CARDS (Банковские карты)
-- ===============================================
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    card_number VARCHAR(16) UNIQUE NOT NULL,
    card_holder_name VARCHAR(100) NOT NULL,
    card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('debit', 'credit', 'virtual')),
    payment_system VARCHAR(20) NOT NULL CHECK (payment_system IN ('visa', 'mastercard', 'mir', 'unionpay')),
    expiry_date DATE NOT NULL,
    cvv_hash VARCHAR(255) NOT NULL, -- Хешированный CVV
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'expired', 'lost')),
    daily_limit DECIMAL(18, 2),
    monthly_limit DECIMAL(18, 2),
    is_contactless BOOLEAN DEFAULT true,
    is_online_payments BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cards_account_id ON cards(account_id);
CREATE INDEX idx_cards_card_number ON cards(card_number);
CREATE INDEX idx_cards_status ON cards(status);

-- ===============================================
-- 6. TRANSACTIONS (Транзакции)
-- ===============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_account_id UUID REFERENCES accounts(id),
    to_account_id UUID REFERENCES accounts(id),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'transfer', 'payment', 'deposit', 'withdrawal', 'fee', 'interest', 'cashback', 'refund'
    )),
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
    fee DECIMAL(18, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    reference_number VARCHAR(50) UNIQUE,
    metadata JSONB, -- Дополнительные данные (получатель, категория и т.д.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Проверка: хотя бы один счет должен быть указан
    CONSTRAINT check_accounts CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL)
);

CREATE INDEX idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_number);

-- ===============================================
-- 7. PAYMENT TEMPLATES (Шаблоны платежей)
-- ===============================================
CREATE TABLE payment_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_account VARCHAR(100),
    recipient_phone VARCHAR(20),
    amount DECIMAL(18, 2),
    currency VARCHAR(3) DEFAULT 'KZT',
    category VARCHAR(50), -- коммуналка, связь, интернет и т.д.
    description TEXT,
    is_auto_payment BOOLEAN DEFAULT false,
    auto_payment_day INTEGER CHECK (auto_payment_day BETWEEN 1 AND 31),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_templates_user_id ON payment_templates(user_id);

-- ===============================================
-- 8. LOANS (Кредиты)
-- ===============================================
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id), -- Счет для выдачи кредита
    loan_type VARCHAR(30) NOT NULL CHECK (loan_type IN ('consumer', 'mortgage', 'car', 'business')),
    principal_amount DECIMAL(18, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate DECIMAL(5, 2) NOT NULL,
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(18, 2) NOT NULL,
    remaining_balance DECIMAL(18, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paid_off', 'defaulted')),
    disbursement_date DATE,
    maturity_date DATE,
    next_payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);

-- ===============================================
-- 9. LOAN PAYMENTS (Платежи по кредитам)
-- ===============================================
CREATE TABLE loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    principal_amount DECIMAL(18, 2) NOT NULL,
    interest_amount DECIMAL(18, 2) NOT NULL,
    payment_type VARCHAR(20) CHECK (payment_type IN ('scheduled', 'early', 'full')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_payments_loan_id ON loan_payments(loan_id);

-- ===============================================
-- 10. DEPOSITS (Депозиты/Вклады)
-- ===============================================
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    deposit_type VARCHAR(30) NOT NULL CHECK (deposit_type IN ('fixed', 'flexible', 'savings')),
    principal_amount DECIMAL(18, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate DECIMAL(5, 2) NOT NULL,
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    current_balance DECIMAL(18, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'matured')),
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    is_auto_renewal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);

-- ===============================================
-- 11. NOTIFICATIONS (Уведомления)
-- ===============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN (
        'transaction', 'security', 'marketing', 'system', 'loan_payment', 'card'
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ===============================================
-- 12. AUDIT LOGS (Журнал аудита)
-- ===============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- users, accounts, transactions и т.д.
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    changes JSONB, -- Что изменилось
    status VARCHAR(20) CHECK (status IN ('success', 'failure')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ===============================================
-- TRIGGERS (Триггеры для автообновления updated_at)
-- ===============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггеры
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_templates_updated_at BEFORE UPDATE ON payment_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- VIEWS (Представления для удобства)
-- ===============================================

-- Представление для баланса пользователя по всем счетам
CREATE OR REPLACE VIEW user_total_balance AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    a.currency,
    SUM(a.balance) as total_balance,
    COUNT(a.id) as accounts_count
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
WHERE a.status = 'active'
GROUP BY u.id, u.first_name, u.last_name, a.currency;

-- Представление для последних транзакций
CREATE OR REPLACE VIEW recent_transactions AS
SELECT 
    t.*,
    u.first_name || ' ' || u.last_name as user_name,
    fa.account_number as from_account_number,
    ta.account_number as to_account_number
FROM transactions t
LEFT JOIN accounts fa ON t.from_account_id = fa.id
LEFT JOIN accounts ta ON t.to_account_id = ta.id
LEFT JOIN users u ON fa.user_id = u.id OR ta.user_id = u.id
ORDER BY t.created_at DESC;

-- ===============================================
-- INITIAL DATA (Начальные данные)
-- ===============================================

-- Создаем системного пользователя для внутренних операций
INSERT INTO users (
    id, 
    phone, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    status, 
    is_verified
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '+77000000000',
    'system@bank.com',
    'system',
    'System',
    'Account',
    'active',
    true
);

COMMENT ON TABLE users IS 'Таблица пользователей банковского приложения';
COMMENT ON TABLE accounts IS 'Банковские счета пользователей';
COMMENT ON TABLE cards IS 'Банковские карты, привязанные к счетам';
COMMENT ON TABLE transactions IS 'История всех финансовых транзакций';
COMMENT ON TABLE loans IS 'Кредитные продукты пользователей';
COMMENT ON TABLE deposits IS 'Депозиты и вклады пользователей';
