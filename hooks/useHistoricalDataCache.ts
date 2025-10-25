import { useState, useEffect, useCallback } from 'react';
import { marketDataAdapter } from '../services/marketDataAdapter';
import { OHLCVBar } from '../services/historicalDataService';
import { BrokerType } from '../types';

interface UseHistoricalDataCacheOptions {
  broker: BrokerType | null;
  token: string | null;
  symbol: string;
  timeframe: string;
  daysBack?: number;
  autoFetch?: boolean;
  onSuccess?: (data: OHLCVBar[]) => void;
  onError?: (error: Error) => void;
}

export function useHistoricalDataCache({
  broker,
  token,
  symbol,
  timeframe,
  daysBack = 30,
  autoFetch = true,
  onSuccess,
  onError,
}: UseHistoricalDataCacheOptions) {
  const [data, setData] = useState<OHLCVBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (broker && token) {
      marketDataAdapter.initialize(broker, token);
    }
  }, [broker, token]);

  const fetchData = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!broker || !token || !symbol || !timeframe) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysBack);

        const result = await marketDataAdapter.getHistoricalData(
          symbol,
          timeframe,
          startTime,
          endTime,
          { forceRefresh }
        );

        setData(result);
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch historical data');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [broker, token, symbol, timeframe, daysBack, onSuccess, onError]
  );

  useEffect(() => {
    if (autoFetch && broker && token && symbol && timeframe) {
      fetchData(false);
    }
  }, [autoFetch, broker, token, symbol, timeframe, fetchData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const updateRealtimeBar = useCallback(
    async (bar: OHLCVBar) => {
      if (!symbol || !timeframe) return false;
      return marketDataAdapter.updateRealtimeBar(symbol, timeframe, bar);
    },
    [symbol, timeframe]
  );

  return {
    data,
    isLoading,
    error,
    refresh,
    updateRealtimeBar,
  };
}
