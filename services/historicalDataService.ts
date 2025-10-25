import { supabase } from './supabaseClient';

export interface OHLCVBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  instrument_type: string;
  metadata?: Record<string, any>;
}

export interface SyncStatus {
  instrument_id: string;
  timeframe: string;
  last_sync_timestamp?: Date;
  last_sync_at: Date;
  sync_status: 'pending' | 'synced' | 'syncing' | 'failed';
  error_message?: string;
}

class HistoricalDataService {
  async getOrCreateInstrument(
    symbol: string,
    name: string,
    exchange: string = '',
    instrumentType: string = 'futures'
  ): Promise<Instrument | null> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('instruments')
        .select('*')
        .eq('symbol', symbol)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as Instrument;

      const { data: created, error: createError } = await supabase
        .from('instruments')
        .insert({
          symbol,
          name,
          exchange,
          instrument_type: instrumentType,
        })
        .select()
        .single();

      if (createError) throw createError;
      return created as Instrument;
    } catch (error) {
      console.error('Error getting/creating instrument:', error);
      return null;
    }
  }

  async storeOHLCVData(
    instrumentId: string,
    timeframe: string,
    bars: OHLCVBar[]
  ): Promise<boolean> {
    if (!bars.length) return true;

    try {
      const records = bars.map((bar) => ({
        instrument_id: instrumentId,
        timeframe,
        bar_timestamp: bar.timestamp.toISOString(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));

      const { error } = await supabase
        .from('ohlcv_data')
        .upsert(records, {
          onConflict: 'instrument_id,timeframe,bar_timestamp',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      await this.updateSyncStatus(instrumentId, timeframe, bars[bars.length - 1].timestamp, 'synced');

      return true;
    } catch (error) {
      console.error('Error storing OHLCV data:', error);
      await this.updateSyncStatus(
        instrumentId,
        timeframe,
        undefined,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  async getCachedOHLCV(
    instrumentId: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<OHLCVBar[]> {
    try {
      const { data, error } = await supabase
        .from('ohlcv_data')
        .select('bar_timestamp, open, high, low, close, volume')
        .eq('instrument_id', instrumentId)
        .eq('timeframe', timeframe)
        .gte('bar_timestamp', startTime.toISOString())
        .lte('bar_timestamp', endTime.toISOString())
        .order('bar_timestamp', { ascending: true });

      if (error) throw error;

      return (data || []).map((bar) => ({
        timestamp: new Date(bar.bar_timestamp),
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        volume: Number(bar.volume),
      }));
    } catch (error) {
      console.error('Error fetching cached OHLCV:', error);
      return [];
    }
  }

  async getLatestBar(instrumentId: string, timeframe: string): Promise<OHLCVBar | null> {
    try {
      const { data, error } = await supabase
        .from('ohlcv_data')
        .select('bar_timestamp, open, high, low, close, volume')
        .eq('instrument_id', instrumentId)
        .eq('timeframe', timeframe)
        .order('bar_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        timestamp: new Date(data.bar_timestamp),
        open: Number(data.open),
        high: Number(data.high),
        low: Number(data.low),
        close: Number(data.close),
        volume: Number(data.volume),
      };
    } catch (error) {
      console.error('Error fetching latest bar:', error);
      return null;
    }
  }

  async getSyncStatus(instrumentId: string, timeframe: string): Promise<SyncStatus | null> {
    try {
      const { data, error } = await supabase
        .from('data_sync_status')
        .select('*')
        .eq('instrument_id', instrumentId)
        .eq('timeframe', timeframe)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        instrument_id: data.instrument_id,
        timeframe: data.timeframe,
        last_sync_timestamp: data.last_sync_timestamp ? new Date(data.last_sync_timestamp) : undefined,
        last_sync_at: new Date(data.last_sync_at),
        sync_status: data.sync_status,
        error_message: data.error_message,
      };
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }
  }

  async updateSyncStatus(
    instrumentId: string,
    timeframe: string,
    lastSyncTimestamp?: Date,
    syncStatus: 'pending' | 'synced' | 'syncing' | 'failed' = 'synced',
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('data_sync_status')
        .upsert(
          {
            instrument_id: instrumentId,
            timeframe,
            last_sync_timestamp: lastSyncTimestamp?.toISOString(),
            last_sync_at: new Date().toISOString(),
            sync_status: syncStatus,
            error_message: errorMessage,
          },
          {
            onConflict: 'instrument_id,timeframe',
          }
        );

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating sync status:', error);
      return false;
    }
  }

  async hasCachedData(instrumentId: string, timeframe: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('ohlcv_data')
        .select('id', { count: 'exact', head: true })
        .eq('instrument_id', instrumentId)
        .eq('timeframe', timeframe)
        .limit(1);

      if (error) throw error;
      return (count ?? 0) > 0;
    } catch (error) {
      console.error('Error checking cached data:', error);
      return false;
    }
  }

  async getDataGaps(
    instrumentId: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      const cached = await this.getCachedOHLCV(instrumentId, timeframe, startTime, endTime);

      if (cached.length === 0) {
        return [{ start: startTime, end: endTime }];
      }

      const gaps: { start: Date; end: Date }[] = [];
      const timeframeMs = this.getTimeframeMilliseconds(timeframe);

      if (cached[0].timestamp.getTime() > startTime.getTime()) {
        gaps.push({
          start: startTime,
          end: new Date(cached[0].timestamp.getTime() - timeframeMs),
        });
      }

      for (let i = 0; i < cached.length - 1; i++) {
        const expectedNext = new Date(cached[i].timestamp.getTime() + timeframeMs);
        const actualNext = cached[i + 1].timestamp;

        if (actualNext.getTime() - expectedNext.getTime() > timeframeMs) {
          gaps.push({
            start: expectedNext,
            end: new Date(actualNext.getTime() - timeframeMs),
          });
        }
      }

      const lastBar = cached[cached.length - 1];
      if (lastBar.timestamp.getTime() < endTime.getTime()) {
        gaps.push({
          start: new Date(lastBar.timestamp.getTime() + timeframeMs),
          end: endTime,
        });
      }

      return gaps;
    } catch (error) {
      console.error('Error detecting data gaps:', error);
      return [{ start: startTime, end: endTime }];
    }
  }

  private getTimeframeMilliseconds(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([smhd])$/);
    if (!match) return 60000;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };

    return value * (multipliers[unit] || 60000);
  }

  async deleteOldData(instrumentId: string, timeframe: string, olderThan: Date): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ohlcv_data')
        .delete()
        .eq('instrument_id', instrumentId)
        .eq('timeframe', timeframe)
        .lt('bar_timestamp', olderThan.toISOString());

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting old data:', error);
      return false;
    }
  }
}

export const historicalDataService = new HistoricalDataService();
