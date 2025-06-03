import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../contexts/TradingContext';
import { PlaceOrderRequest, Contract } from '../types';
import { 
  getOrderStatusText, getOrderTypeText, getOrderSideText, 
  validatePlaceOrderRequest,
  createMarketOrderTemplate, createLimitOrderTemplate,
  createStopOrderTemplate, createStopLimitOrderTemplate
} from '../utils/orderHelpers';

interface OrderManagementProps {
  selectedContract?: Contract | null;
}

const OrderManagement: React.FC<OrderManagementProps> = ({ selectedContract }) => {
  const { 
    selectedAccountId, 
    placeOrder, 
    cancelOrder, 
    fetchOpenOrders, 
    liveOrderUpdates 
  } = useTradingContext();

  // Order form state
  const [orderType, setOrderType] = useState<number>(2); // Default to Market
  const [orderSide, setOrderSide] = useState<number>(0); // Default to Buy
  const [orderSize, setOrderSize] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number | undefined>(undefined);
  const [stopPrice, setStopPrice] = useState<number | undefined>(undefined);
  const [timeInForce, setTimeInForce] = useState<number>(0); // Default to Day
  const [timeInForceDate, setTimeInForceDate] = useState<string | undefined>(undefined);
  const [customTag, setCustomTag] = useState<string>('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Load open orders on component mount
  useEffect(() => {
    if (selectedAccountId) {
      fetchOpenOrders().catch(error => 
        console.error('Failed to fetch open orders:', error)
      );
    }
  }, [selectedAccountId, fetchOpenOrders]);

  // Handle order form submission
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setOrderSuccess(null);

    if (!selectedAccountId) {
      setOrderError('Please select an account first');
      return;
    }

    if (!selectedContract) {
      setOrderError('Please select a contract first');
      return;
    }

    let orderRequest: PlaceOrderRequest;

    // Create appropriate order template based on order type
    switch (orderType) {
      case 1: // Limit
        orderRequest = createLimitOrderTemplate(
          selectedAccountId,
          selectedContract.id,
          orderSide,
          orderSize,
          limitPrice!,
          timeInForce
        );
        break;
      case 2: // Market
        orderRequest = createMarketOrderTemplate(
          selectedAccountId,
          selectedContract.id,
          orderSide,
          orderSize
        );
        break;
      case 3: // Stop
        orderRequest = createStopOrderTemplate(
          selectedAccountId,
          selectedContract.id,
          orderSide,
          orderSize,
          stopPrice!,
          timeInForce
        );
        break;
      case 4: // Stop Limit
        orderRequest = createStopLimitOrderTemplate(
          selectedAccountId,
          selectedContract.id,
          orderSide,
          orderSize,
          stopPrice!,
          limitPrice!,
          timeInForce
        );
        break;
      default:
        setOrderError('Invalid order type');
        return;
    }

    // Add optional fields if provided
    if (customTag) orderRequest.customTag = customTag;
    if (timeInForce === 1 && timeInForceDate) orderRequest.timeInForceDate = timeInForceDate;

    // Validate the order request
    const validation = validatePlaceOrderRequest(orderRequest);
    if (!validation.isValid) {
      setOrderError(validation.errorMessage || 'Invalid order parameters');
      return;
    }

    try {
      const result = await placeOrder(orderRequest);
      if (result.success) {
        setOrderSuccess(`Order placed successfully! Order ID: ${result.orderId}`);
        // Refresh open orders
        fetchOpenOrders();
        // Reset form
        resetOrderForm();
      } else {
        setOrderError(result.errorMessage || 'Failed to place order');
      }
    } catch (error) {
      setOrderError(`Error placing order: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCancelOrder = async (orderId: string | number) => {
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        setOrderSuccess(`Order ${orderId} canceled successfully!`);
        // Refresh open orders
        fetchOpenOrders();
      } else {
        setOrderError(result.errorMessage || 'Failed to cancel order');
      }
    } catch (error) {
      setOrderError(`Error canceling order: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const resetOrderForm = () => {
    setOrderType(2);
    setOrderSide(0);
    setOrderSize(1);
    setLimitPrice(undefined);
    setStopPrice(undefined);
    setTimeInForce(0);
    setTimeInForceDate(undefined);
    setCustomTag('');
  };

  return (
    <div className="order-management">
      <h2 className="text-xl font-bold mb-4">Order Management</h2>
      
      {/* Order Entry Form */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Place New Order</h3>
        {selectedContract ? (
          <div className="mb-4">
            <p className="text-sm font-medium">Contract: {selectedContract.name}</p>
            <p className="text-xs text-gray-600">ID: {selectedContract.id}</p>
          </div>
        ) : (
          <p className="text-sm text-orange-600 mb-4">Please select a contract first</p>
        )}

        {orderError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {orderError}
          </div>
        )}
        {orderSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
            {orderSuccess}
          </div>
        )}

        <form onSubmit={handleOrderSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Order Type</label>
              <select
                className="w-full p-2 border rounded"
                value={orderType}
                onChange={(e) => setOrderType(parseInt(e.target.value))}
              >
                <option value={1}>Limit</option>
                <option value={2}>Market</option>
                <option value={3}>Stop</option>
                <option value={4}>Stop Limit</option>
              </select>
            </div>

            {/* Order Side */}
            <div>
              <label className="block text-sm font-medium mb-1">Side</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded ${orderSide === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  onClick={() => setOrderSide(0)}
                >
                  Buy
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 rounded ${orderSide === 1 ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                  onClick={() => setOrderSide(1)}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Order Size */}
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <input
                type="number"
                min="1"
                className="w-full p-2 border rounded"
                value={orderSize}
                onChange={(e) => setOrderSize(parseInt(e.target.value))}
              />
            </div>

            {/* Limit Price - shown for Limit and StopLimit orders */}
            {(orderType === 1 || orderType === 4) && (
              <div>
                <label className="block text-sm font-medium mb-1">Limit Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded"
                  value={limitPrice || ''}
                  onChange={(e) => setLimitPrice(parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Stop Price - shown for Stop and StopLimit orders */}
            {(orderType === 3 || orderType === 4) && (
              <div>
                <label className="block text-sm font-medium mb-1">Stop Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded"
                  value={stopPrice || ''}
                  onChange={(e) => setStopPrice(parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Time in Force */}
            <div>
              <label className="block text-sm font-medium mb-1">Time in Force</label>
              <select
                className="w-full p-2 border rounded"
                value={timeInForce}
                onChange={(e) => setTimeInForce(parseInt(e.target.value))}
              >
                <option value={0}>Day</option>
                <option value={1}>GTC (Good Till Cancel)</option>
                <option value={2}>IOC (Immediate or Cancel)</option>
                <option value={3}>FOK (Fill or Kill)</option>
              </select>
            </div>

            {/* Time in Force Date - shown for GTC orders */}
            {timeInForce === 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">GTC Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={timeInForceDate || ''}
                  onChange={(e) => setTimeInForceDate(e.target.value)}
                />
              </div>
            )}

            {/* Custom Tag */}
            <div>
              <label className="block text-sm font-medium mb-1">Custom Tag (Optional)</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Optional identifier"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              onClick={resetOrderForm}
            >
              Reset
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded ${
                orderSide === 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
              } text-white`}
              disabled={!selectedContract || !selectedAccountId}
            >
              {orderSide === 0 ? 'Place Buy Order' : 'Place Sell Order'}
            </button>
          </div>
        </form>
      </div>

      {/* Open Orders Table */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Open Orders</h3>
          <button
            onClick={() => fetchOpenOrders()}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>

        {liveOrderUpdates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {liveOrderUpdates
                  .filter(order => order.status === 0 || order.status === 1) // Show only pending and working orders
                  .map(order => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{getOrderTypeText(order.type)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${order.side === 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {getOrderSideText(order.side)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{order.size}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {order.type === 1 || order.type === 4 ? `$${order.limitPrice}` : 
                         order.type === 3 ? `$${order.stopPrice}` : 'Market'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                          {getOrderStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No open orders</p>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
