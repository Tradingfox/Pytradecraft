import { BrokerType, HistoricalDataRequest } from '../types';
import { getHistoricalData } from './tradingApiService';
import { marketDataCacheService, MarketDataFetcher } from './marketDataCacheService';
import { OHLCVBar } from './historicalDataService';

class BrokerDataFetcher implements MarketDataFetcher {
  constructor(
    private broker: BrokerType,
    private token: string
  ) {}

  async fetchHistoricalData(
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
  ): Promise<OHLCVBar[]> {
    const request: HistoricalDataRequest = {
      contractId: symbol,
      interval: timeframe,
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString(),
    };

    const response = await getHistoricalData(this.broker, this.token, request);

    if (!response.success || !response.bars) {
      console.error('Failed to fetch historical data:', response.errorMessage);
      return [];
    }

    return response.bars.map((bar) => ({
      timestamp: new Date(bar.timestamp),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
  }
}

export class MarketDataAdapter {
  private currentBroker: BrokerType | null = null;
  private currentToken: string | null = null;

  initialize(broker: BrokerType, token: string) {
    this.currentBroker = broker;
    this.currentToken = token;

    const fetcher = new BrokerDataFetcher(broker, token);
    marketDataCacheService.setDataFetcher(fetcher);
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
    if (!this.currentBroker || !this.currentToken) {
      console.warn('MarketDataAdapter not initialized');
      return [];
    }

    return marketDataCacheService.getHistoricalData(symbol, timeframe, startTime, endTime, options);
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
    return marketDataCacheService.updateRealtimeBar(symbol, timeframe, bar, options);
  }

  async preloadCommonTimeframes(
    symbol: string,
    daysBack: number = 30,
    options: {
      name?: string;
      exchange?: string;
      instrumentType?: string;
    } = {}
  ): Promise<void> {
    const commonTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    await marketDataCacheService.preloadData(symbol, commonTimeframes, daysBack, options);
  }

  async cleanupOldData(symbol: string, retentionDays: number = 90): Promise<void> {
    const commonTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const promises = commonTimeframes.map((timeframe) =>
      marketDataCacheService.cleanupOldData(symbol, timeframe, retentionDays)
    );
    await Promise.allSettled(promises);
  }

  reset() {
    this.currentBroker = null;
    this.currentToken = null;
    marketDataCacheService.clearSyncStatus();
  }
}

export const marketDataAdapter = new MarketDataAdapter();
