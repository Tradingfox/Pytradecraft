/*
  # Historical Market Data Caching System

  This migration creates tables for storing and efficiently querying historical market data (OHLCV).
  
  1. New Tables
    - `instruments`
      - `id` (uuid, primary key)
      - `symbol` (text, unique) - Contract symbol (e.g., "ES", "NQ")
      - `name` (text) - Full instrument name
      - `exchange` (text) - Exchange/market
      - `instrument_type` (text) - Type (futures, stocks, options, etc.)
      - `metadata` (jsonb) - Additional instrument details
      - `created_at` (timestamptz)
      
    - `ohlcv_data`
      - `id` (uuid, primary key)
      - `instrument_id` (uuid, foreign key to instruments)
      - `timeframe` (text) - Chart timeframe (1m, 5m, 15m, 1h, 4h, 1d, etc.)
      - `bar_timestamp` (timestamptz) - Bar timestamp
      - `open` (numeric) - Open price
      - `high` (numeric) - High price
      - `low` (numeric) - Low price
      - `close` (numeric) - Close price
      - `volume` (bigint) - Trading volume
      - `created_at` (timestamptz)
      - Composite unique constraint on (instrument_id, timeframe, bar_timestamp)
      
    - `data_sync_status`
      - `id` (uuid, primary key)
      - `instrument_id` (uuid, foreign key to instruments)
      - `timeframe` (text)
      - `last_sync_timestamp` (timestamptz) - Last bar synced
      - `last_sync_at` (timestamptz) - When sync occurred
      - `sync_status` (text) - Status (synced, syncing, failed)
      - `error_message` (text) - Error details if failed
      - Composite unique constraint on (instrument_id, timeframe)
      
  2. Indexes
    - Fast queries by instrument + timeframe + time range
    - Efficient sync status lookups
    
  3. Security
    - Enable RLS on all tables
    - Authenticated users can read all data
    - Only authenticated users can insert/update data (for sync services)
    
  4. Functions
    - `get_latest_bar` - Get the most recent bar for an instrument/timeframe
    - `get_ohlcv_range` - Get bars within a date range
*/

-- Create instruments table
CREATE TABLE IF NOT EXISTS instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  name text NOT NULL,
  exchange text NOT NULL DEFAULT '',
  instrument_type text NOT NULL DEFAULT 'futures',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create OHLCV data table
CREATE TABLE IF NOT EXISTS ohlcv_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  timeframe text NOT NULL,
  bar_timestamp timestamptz NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_ohlcv_bar UNIQUE (instrument_id, timeframe, bar_timestamp)
);

-- Create data sync status table
CREATE TABLE IF NOT EXISTS data_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  timeframe text NOT NULL,
  last_sync_timestamp timestamptz,
  last_sync_at timestamptz DEFAULT now(),
  sync_status text NOT NULL DEFAULT 'pending',
  error_message text,
  CONSTRAINT unique_sync_status UNIQUE (instrument_id, timeframe)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ohlcv_instrument_timeframe 
  ON ohlcv_data(instrument_id, timeframe);

CREATE INDEX IF NOT EXISTS idx_ohlcv_timestamp 
  ON ohlcv_data(bar_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ohlcv_lookup 
  ON ohlcv_data(instrument_id, timeframe, bar_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_instruments_symbol 
  ON instruments(symbol);

CREATE INDEX IF NOT EXISTS idx_sync_status_lookup 
  ON data_sync_status(instrument_id, timeframe);

-- Enable Row Level Security
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ohlcv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instruments
CREATE POLICY "Authenticated users can read instruments"
  ON instruments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert instruments"
  ON instruments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update instruments"
  ON instruments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for ohlcv_data
CREATE POLICY "Authenticated users can read OHLCV data"
  ON ohlcv_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert OHLCV data"
  ON ohlcv_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update OHLCV data"
  ON ohlcv_data FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for data_sync_status
CREATE POLICY "Authenticated users can read sync status"
  ON data_sync_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync status"
  ON data_sync_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sync status"
  ON data_sync_status FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Helper function to get latest bar
CREATE OR REPLACE FUNCTION get_latest_bar(
  p_instrument_id uuid,
  p_timeframe text
)
RETURNS TABLE (
  bar_timestamp timestamptz,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.bar_timestamp,
    o.open,
    o.high,
    o.low,
    o.close,
    o.volume
  FROM ohlcv_data o
  WHERE o.instrument_id = p_instrument_id
    AND o.timeframe = p_timeframe
  ORDER BY o.bar_timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get OHLCV range
CREATE OR REPLACE FUNCTION get_ohlcv_range(
  p_instrument_id uuid,
  p_timeframe text,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS TABLE (
  bar_timestamp timestamptz,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.bar_timestamp,
    o.open,
    o.high,
    o.low,
    o.close,
    o.volume
  FROM ohlcv_data o
  WHERE o.instrument_id = p_instrument_id
    AND o.timeframe = p_timeframe
    AND o.bar_timestamp >= p_start_time
    AND o.bar_timestamp <= p_end_time
  ORDER BY o.bar_timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;