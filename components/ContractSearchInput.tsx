import React, { useState, useEffect, useCallback } from 'react';
import { Contract, BrokerType } from '../types';
import { useTradingContext } from '../contexts/TradingContext';
import LoadingSpinner from './LoadingSpinner'; // Assuming this component exists

// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};

interface ContractSearchInputProps {
  onContractSelect: (contract: Contract) => void;
  selectedBroker: BrokerType | null;
  initialSearchText?: string;
  showQuickSearch?: boolean;
  enableAutoSearch?: boolean;
  placeholder?: string;
}

const POPULAR_SYMBOLS = [
  'ES', 'NQ', 'YM', 'RTY', // US Indices
  'CL', 'NG', 'GC', 'SI', // Commodities
  'ZB', 'ZN', 'ZF', 'ZT', // Bonds
  'EUR', 'GBP', 'JPY', 'CAD', // Currencies (FX Futures like 6E, 6B, etc. might be more relevant for some brokers)
  'BTC', 'ETH' // Crypto (if supported by broker)
];

const ContractSearchInput: React.FC<ContractSearchInputProps> = ({
  onContractSelect,
  selectedBroker,
  initialSearchText = '',
  showQuickSearch = true,
  enableAutoSearch = false,
  placeholder = "Search for a contract (e.g. ES, NQ)"
}) => {
  const { searchContracts, isAuthenticated, selectedAccountId } = useTradingContext();

  const [searchText, setSearchText] = useState<string>(initialSearchText);
  const [searchResults, setSearchResults] = useState<Contract[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const handleSearch = useCallback(async (currentSearchText: string) => {
    if (!selectedBroker || !isAuthenticated || !selectedAccountId) {
      setSearchError('Please connect to a broker and select an account first.');
      setShowDropdown(true);
      return;
    }

    if (!currentSearchText.trim()) {
      setSearchError('Please enter a search term.');
      setSearchResults([]);
      setShowDropdown(true); // Show dropdown to display the error or lack of results
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]); // Clear previous results

    try {
      // Try with live: false first
      let result = await searchContracts(selectedBroker, {
        searchText: currentSearchText.trim(),
        live: false,
      });

      if (result.success && result.contracts.length > 0) {
        setSearchResults(result.contracts);
      } else {
        // Try with live: true if live: false returns no results or fails (optionally check specific errors)
        console.log(`No contracts with live: false for "${currentSearchText.trim()}", trying live: true...`);
        result = await searchContracts(selectedBroker, {
          searchText: currentSearchText.trim(),
          live: true,
        });
        if (result.success && result.contracts.length > 0) {
          setSearchResults(result.contracts);
        } else if (!result.success) {
           setSearchError(`API Error: ${result.errorMessage || 'Failed to search contracts'}`);
        } else {
          setSearchError(`No contracts found for "${currentSearchText.trim()}".`);
        }
      }
    } catch (error) {
      console.error('Contract search error:', error);
      setSearchError(`Error searching contracts: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSearching(false);
      setShowDropdown(true); // Always show dropdown after search attempt
    }
  }, [selectedBroker, isAuthenticated, selectedAccountId, searchContracts]);

  const debouncedSearch = useCallback(debounce(handleSearch, 500), [handleSearch]);

  useEffect(() => {
    if (enableAutoSearch && searchText.trim().length > 1) { // Auto-search if more than 1 char
      debouncedSearch(searchText);
    } else if (enableAutoSearch && searchText.trim().length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setShowDropdown(false);
    }
  }, [searchText, enableAutoSearch, debouncedSearch]);

  const handleSelectContract = (contract: Contract) => {
    onContractSelect(contract);
    setSearchText(contract.name); // Or contract.description, depending on desired display
    setShowDropdown(false);
    setSearchResults([]);
    setSearchError(null);
  };

  const handleQuickSearch = (symbol: string) => {
    setSearchText(symbol);
    handleSearch(symbol); // Perform search immediately for quick search
  };

  const handleManualSearch = () => {
    handleSearch(searchText);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => setShowDropdown(true)} // Show dropdown on focus if there are results/errors
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !enableAutoSearch) {
              handleManualSearch();
            }
          }}
        />
        {!enableAutoSearch && (
          <button
            onClick={handleManualSearch}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors disabled:opacity-50"
            disabled={isSearching || !searchText.trim()}
          >
            {isSearching ? <LoadingSpinner size="sm" /> : 'Search'}
          </button>
        )}
      </div>

      {showQuickSearch && (
        <div className="mt-2">
          <p className="text-gray-400 text-xs mb-1">Quick Search:</p>
          <div className="flex flex-wrap gap-1">
            {POPULAR_SYMBOLS.map(symbol => (
              <button
                key={symbol}
                onClick={() => handleQuickSearch(symbol)}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDropdown && (searchText.length > 0 || searchError || isSearching || searchResults.length > 0) && (
        <div
            className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto custom-scrollbar"
            // Basic click-outside-to-close logic can be added here if needed, e.g., via a global event listener
        >
          {isSearching && (
            <div className="p-4 text-center">
              <LoadingSpinner message="Searching contracts..." />
            </div>
          )}
          {searchError && !isSearching && (
            <div className="p-3 text-red-400 bg-red-900/30">{searchError}</div>
          )}
          {!isSearching && !searchError && searchResults.length === 0 && searchText.trim().length > 0 && (
             <div className="p-3 text-gray-400">No results for "{searchText}".</div>
          )}
          {searchResults.map(contract => (
            <div
              key={contract.id}
              onClick={() => handleSelectContract(contract)}
              className="p-3 hover:bg-sky-700 cursor-pointer border-b border-gray-700 last:border-b-0"
            >
              <div className="font-semibold text-white">{contract.name}</div>
              <div className="text-sm text-gray-300">{contract.description}</div>
              <div className="text-xs text-gray-500">Exchange: {contract.exchange || 'N/A'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractSearchInput;
