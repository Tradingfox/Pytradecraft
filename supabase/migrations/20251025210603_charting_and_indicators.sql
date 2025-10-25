/*
  # Charting and Custom Indicators Schema

  ## Description
  This migration adds support for custom indicators, chart states, and drawing tools
  for the advanced charting system.

  ## New Tables

  ### `custom_indicators`
  Stores user-defined custom indicators with their code and configuration
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text) - Indicator display name
  - `description` (text) - What the indicator does
  - `language` (text) - javascript, python, csharp, wasm
  - `code` (text) - The indicator calculation code
  - `parameters` (jsonb) - Parameter definitions
  - `outputs` (jsonb) - Output definitions
  - `category` (text) - trend, momentum, volatility, volume, custom
  - `is_public` (boolean) - Whether indicator is shared with community
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `chart_states`
  Stores saved chart configurations including indicators, drawings, and settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `contract_id` (text) - The instrument being charted
  - `name` (text) - User-defined name for this chart
  - `timeframe` (text) - 1m, 5m, 15m, etc.
  - `indicators` (jsonb) - Active indicators with their states
  - `drawings` (jsonb) - Trend lines, shapes, annotations
  - `chart_settings` (jsonb) - Colors, grid, scale settings
  - `is_default` (boolean) - Whether this is the default chart for the contract
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `drawing_templates`
  Stores reusable drawing templates and patterns
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text)
  - `drawing_type` (text) - trendline, fibonacci, pattern, etc.
  - `template_data` (jsonb)
  - `is_public` (boolean)
  - `created_at` (timestamptz)

  ### `indicator_favorites`
  Tracks which indicators users have favorited
  - `user_id` (uuid, references auth.users)
  - `indicator_id` (uuid) - Can reference custom_indicators or built-in ID
  - `indicator_type` (text) - 'custom' or 'builtin'
  - `created_at` (timestamptz)
  - Primary key: (user_id, indicator_id, indicator_type)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Public indicators/templates are readable by all authenticated users
*/

-- Create custom_indicators table
CREATE TABLE IF NOT EXISTS custom_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  language text NOT NULL CHECK (language IN ('javascript', 'python', 'csharp', 'wasm')),
  code text NOT NULL,
  parameters jsonb DEFAULT '[]'::jsonb,
  outputs jsonb DEFAULT '[]'::jsonb,
  category text NOT NULL CHECK (category IN ('trend', 'momentum', 'volatility', 'volume', 'custom')),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chart_states table
CREATE TABLE IF NOT EXISTS chart_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contract_id text NOT NULL,
  name text NOT NULL,
  timeframe text NOT NULL,
  indicators jsonb DEFAULT '[]'::jsonb,
  drawings jsonb DEFAULT '[]'::jsonb,
  chart_settings jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contract_id, name)
);

-- Create drawing_templates table
CREATE TABLE IF NOT EXISTS drawing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  drawing_type text NOT NULL,
  template_data jsonb NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indicator_favorites table
CREATE TABLE IF NOT EXISTS indicator_favorites (
  user_id uuid NOT NULL,
  indicator_id text NOT NULL,
  indicator_type text NOT NULL CHECK (indicator_type IN ('custom', 'builtin')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, indicator_id, indicator_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_indicators_user_id ON custom_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_indicators_public ON custom_indicators(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_custom_indicators_category ON custom_indicators(category);

CREATE INDEX IF NOT EXISTS idx_chart_states_user_id ON chart_states(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_states_contract ON chart_states(contract_id);
CREATE INDEX IF NOT EXISTS idx_chart_states_default ON chart_states(user_id, contract_id, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_drawing_templates_user_id ON drawing_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_templates_public ON drawing_templates(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_indicator_favorites_user ON indicator_favorites(user_id);

-- Enable Row Level Security
ALTER TABLE custom_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_indicators

-- Users can view their own indicators
CREATE POLICY "Users can view own indicators"
  ON custom_indicators FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view public indicators
CREATE POLICY "Users can view public indicators"
  ON custom_indicators FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Users can insert their own indicators
CREATE POLICY "Users can create indicators"
  ON custom_indicators FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own indicators
CREATE POLICY "Users can update own indicators"
  ON custom_indicators FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own indicators
CREATE POLICY "Users can delete own indicators"
  ON custom_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for chart_states

-- Users can view their own chart states
CREATE POLICY "Users can view own chart states"
  ON chart_states FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own chart states
CREATE POLICY "Users can create chart states"
  ON chart_states FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own chart states
CREATE POLICY "Users can update own chart states"
  ON chart_states FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own chart states
CREATE POLICY "Users can delete own chart states"
  ON chart_states FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for drawing_templates

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON drawing_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view public templates
CREATE POLICY "Users can view public templates"
  ON drawing_templates FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON drawing_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON drawing_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON drawing_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for indicator_favorites

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON indicator_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON indicator_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
  ON indicator_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_custom_indicators_updated_at BEFORE UPDATE ON custom_indicators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_states_updated_at BEFORE UPDATE ON chart_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
