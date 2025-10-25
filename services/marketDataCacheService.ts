import { historicalDataService, OHLCVBar } from './historicalDataService';

export interface MarketDataFetcher {
  fetchHistoricalData(
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<OHLCVBar[]>;
}

class MarketDataCacheService {
  private syncInProgress = new Map<string, Promise<OHLCVBar[]>>();
  private dataFetcher: MarketDataFetcher | null = null;

  setDataFetcher(fetcher: MarketDataFetcher) {
    this.dataFetcher = fetcher;
  }

  async getHistoricalData(
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date,
    options: {
      name?: string;
      exchange?: string;
      instrumentType?: string;
      forceRefresh?: boolean;
    } = {}
  ): Promise<OHLCVBar[]> {
    const instrument = await historicalDataService.getOrCreateInstrument(
      symbol,
      options.name || symbol,
      options.exchange || '',
      options.instrumentType || 'futures'
    );

    if (!instrument) {
      console.error('Failed to get/create instrument:', symbol);
      return this.fetchFromAPI(symbol, timeframe, startTime, endTime);
    }

    if (options.forceRefresh) {
      return this.fetchAndCache(instrument.id, symbol, timeframe, startTime, endTime);
    }

    const hasCached = await historicalDataService.hasCachedData(instrument.id, timeframe);

    if (!hasCached) {
      return this.fetchAndCache(instrument.id, symbol, timeframe, startTime, endTime);
    }

    const syncKey = `${instrument.id}-${timeframe}`;
    if (this.syncInProgress.has(syncKey)) {
      return this.syncInProgress.get(syncKey)!;
    }

    const cachedData = await historicalDataService.getCachedOHLCV(
      instrument.id,
      timeframe,
      startTime,
      endTime
    );

    const gaps = await historicalDataService.getDataGaps(instrument.id, timeframe, startTime, endTime);

    if (gaps.length > 0) {
      this.fillGapsInBackground(instrument.id, symbol, timeframe, gaps);
    }

    if (cachedData.length > 0) {
      return cachedData;
    }

    return this.fetchAndCache(instrument.id, symbol, timeframe, startTime, endTime);
  }

  private async fetchAndCache(
    instrumentId: string,
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<OHLCVBar[]> {
    const syncKey = `${instrumentId}-${timeframe}`;

    if (this.syncInProgress.has(syncKey)) {
      return this.syncInProgress.get(syncKey)!;
    }

    const syncPromise = this.performFetchAndCache(instrumentId, symbol, timeframe, startTime, endTime);
    this.syncInProgress.set(syncKey, syncPromise);

    try {
      const data = await syncPromise;
      return data;
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  private async performFetchAndCache(
    instrumentId: string,
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<OHLCVBar[]> {
    try {
      await historicalDataService.updateSyncStatus(instrumentId, timeframe, undefined, 'syncing');

      const data = await this.fetchFromAPI(symbol, timeframe, startTime, endTime);

      if (data.length > 0) {
        await historicalDataService.storeOHLCVData(instrumentId, timeframe, data);
      }

      return data;
    } catch (error) {
      console.error('Error fetching and caching data:', error);
      await historicalDataService.updateSyncStatus(
        instrumentId,
        timeframe,
        undefined,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  }

  private async fillGapsInBackground(
    instrumentId: string,
    symbol: string,
    timeframe: string,
    gaps: { start: Date; end: Date }[]
  ): Promise<void> {
    setTimeout(async () => {
      for (const gap of gaps) {
        try {
          const data = await this.fetchFromAPI(symbol, timeframe, gap.start, gap.end);
          if (data.length > 0) {
            await historicalDataService.storeOHLCVData(instrumentId, timeframe, data);
          }
        } catch (error) {
          console.error('Error filling gap:', error);
        }
      }
    }, 100);
  }

  private async fetchFromAPI(
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<OHLCVBar[]> {
    if (!this.dataFetcher) {
      console.warn('No data fetcher configured, returning empty data');
      return [];
    }

    try {
      return await this.dataFetcher.fetchHistoricalData(symbol, timeframe, startTime, endTime);
    } catch (error) {
      console.error('Error fetching from API:', error);
      return [];
    }
  }

  async updateRealtimeBar(
    symbol: string,
    timeframe: string,
    bar: OHLCVBar,
    options: {
      name?: string;
      exchange?: string;
      instrumentType?: string;
    } = {}
  ): Promise<boolean> {
    const instrument = await historicalDataService.getOrCreateInstrument(
      symbol,
      options.name || symbol,
      options.exchange || '',
      options.instrumentType || 'futures'
    );

    if (!instrument) {
      return false;
    }

    return historicalDataService.storeOHLCVData(instrument.id, timeframe, [bar]);
  }

  async cleanupOldData(
    symbol: string,
    timeframe: string,
    retentionDays: number = 90
  ): Promise<boolean> {
    const instrument = await historicalDataService.getOrCreateInstrument(symbol, symbol);

    if (!instrument) {
      return false;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return historicalDataService.deleteOldData(instrument.id, timeframe, cutoffDate);
  }

  async preloadData(
    symbol: string,
    timeframes: string[],
    daysBack: number = 30,
    options: {
      name?: string;
      exchange?: string;
      instrumentType?: string;
    } = {}
  ): Promise<void> {
    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - daysBack);

    const promises = timeframes.map((timeframe) =>
      this.getHistoricalData(symbol, timeframe, startTime, endTime, {
        ...options,
        forceRefresh: false,
      })
    );

    await Promise.allSettled(promises);
  }

  clearSyncStatus() {
    this.syncInProgress.clear();
  }
}

export const marketDataCacheService = new MarketDataCacheService();
