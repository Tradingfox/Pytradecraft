import { supabase } from './supabaseClient';

export interface SignalSource {
  id: string;
  user_id: string;
  name: string;
  source_type: 'tradingview' | 'telegram' | 'mt4' | 'mt5' | 'custom';
  config: Record<string, any>;
  is_active: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradingSignal {
  id: string;
  signal_source_id: string;
  signal_type: 'buy' | 'sell' | 'close' | 'modify' | 'alert';
  symbol: string;
  action: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | null;
  price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  take_profit_levels: number[] | null;
  quantity: number | null;
  leverage: number;
  timeframe: string | null;
  comment: string | null;
  raw_data: Record<string, any>;
  status: 'received' | 'validated' | 'executing' | 'executed' | 'failed' | 'ignored' | 'cancelled';
  execution_status: string | null;
  order_id: string | null;
  received_at: string;
  executed_at: string | null;
  error_message: string | null;
}

export interface SignalFilter {
  id: string;
  user_id: string;
  signal_source_id: string | null;
  name: string;
  filter_type: 'symbol' | 'timeframe' | 'signal_type' | 'risk' | 'time' | 'custom';
  filter_rules: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

class SignalService {
  async createSignalSource(
    name: string,
    sourceType: SignalSource['source_type'],
    config: Record<string, any> = {}
  ): Promise<SignalSource | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const webhookUrl = crypto.randomUUID();

      const { data, error } = await supabase
        .from('signal_sources')
        .insert({
          user_id: user.id,
          name,
          source_type: sourceType,
          config,
          webhook_url: webhookUrl,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SignalSource;
    } catch (error) {
      console.error('Error creating signal source:', error);
      return null;
    }
  }

  async getSignalSources(): Promise<SignalSource[]> {
    try {
      const { data, error } = await supabase
        .from('signal_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SignalSource[];
    } catch (error) {
      console.error('Error fetching signal sources:', error);
      return [];
    }
  }

  async updateSignalSource(
    id: string,
    updates: Partial<Omit<SignalSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('signal_sources')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating signal source:', error);
      return false;
    }
  }

  async deleteSignalSource(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('signal_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting signal source:', error);
      return false;
    }
  }

  async getSignals(filters?: {
    sourceId?: string;
    status?: TradingSignal['status'];
    symbol?: string;
    limit?: number;
  }): Promise<TradingSignal[]> {
    try {
      let query = supabase
        .from('trading_signals')
        .select('*')
        .order('received_at', { ascending: false });

      if (filters?.sourceId) {
        query = query.eq('signal_source_id', filters.sourceId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TradingSignal[];
    } catch (error) {
      console.error('Error fetching signals:', error);
      return [];
    }
  }

  async getSignalById(id: string): Promise<TradingSignal | null> {
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as TradingSignal;
    } catch (error) {
      console.error('Error fetching signal:', error);
      return null;
    }
  }

  async updateSignalStatus(
    id: string,
    status: TradingSignal['status'],
    executionStatus?: string,
    orderId?: string,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
        execution_status: executionStatus,
      };

      if (orderId) {
        updates.order_id = orderId;
      }
      if (errorMessage) {
        updates.error_message = errorMessage;
      }
      if (status === 'executed') {
        updates.executed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('trading_signals')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating signal status:', error);
      return false;
    }
  }

  async validateSignal(signal: TradingSignal): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!signal.symbol || signal.symbol.trim() === '') {
      errors.push('Symbol is required');
    }

    if (signal.signal_type === 'buy' || signal.signal_type === 'sell') {
      if (!signal.quantity || signal.quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }

      if (signal.action === 'limit' || signal.action === 'stop') {
        if (!signal.price || signal.price <= 0) {
          errors.push('Price is required for limit/stop orders');
        }
      }
    }

    if (signal.leverage && (signal.leverage < 1 || signal.leverage > 100)) {
      errors.push('Leverage must be between 1 and 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async logSignalExecution(
    signalId: string,
    action: string,
    success: boolean,
    message?: string,
    details?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('signal_execution_logs')
        .insert({
          signal_id: signalId,
          action,
          success,
          message,
          details: details || {},
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error logging signal execution:', error);
      return false;
    }
  }

  async getSignalLogs(signalId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('signal_execution_logs')
        .select('*')
        .eq('signal_id', signalId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching signal logs:', error);
      return [];
    }
  }

  async createFilter(
    name: string,
    filterType: SignalFilter['filter_type'],
    filterRules: Record<string, any>,
    signalSourceId?: string
  ): Promise<SignalFilter | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('signal_filters')
        .insert({
          user_id: user.id,
          signal_source_id: signalSourceId || null,
          name,
          filter_type: filterType,
          filter_rules: filterRules,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SignalFilter;
    } catch (error) {
      console.error('Error creating filter:', error);
      return null;
    }
  }

  async getFilters(): Promise<SignalFilter[]> {
    try {
      const { data, error } = await supabase
        .from('signal_filters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SignalFilter[];
    } catch (error) {
      console.error('Error fetching filters:', error);
      return [];
    }
  }

  async applyFilters(signal: TradingSignal, filters: SignalFilter[]): Promise<boolean> {
    for (const filter of filters) {
      if (!filter.is_active) continue;

      if (filter.signal_source_id && filter.signal_source_id !== signal.signal_source_id) {
        continue;
      }

      const { filter_type, filter_rules } = filter;

      switch (filter_type) {
        case 'symbol':
          if (filter_rules.symbols && Array.isArray(filter_rules.symbols)) {
            const allowed = filter_rules.symbols.includes(signal.symbol);
            if (filter_rules.mode === 'whitelist' && !allowed) return false;
            if (filter_rules.mode === 'blacklist' && allowed) return false;
          }
          break;

        case 'timeframe':
          if (filter_rules.timeframes && signal.timeframe) {
            if (!filter_rules.timeframes.includes(signal.timeframe)) return false;
          }
          break;

        case 'signal_type':
          if (filter_rules.types && Array.isArray(filter_rules.types)) {
            if (!filter_rules.types.includes(signal.signal_type)) return false;
          }
          break;

        case 'risk':
          if (filter_rules.max_leverage && signal.leverage > filter_rules.max_leverage) {
            return false;
          }
          if (filter_rules.max_quantity && signal.quantity && signal.quantity > filter_rules.max_quantity) {
            return false;
          }
          break;

        case 'time':
          const now = new Date();
          const currentHour = now.getHours();
          if (filter_rules.trading_hours) {
            const { start, end } = filter_rules.trading_hours;
            if (currentHour < start || currentHour >= end) return false;
          }
          break;
      }
    }

    return true;
  }

  getWebhookUrl(source: SignalSource): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return '';

    const functionName = source.source_type === 'telegram'
      ? 'receive-telegram-signal'
      : 'receive-tradingview-signal';

    return `${supabaseUrl}/functions/v1/${functionName}?id=${source.webhook_url}`;
  }
}

export const signalService = new SignalService();
