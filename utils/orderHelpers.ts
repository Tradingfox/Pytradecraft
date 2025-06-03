import { PlaceOrderRequest, ModifyOrderRequest } from '../types';

/**
 * Validates a place order request to ensure all required fields are present and valid
 * @param order The order request to validate
 * @returns An object with validation result and optional error message
 */
export const validatePlaceOrderRequest = (order: PlaceOrderRequest): { 
    isValid: boolean; 
    errorMessage?: string 
} => {
    if (!order.accountId) {
        return { isValid: false, errorMessage: 'Account ID is required' };
    }
    
    if (!order.contractId) {
        return { isValid: false, errorMessage: 'Contract ID is required' };
    }
    
    if (order.size <= 0) {
        return { isValid: false, errorMessage: 'Size must be greater than 0' };
    }
    
    // Validate order type
    if (![1, 2, 3, 4].includes(order.type)) {
        return { isValid: false, errorMessage: 'Invalid order type. Must be 1 (Limit), 2 (Market), 3 (Stop), or 4 (StopLimit)' };
    }
    
    // Validate order side
    if (![0, 1].includes(order.side)) {
        return { isValid: false, errorMessage: 'Invalid order side. Must be 0 (Buy) or 1 (Sell)' };
    }
    
    // Validate price fields based on order type
    if (order.type === 1 && (order.limitPrice === undefined || order.limitPrice === null)) {
        return { isValid: false, errorMessage: 'Limit price is required for Limit orders' };
    }
    
    if (order.type === 3 && (order.stopPrice === undefined || order.stopPrice === null)) {
        return { isValid: false, errorMessage: 'Stop price is required for Stop orders' };
    }
    
    if (order.type === 4 && (
        order.limitPrice === undefined || order.limitPrice === null || 
        order.stopPrice === undefined || order.stopPrice === null
    )) {
        return { isValid: false, errorMessage: 'Both limit price and stop price are required for StopLimit orders' };
    }
    
    // If timeInForce is specified, validate it
    if (order.timeInForce !== undefined && ![0, 1, 2, 3].includes(order.timeInForce)) {
        return { isValid: false, errorMessage: 'Invalid timeInForce. Must be 0 (Day), 1 (GTC), 2 (IOC), or 3 (FOK)' };
    }
    
    // If it's a GTC order with a date, validate the date
    if (order.timeInForce === 1 && order.timeInForceDate) {
        try {
            const date = new Date(order.timeInForceDate);
            if (isNaN(date.getTime())) {
                return { isValid: false, errorMessage: 'Invalid timeInForceDate format' };
            }
            
            // Check if the date is in the future
            if (date <= new Date()) {
                return { isValid: false, errorMessage: 'timeInForceDate must be in the future' };
            }
        } catch (e) {
            return { isValid: false, errorMessage: 'Invalid timeInForceDate' };
        }
    }
    
    return { isValid: true };
};

/**
 * Validates a modify order request
 * @param request The modify order request to validate
 * @returns An object with validation result and optional error message
 */
export const validateModifyOrderRequest = (request: ModifyOrderRequest): {
    isValid: boolean;
    errorMessage?: string
} => {
    if (!request.accountId) {
        return { isValid: false, errorMessage: 'Account ID is required' };
    }
    
    if (!request.orderId) {
        return { isValid: false, errorMessage: 'Order ID is required' };
    }
    
    // Ensure at least one modification parameter is provided
    if (
        request.size === undefined && 
        request.limitPrice === undefined && 
        request.stopPrice === undefined && 
        request.trailPrice === undefined &&
        request.timeInForce === undefined
    ) {
        return { 
            isValid: false, 
            errorMessage: 'At least one modification parameter (size, limitPrice, stopPrice, trailPrice, timeInForce) must be provided' 
        };
    }
    
    // Validate size if provided
    if (request.size !== undefined && request.size <= 0) {
        return { isValid: false, errorMessage: 'Size must be greater than 0' };
    }
    
    // If timeInForce is specified, validate it
    if (request.timeInForce !== undefined && ![0, 1, 2, 3].includes(request.timeInForce)) {
        return { isValid: false, errorMessage: 'Invalid timeInForce. Must be 0 (Day), 1 (GTC), 2 (IOC), or 3 (FOK)' };
    }
    
    // If it's a GTC order with a date, validate the date
    if (request.timeInForce === 1 && request.timeInForceDate) {
        try {
            const date = new Date(request.timeInForceDate);
            if (isNaN(date.getTime())) {
                return { isValid: false, errorMessage: 'Invalid timeInForceDate format' };
            }
            
            // Check if the date is in the future
            if (date <= new Date()) {
                return { isValid: false, errorMessage: 'timeInForceDate must be in the future' };
            }
        } catch (e) {
            return { isValid: false, errorMessage: 'Invalid timeInForceDate' };
        }
    }
    
    return { isValid: true };
};

/**
 * Gets a human-readable description of order status
 * @param status The numeric status code
 * @returns A string describing the order status
 */
export const getOrderStatusText = (status: number): string => {
    switch (status) {
        case 0: return 'Pending';
        case 1: return 'Working';
        case 2: return 'Rejected';
        case 3: return 'Filled';
        case 4: return 'Canceled';
        default: return 'Unknown';
    }
};

/**
 * Gets a human-readable description of order type
 * @param type The numeric order type
 * @returns A string describing the order type
 */
export const getOrderTypeText = (type: number): string => {
    switch (type) {
        case 1: return 'Limit';
        case 2: return 'Market';
        case 3: return 'Stop';
        case 4: return 'Stop Limit';
        default: return 'Unknown';
    }
};

/**
 * Gets a human-readable description of order side
 * @param side The numeric side
 * @returns A string describing the order side
 */
export const getOrderSideText = (side: number): string => {
    return side === 0 ? 'Buy' : 'Sell';
};

/**
 * Gets a human-readable description of time in force
 * @param timeInForce The numeric time in force
 * @returns A string describing the time in force
 */
export const getTimeInForceText = (timeInForce?: number): string => {
    if (timeInForce === undefined) return 'Day'; // Default
    
    switch (timeInForce) {
        case 0: return 'Day';
        case 1: return 'GTC';
        case 2: return 'IOC';
        case 3: return 'FOK';
        default: return 'Unknown';
    }
};

/**
 * Creates a market order template to simplify order creation
 */
export const createMarketOrderTemplate = (
    accountId: string | number,
    contractId: string,
    side: number, // 0 for Buy, 1 for Sell
    size: number
): PlaceOrderRequest => {
    return {
        accountId,
        contractId,
        type: 2, // Market order
        side,
        size,
        timeInForce: 0 // Day order
    };
};

/**
 * Creates a limit order template to simplify order creation
 */
export const createLimitOrderTemplate = (
    accountId: string | number,
    contractId: string,
    side: number, // 0 for Buy, 1 for Sell
    size: number,
    limitPrice: number,
    timeInForce: number = 0 // 0=Day by default
): PlaceOrderRequest => {
    return {
        accountId,
        contractId,
        type: 1, // Limit order
        side,
        size,
        limitPrice,
        timeInForce
    };
};

/**
 * Creates a stop order template to simplify order creation
 */
export const createStopOrderTemplate = (
    accountId: string | number,
    contractId: string,
    side: number, // 0 for Buy, 1 for Sell
    size: number,
    stopPrice: number,
    timeInForce: number = 0 // 0=Day by default
): PlaceOrderRequest => {
    return {
        accountId,
        contractId,
        type: 3, // Stop order
        side,
        size,
        stopPrice,
        timeInForce
    };
};

/**
 * Creates a stop-limit order template to simplify order creation
 */
export const createStopLimitOrderTemplate = (
    accountId: string | number,
    contractId: string,
    side: number, // 0 for Buy, 1 for Sell
    size: number,
    stopPrice: number,
    limitPrice: number,
    timeInForce: number = 0 // 0=Day by default
): PlaceOrderRequest => {
    return {
        accountId,
        contractId,
        type: 4, // Stop-Limit order
        side,
        size,
        stopPrice,
        limitPrice,
        timeInForce
    };
};
