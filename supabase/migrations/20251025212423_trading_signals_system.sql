/*
  # Trading Signals System

  This migration creates tables for receiving and managing trading signals from multiple sources
  (TradingView, Telegram, MT4/MT5).
  
  1. New Tables
    - `signal_sources`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User who owns this signal source
      - `name` (text) - Friendly name for the source
      - `source_type` (text) - Type: tradingview, telegram, mt4, mt5
      - `config` (jsonb) - Configuration details (API keys, channel IDs, etc.)
      - `is_active` (boolean) - Whether this source is enabled
      - `webhook_url` (text) - Generated webhook URL for this source
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `trading_signals`
      - `id` (uuid, primary key)
      - `signal_source_id` (uuid, foreign key to signal_sources)
      - `signal_type` (text) - Type: buy, sell, close, modify
      - `symbol` (text) - Trading symbol/contract
      - `action` (text) - Specific action: market, limit, stop, etc.
      - `price` (numeric) - Entry price (optional for market orders)
      - `stop_loss` (numeric) - Stop loss price
      - `take_profit` (numeric) - Take profit price (can be array)
      - `quantity` (numeric) - Position size
      - `leverage` (integer) - Leverage multiplier
      - `timeframe` (text) - Chart timeframe
      - `raw_data` (jsonb) - Original signal data
      - `status` (text) - Status: received, validated, executed, failed, ignored
      - `execution_status` (text) - Execution details
      - `order_id` (text) - Broker order ID if executed
      - `received_at` (timestamptz) - When signal was received
      - `executed_at` (timestamptz) - When signal was executed
      - `error_message` (text) - Error details if failed
      
    - `signal_execution_logs`
      - `id` (uuid, primary key)
      - `signal_id` (uuid, foreign key to trading_signals)
      - `action` (text) - Action taken
      - `details` (jsonb) - Execution details
      - `success` (boolean) - Whether action succeeded
      - `message` (text) - Log message
      - `created_at` (timestamptz)
      
    - `signal_filters`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User who owns this filter
      - `signal_source_id` (uuid, foreign key to signal_sources, nullable)
      - `name` (text) - Filter name
      - `filter_type` (text) - Type: symbol, timeframe, signal_type, risk
      - `filter_rules` (jsonb) - Filter rules and conditions
      - `is_active` (boolean) - Whether filter is enabled
      - `created_at` (timestamptz)
      
  2. Indexes
    - Fast signal lookups by source, status, and time
    - Efficient filtering and execution tracking
    
  3. Security
    - Enable RLS on all tables
    - Users can only access their own signal sources and signals
    - Edge functions can insert signals with service role key
    
  4. Functions
    - `parse_tradingview_signal` - Parse TradingView webhook JSON
    - `parse_telegram_signal` - Parse Telegram message format
*/

-- Create signal_sources table
CREATE TABLE IF NOT EXISTS signal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('tradingview', 'telegram', 'mt4', 'mt5', 'custom')),
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  webhook_url text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trading_signals table
CREATE TABLE IF NOT EXISTS trading_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_source_id uuid NOT NULL REFERENCES signal_sources(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('buy', 'sell', 'close', 'modify', 'alert')),
  symbol text NOT NULL,
  action text CHECK (action IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
  price numeric,
  stop_loss numeric,
  take_profit numeric,
  take_profit_levels jsonb,
  quantity numeric,
  leverage integer DEFAULT 1,
  timeframe text,
  comment text,
  raw_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'validated', 'executing', 'executed', 'failed', 'ignored', 'cancelled')),
  execution_status text,
  order_id text,
  received_at timestamptz DEFAULT now(),
  executed_at timestamptz,
  error_message text
);

-- Create signal_execution_logs table
CREATE TABLE IF NOT EXISTS signal_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES trading_signals(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  success boolean NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Create signal_filters table
CREATE TABLE IF NOT EXISTS signal_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  signal_source_id uuid REFERENCES signal_sources(id) ON DELETE CASCADE,
  name text NOT NULL,
  filter_type text NOT NULL CHECK (filter_type IN ('symbol', 'timeframe', 'signal_type', 'risk', 'time', 'custom')),
  filter_rules jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signal_sources_user 
  ON signal_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_signal_sources_webhook 
  ON signal_sources(webhook_url) WHERE webhook_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signals_source 
  ON trading_signals(signal_source_id);

CREATE INDEX IF NOT EXISTS idx_signals_status 
  ON trading_signals(status);

CREATE INDEX IF NOT EXISTS idx_signals_received 
  ON trading_signals(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_symbol 
  ON trading_signals(symbol);

CREATE INDEX IF NOT EXISTS idx_execution_logs_signal 
  ON signal_execution_logs(signal_id);

CREATE INDEX IF NOT EXISTS idx_filters_user 
  ON signal_filters(user_id);

-- Enable Row Level Security
ALTER TABLE signal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signal_sources
CREATE POLICY "Users can view own signal sources"
  ON signal_sources FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own signal sources"
  ON signal_sources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signal sources"
  ON signal_sources FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal sources"
  ON signal_sources FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for trading_signals
CREATE POLICY "Users can view signals from own sources"
  ON trading_signals FOR SELECT
  TO authenticated
  USING (
    signal_source_id IN (
      SELECT id FROM signal_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own signals"
  ON trading_signals FOR UPDATE
  TO authenticated
  USING (
    signal_source_id IN (
      SELECT id FROM signal_sources WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    signal_source_id IN (
      SELECT id FROM signal_sources WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for signal_execution_logs
CREATE POLICY "Users can view logs for own signals"
  ON signal_execution_logs FOR SELECT
  TO authenticated
  USING (
    signal_id IN (
      SELECT ts.id FROM trading_signals ts
      JOIN signal_sources ss ON ts.signal_source_id = ss.id
      WHERE ss.user_id = auth.uid()
    )
  );

-- RLS Policies for signal_filters
CREATE POLICY "Users can manage own filters"
  ON signal_filters FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_signal_sources_updated_at
  BEFORE UPDATE ON signal_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to parse TradingView signal format
CREATE OR REPLACE FUNCTION parse_tradingview_signal(
  raw_json jsonb
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  signal_action text;
  signal_price numeric;
BEGIN
  signal_action := COALESCE(
    raw_json->>'action',
    raw_json->>'order',
    raw_json->>'side'
  );

  signal_price := COALESCE(
    (raw_json->>'price')::numeric,
    (raw_json->>'entry')::numeric,
    (raw_json->>'entryPrice')::numeric
  );

  result := jsonb_build_object(
    'action', LOWER(signal_action),
    'symbol', COALESCE(raw_json->>'ticker', raw_json->>'symbol'),
    'price', signal_price,
    'stop_loss', COALESCE((raw_json->>'stop_loss')::numeric, (raw_json->>'sl')::numeric),
    'take_profit', COALESCE((raw_json->>'take_profit')::numeric, (raw_json->>'tp')::numeric),
    'quantity', COALESCE((raw_json->>'quantity')::numeric, (raw_json->>'qty')::numeric, 1),
    'timeframe', COALESCE(raw_json->>'interval', raw_json->>'timeframe'),
    'comment', COALESCE(raw_json->>'comment', raw_json->>'message')
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;