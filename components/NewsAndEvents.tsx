import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { getMarketNews, getEconomicEvents } from '../services/tradingApiService';
import { NewsItem, EconomicEvent } from '../types';
import LoadingSpinner from './LoadingSpinner';

const NewsAndEvents: React.FC = () => {
  const { sessionToken, selectedBroker } = useTradingContext();
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'news' | 'events'>('news');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Filters
  const [newsFilters, setNewsFilters] = useState({
    symbols: '',
    importance: 'all' as 'all' | 'low' | 'medium' | 'high',
    source: '',
    limit: 50
  });
  
  const [eventsFilters, setEventsFilters] = useState({
    country: '',
    currency: '',
    importance: 'all' as 'all' | 'low' | 'medium' | 'high',
    startDate: '',
    endDate: '',
    limit: 50
  });

  useEffect(() => {
    if (sessionToken && selectedBroker) {
      fetchData();
    }
  }, [sessionToken, selectedBroker, activeTab]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchData();
      }, 60000); // Refresh every minute
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, activeTab]);

  const fetchData = async () => {
    if (!sessionToken || !selectedBroker) return;
    
    if (activeTab === 'news') {
      await fetchNews();
    } else {
      await fetchEvents();
    }
  };

  const fetchNews = async () => {
    setIsLoadingNews(true);
    setError(null);
    
    try {
      const params: any = { limit: newsFilters.limit };
      
      if (newsFilters.symbols) {
        params.symbols = newsFilters.symbols.split(',').map(s => s.trim());
      }
      if (newsFilters.importance !== 'all') {
        params.importance = newsFilters.importance;
      }
      if (newsFilters.source) {
        params.source = newsFilters.source;
      }
      
      const response = await getMarketNews(selectedBroker, params, sessionToken);
      
      if (response.success) {
        setNews(response.news);
      } else {
        setError(response.errorMessage || 'Failed to fetch news');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setIsLoadingNews(false);
    }
  };

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    setError(null);
    
    try {
      const params: any = { limit: eventsFilters.limit };
      
      if (eventsFilters.country) {
        params.country = eventsFilters.country;
      }
      if (eventsFilters.currency) {
        params.currency = eventsFilters.currency;
      }
      if (eventsFilters.importance !== 'all') {
        params.importance = eventsFilters.importance;
      }
      if (eventsFilters.startDate) {
        params.startDate = eventsFilters.startDate;
      }
      if (eventsFilters.endDate) {
        params.endDate = eventsFilters.endDate;
      }
      
      const response = await getEconomicEvents(selectedBroker, params, sessionToken);
      
      if (response.success) {
        setEvents(response.events);
      } else {
        setError(response.errorMessage || 'Failed to fetch events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-400 bg-red-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'low': return 'text-green-400 bg-green-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isLoading = isLoadingNews || isLoadingEvents;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">News & Economic Events</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-white text-sm">
              Auto Refresh (1m)
            </label>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'news'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Market News ({news.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Economic Events ({events.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {/* News Tab */}
      {activeTab === 'news' && (
        <>
          {/* News Filters */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">News Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Symbols</label>
                <input
                  type="text"
                  value={newsFilters.symbols}
                  onChange={(e) => setNewsFilters(prev => ({ ...prev, symbols: e.target.value }))}
                  placeholder="e.g., AAPL, MSFT, TSLA"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Importance</label>
                <select
                  value={newsFilters.importance}
                  onChange={(e) => setNewsFilters(prev => ({ ...prev, importance: e.target.value as any }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Source</label>
                <input
                  type="text"
                  value={newsFilters.source}
                  onChange={(e) => setNewsFilters(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="e.g., Reuters, Bloomberg"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Limit</label>
                <select
                  value={newsFilters.limit}
                  onChange={(e) => setNewsFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchNews}
                disabled={isLoadingNews}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* News List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Latest Market News</h3>
            
            {news.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No news found. Try adjusting your filters.</p>
            ) : (
              <div className="space-y-4">
                {news.map((item) => (
                  <div key={item.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${getImportanceColor(item.importance)}`}>
                          {getImportanceIcon(item.importance)} {item.importance.toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm">{item.source}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{formatDateTime(item.publishedAt)}</span>
                    </div>
                    
                    <h4 className="text-white font-medium mb-2">{item.title}</h4>
                    
                    <p className="text-gray-300 text-sm mb-3 line-clamp-3">{item.content}</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap gap-1">
                        {item.symbols.map((symbol, index) => (
                          <span key={index} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                            {symbol}
                          </span>
                        ))}
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Read More →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <>
          {/* Events Filters */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Event Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Country</label>
                <input
                  type="text"
                  value={eventsFilters.country}
                  onChange={(e) => setEventsFilters(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="e.g., US, EU, JP"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Currency</label>
                <input
                  type="text"
                  value={eventsFilters.currency}
                  onChange={(e) => setEventsFilters(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="e.g., USD, EUR, JPY"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Importance</label>
                <select
                  value={eventsFilters.importance}
                  onChange={(e) => setEventsFilters(prev => ({ ...prev, importance: e.target.value as any }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Start Date</label>
                <input
                  type="date"
                  value={eventsFilters.startDate}
                  onChange={(e) => setEventsFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">End Date</label>
                <input
                  type="date"
                  value={eventsFilters.endDate}
                  onChange={(e) => setEventsFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Limit</label>
                <select
                  value={eventsFilters.limit}
                  onChange={(e) => setEventsFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchEvents}
                disabled={isLoadingEvents}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Economic Events</h3>
            
            {events.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No events found. Try adjusting your filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Event</th>
                      <th className="text-center py-2">Country</th>
                      <th className="text-center py-2">Currency</th>
                      <th className="text-center py-2">Importance</th>
                      <th className="text-right py-2">Actual</th>
                      <th className="text-right py-2">Forecast</th>
                      <th className="text-right py-2">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3">
                          <div className="text-white font-medium">{formatTime(event.eventTime)}</div>
                          <div className="text-gray-400 text-xs">{formatDate(event.eventTime)}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-white font-medium">{event.title}</div>
                          <div className="text-gray-400 text-xs">{event.description}</div>
                        </td>
                        <td className="py-3 text-center text-white">{event.country}</td>
                        <td className="py-3 text-center text-white">{event.currency}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${getImportanceColor(event.importance)}`}>
                            {getImportanceIcon(event.importance)} {event.importance.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {event.actual !== undefined ? (
                            <span className="text-white font-medium">
                              {event.actual} {event.unit}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {event.forecast !== undefined ? (
                            <span className="text-gray-300">
                              {event.forecast} {event.unit}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {event.previous !== undefined ? (
                            <span className="text-gray-300">
                              {event.previous} {event.unit}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NewsAndEvents; 