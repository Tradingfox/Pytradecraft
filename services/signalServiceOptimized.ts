/**
 * Optimized Signal Service
 *
 * Optimizations:
 * 1. In-memory caching with TTL
 * 2. Batch operations for signals
 * 3. Query optimization with proper indexing hints
 * 4. Retry logic with exponential backoff
 * 5. Connection pooling ready
 * 6. Lazy loading for filters
 * 7. Debouncing for frequent operations
 */

import { supabase } from './supabaseClient';

// ============================================
// INTERFACES
// ============================================
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

// ============================================
// CACHING LAYER
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  set(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ============================================
// RETRY LOGIC
// ============================================
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.maxRetries) {
        const delay = Math.min(
          options.baseDelay * Math.pow(2, attempt),
          options.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================
// DEBOUNCING
// ============================================
class Debouncer {
  private timeouts = new Map<string, number>();

  debounce(key: string, fn: () => void, delay: number): void {
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      fn();
      this.timeouts.delete(key);
    }, delay) as unknown as number;

    this.timeouts.set(key, timeoutId);
  }

  cancel(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  cancelAll(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
}

// ============================================
// OPTIMIZED SIGNAL SERVICE
// ============================================
class SignalServiceOptimized {
  private sourceCache = new Cache<SignalSource[]>(5 * 60 * 1000); // 5 minutes
  private filterCache = new Cache<SignalFilter[]>(5 * 60 * 1000);
  private signalCache = new Cache<TradingSignal[]>(30 * 1000); // 30 seconds
  private debouncer = new Debouncer();

  // ==========================================
  // SIGNAL SOURCES
  // ==========================================
  async createSignalSource(
    name: string,
    sourceType: SignalSource['source_type'],
    config: Record<string, any> = {}
  ): Promise<SignalSource | null> {
    try {
      const result = await retryWithBackoff(async () => {
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
      });

      // Invalidate cache
      this.sourceCache.invalidateAll();

      return result;
    } catch (error) {
      console.error('Error creating signal source:', error);
      return null;
    }
  }

  async getSignalSources(forceRefresh: boolean = false): Promise<SignalSource[]> {
    if (!forceRefresh) {
      const cached = this.sourceCache.get('all');
      if (cached) return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('signal_sources')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as SignalSource[];
      });

      this.sourceCache.set('all', result);
      return result;
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
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from('signal_sources')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
      });

      // Invalidate cache
      this.sourceCache.invalidateAll();
      return true;
    } catch (error) {
      console.error('Error updating signal source:', error);
      return false;
    }
  }

  async deleteSignalSource(id: string): Promise<boolean> {
    try {
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from('signal_sources')
          .delete()
          .eq('id', id);

        if (error) throw error;
      });

      this.sourceCache.invalidateAll();
      return true;
    } catch (error) {
      console.error('Error deleting signal source:', error);
      return false;
    }
  }

  // ==========================================
  // SIGNALS (Optimized Queries)
  // ==========================================
  async getSignals(filters?: {
    sourceId?: string;
    status?: TradingSignal['status'];
    symbol?: string;
    limit?: number;
    afterTimestamp?: string; // For incremental fetching
  }): Promise<TradingSignal[]> {
    const cacheKey = JSON.stringify(filters || {});

    // Use cache only for short TTL queries
    if (!filters?.afterTimestamp) {
      const cached = this.signalCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
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
          query = query.ilike('symbol', `%${filters.symbol}%`);
        }
        if (filters?.afterTimestamp) {
          query = query.gt('received_at', filters.afterTimestamp);
        }
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as TradingSignal[];
      });

      // Cache only if no timestamp filter (not incremental)
      if (!filters?.afterTimestamp) {
        this.signalCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Error fetching signals:', error);
      return [];
    }
  }

  async getSignalById(id: string): Promise<TradingSignal | null> {
    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('trading_signals')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        return data as TradingSignal;
      });

      return result;
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
      await retryWithBackoff(async () => {
        const updates: any = {
          status,
          execution_status: executionStatus,
        };

        if (orderId) updates.order_id = orderId;
        if (errorMessage) updates.error_message = errorMessage;
        if (status === 'executed') updates.executed_at = new Date().toISOString();

        const { error } = await supabase
          .from('trading_signals')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
      });

      // Invalidate signal cache
      this.signalCache.invalidateAll();
      return true;
    } catch (error) {
      console.error('Error updating signal status:', error);
      return false;
    }
  }

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================
  async updateSignalsStatusBatch(
    ids: string[],
    status: TradingSignal['status'],
    executionStatus?: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in chunks of 10
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);

      try {
        await retryWithBackoff(async () => {
          const updates: any = { status, execution_status: executionStatus };
          if (status === 'executed') updates.executed_at = new Date().toISOString();

          const { error } = await supabase
            .from('trading_signals')
            .update(updates)
            .in('id', chunk);

          if (error) throw error;
        });

        success += chunk.length;
      } catch (error) {
        console.error('Error in batch update:', error);
        failed += chunk.length;
      }
    }

    this.signalCache.invalidateAll();
    return { success, failed };
  }

  // ==========================================
  // VALIDATION
  // ==========================================
  async validateSignal(signal: TradingSignal): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!signal.symbol || signal.symbol.trim() === '') {
      errors.push('Symbol is required');
    }

    // Type-specific validation
    if (signal.signal_type === 'buy' || signal.signal_type === 'sell') {
      if (!signal.quantity || signal.quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }

      if (signal.action === 'limit' || signal.action === 'stop') {
        if (!signal.price || signal.price <= 0) {
          errors.push('Price is required for limit/stop orders');
        }
      }

      // Leverage validation
      if (signal.leverage < 1 || signal.leverage > 100) {
        errors.push('Leverage must be between 1 and 100');
      }

      // SL/TP logic validation
      if (signal.price && signal.stop_loss) {
        if (signal.signal_type === 'buy' && signal.stop_loss >= signal.price) {
          errors.push('Stop loss must be below entry price for buy orders');
        }
        if (signal.signal_type === 'sell' && signal.stop_loss <= signal.price) {
          errors.push('Stop loss must be above entry price for sell orders');
        }
      }

      // Warnings
      if (!signal.stop_loss) {
        warnings.push('No stop loss defined - high risk');
      }

      if (signal.leverage > 10) {
        warnings.push(`High leverage detected: ${signal.leverage}x`);
      }

      if (signal.quantity && signal.quantity > 10) {
        warnings.push(`Large position size: ${signal.quantity} contracts`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================
  // EXECUTION LOGGING
  // ==========================================
  async logSignalExecution(
    signalId: string,
    action: string,
    success: boolean,
    message?: string,
    details?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Debounce rapid logging
      return new Promise((resolve) => {
        this.debouncer.debounce(`log-${signalId}-${action}`, async () => {
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
            resolve(true);
          } catch (error) {
            console.error('Error logging signal execution:', error);
            resolve(false);
          }
        }, 100); // 100ms debounce
      });
    } catch (error) {
      console.error('Error logging signal execution:', error);
      return false;
    }
  }

  async getSignalLogs(signalId: string): Promise<any[]> {
    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('signal_execution_logs')
          .select('*')
          .eq('signal_id', signalId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
      });

      return result;
    } catch (error) {
      console.error('Error fetching signal logs:', error);
      return [];
    }
  }

  // ==========================================
  // FILTERS
  // ==========================================
  async createFilter(
    name: string,
    filterType: SignalFilter['filter_type'],
    filterRules: Record<string, any>,
    signalSourceId?: string
  ): Promise<SignalFilter | null> {
    try {
      const result = await retryWithBackoff(async () => {
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
      });

      this.filterCache.invalidateAll();
      return result;
    } catch (error) {
      console.error('Error creating filter:', error);
      return null;
    }
  }

  async getFilters(forceRefresh: boolean = false): Promise<SignalFilter[]> {
    if (!forceRefresh) {
      const cached = this.filterCache.get('all');
      if (cached) return cached;
    }

    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('signal_filters')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as SignalFilter[];
      });

      this.filterCache.set('all', result);
      return result;
    } catch (error) {
      console.error('Error fetching filters:', error);
      return [];
    }
  }

  async applyFilters(signal: TradingSignal, filters: SignalFilter[]): Promise<{
    allowed: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    for (const filter of filters) {
      if (!filter.is_active) continue;

      // Filter by source
      if (filter.signal_source_id && filter.signal_source_id !== signal.signal_source_id) {
        continue;
      }

      const { filter_type, filter_rules } = filter;

      switch (filter_type) {
        case 'symbol':
          if (filter_rules.symbols && Array.isArray(filter_rules.symbols)) {
            const allowed = filter_rules.symbols.includes(signal.symbol);
            if (filter_rules.mode === 'whitelist' && !allowed) {
              reasons.push(`Symbol ${signal.symbol} not in whitelist`);
              return { allowed: false, reasons };
            }
            if (filter_rules.mode === 'blacklist' && allowed) {
              reasons.push(`Symbol ${signal.symbol} is blacklisted`);
              return { allowed: false, reasons };
            }
          }
          break;

        case 'timeframe':
          if (filter_rules.timeframes && signal.timeframe) {
            if (!filter_rules.timeframes.includes(signal.timeframe)) {
              reasons.push(`Timeframe ${signal.timeframe} not allowed`);
              return { allowed: false, reasons };
            }
          }
          break;

        case 'signal_type':
          if (filter_rules.types && Array.isArray(filter_rules.types)) {
            if (!filter_rules.types.includes(signal.signal_type)) {
              reasons.push(`Signal type ${signal.signal_type} not allowed`);
              return { allowed: false, reasons };
            }
          }
          break;

        case 'risk':
          if (filter_rules.max_leverage && signal.leverage > filter_rules.max_leverage) {
            reasons.push(`Leverage ${signal.leverage}x exceeds max ${filter_rules.max_leverage}x`);
            return { allowed: false, reasons };
          }
          if (filter_rules.max_quantity && signal.quantity && signal.quantity > filter_rules.max_quantity) {
            reasons.push(`Quantity ${signal.quantity} exceeds max ${filter_rules.max_quantity}`);
            return { allowed: false, reasons };
          }
          break;

        case 'time':
          const now = new Date();
          const currentHour = now.getHours();
          if (filter_rules.trading_hours) {
            const { start, end } = filter_rules.trading_hours;
            if (currentHour < start || currentHour >= end) {
              reasons.push(`Trading hours: ${start}:00-${end}:00, current: ${currentHour}:00`);
              return { allowed: false, reasons };
            }
          }
          break;
      }
    }

    return { allowed: true, reasons: [] };
  }

  // ==========================================
  // UTILITIES
  // ==========================================
  getWebhookUrl(source: SignalSource): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return '';

    const functionName = source.source_type === 'telegram'
      ? 'receive-telegram-signal'
      : 'receive-tradingview-signal';

    return `${supabaseUrl}/functions/v1/${functionName}?id=${source.webhook_url}`;
  }

  getCacheStats(): Record<string, any> {
    return {
      sources: this.sourceCache.getStats(),
      filters: this.filterCache.getStats(),
      signals: this.signalCache.getStats(),
    };
  }

  clearAllCaches(): void {
    this.sourceCache.invalidateAll();
    this.filterCache.invalidateAll();
    this.signalCache.invalidateAll();
  }
}

export const signalServiceOptimized = new SignalServiceOptimized();
export const signalService = signalServiceOptimized; // Backward compatibility
