/*
  # AI Workflow and Notifications System

  This migration adds tables for AI signal interpretation, order execution workflow,
  and notification system.
  
  1. New Tables
    - `ai_signal_interpretations`
      - `id` (uuid, primary key)
      - `signal_id` (uuid, foreign key to trading_signals)
      - `raw_signal_text` (text) - Original signal text
      - `ai_model` (text) - Model used (qwen, gpt, etc.)
      - `interpretation` (jsonb) - AI interpretation output
      - `confidence_score` (numeric) - AI confidence 0-1
      - `validation_status` (text) - Status of validation
      - `created_at` (timestamptz)
      
    - `trading_orders`
      - `id` (uuid, primary key)
      - `signal_id` (uuid, foreign key to trading_signals)
      - `interpretation_id` (uuid, foreign key to ai_signal_interpretations)
      - `account_id` (text) - Trading account ID
      - `broker_type` (text) - Broker (topstepx, projectx, etc.)
      - `instrument` (text) - Trading symbol
      - `action` (text) - BUY, SELL, CLOSE
      - `order_type` (text) - MARKET, LIMIT, STOP
      - `quantity` (numeric)
      - `price` (numeric)
      - `stop_loss` (numeric)
      - `take_profit` (numeric)
      - `risk_percentage` (numeric)
      - `priority` (text) - HIGH, MEDIUM, LOW
      - `status` (text) - PENDING, SUBMITTED, FILLED, CANCELLED, REJECTED, FAILED
      - `broker_order_id` (text) - Broker's order ID
      - `filled_quantity` (numeric)
      - `average_fill_price` (numeric)
      - `execution_time` (timestamptz)
      - `error_message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `order_modifications`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to trading_orders)
      - `modification_type` (text) - MODIFY_PRICE, MODIFY_SL, MODIFY_TP, CANCEL
      - `previous_values` (jsonb)
      - `new_values` (jsonb)
      - `reason` (text)
      - `status` (text) - PENDING, COMPLETED, FAILED
      - `created_at` (timestamptz)
      
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `type` (text) - EMAIL, PUSH, SMS
      - `category` (text) - SIGNAL_RECEIVED, ORDER_EXECUTED, ORDER_FILLED, ALERT
      - `title` (text)
      - `message` (text)
      - `data` (jsonb) - Additional notification data
      - `status` (text) - PENDING, SENT, FAILED
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)
      
    - `user_notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `email_enabled` (boolean)
      - `push_enabled` (boolean)
      - `email_address` (text)
      - `notify_on_signal_received` (boolean)
      - `notify_on_order_executed` (boolean)
      - `notify_on_order_filled` (boolean)
      - `notify_on_errors` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Indexes
    - Fast lookups by signal, order, user
    
  3. Security
    - Enable RLS on all tables
    - Users can only access their own data
*/

-- Create ai_signal_interpretations table
CREATE TABLE IF NOT EXISTS ai_signal_interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES trading_signals(id) ON DELETE CASCADE,
  raw_signal_text text NOT NULL,
  ai_model text NOT NULL DEFAULT 'qwen',
  interpretation jsonb NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'error')),
  validation_errors jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create trading_orders table
CREATE TABLE IF NOT EXISTS trading_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES trading_signals(id) ON DELETE SET NULL,
  interpretation_id uuid REFERENCES ai_signal_interpretations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  account_id text NOT NULL,
  broker_type text NOT NULL,
  instrument text NOT NULL,
  action text NOT NULL CHECK (action IN ('BUY', 'SELL', 'CLOSE', 'MODIFY')),
  order_type text NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT')),
  quantity numeric NOT NULL,
  price numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_percentage numeric,
  priority text DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'PARTIAL_FILL', 'FILLED', 'CANCELLED', 'REJECTED', 'FAILED')),
  broker_order_id text,
  filled_quantity numeric DEFAULT 0,
  average_fill_price numeric,
  execution_time timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_modifications table
CREATE TABLE IF NOT EXISTS order_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES trading_orders(id) ON DELETE CASCADE,
  modification_type text NOT NULL CHECK (modification_type IN ('MODIFY_PRICE', 'MODIFY_QUANTITY', 'MODIFY_SL', 'MODIFY_TP', 'CANCEL', 'CLOSE')),
  previous_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('EMAIL', 'PUSH', 'SMS', 'IN_APP')),
  category text NOT NULL CHECK (category IN ('SIGNAL_RECEIVED', 'ORDER_EXECUTED', 'ORDER_FILLED', 'ORDER_FAILED', 'ALERT', 'SYSTEM')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'READ')),
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  email_address text,
  notify_on_signal_received boolean DEFAULT true,
  notify_on_order_executed boolean DEFAULT true,
  notify_on_order_filled boolean DEFAULT true,
  notify_on_order_modified boolean DEFAULT true,
  notify_on_errors boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_interpretations_signal 
  ON ai_signal_interpretations(signal_id);

CREATE INDEX IF NOT EXISTS idx_trading_orders_user 
  ON trading_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_trading_orders_account 
  ON trading_orders(account_id);

CREATE INDEX IF NOT EXISTS idx_trading_orders_status 
  ON trading_orders(status);

CREATE INDEX IF NOT EXISTS idx_trading_orders_created 
  ON trading_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_modifications_order 
  ON order_modifications(order_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status 
  ON notifications(status) WHERE status = 'PENDING';

-- Enable Row Level Security
ALTER TABLE ai_signal_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_signal_interpretations
CREATE POLICY "Users can view interpretations for their signals"
  ON ai_signal_interpretations FOR SELECT
  TO authenticated
  USING (
    signal_id IN (
      SELECT ts.id FROM trading_signals ts
      JOIN signal_sources ss ON ts.signal_source_id = ss.id
      WHERE ss.user_id = auth.uid()
    )
  );

-- RLS Policies for trading_orders
CREATE POLICY "Users can view own orders"
  ON trading_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON trading_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON trading_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for order_modifications
CREATE POLICY "Users can view modifications for own orders"
  ON order_modifications FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM trading_orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create modifications for own orders"
  ON order_modifications FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM trading_orders WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can manage own notification preferences"
  ON user_notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_trading_orders_updated_at
  BEFORE UPDATE ON trading_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();