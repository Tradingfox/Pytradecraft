import { z } from 'zod';

export const OrderSchema = z.object({
  id: z.union([z.string(), z.number()]),
  accountId: z.union([z.string(), z.number()]),
  contractId: z.string(),
  orderType: z.string(),
  orderSide: z.string(),
  quantity: z.number().positive(),
  price: z.number().optional(),
  stopPrice: z.number().optional(),
  status: z.string(),
  timestamp: z.string().optional(),
  filledQuantity: z.number().optional(),
  averageFillPrice: z.number().optional()
});

export const PositionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  accountId: z.union([z.string(), z.number()]),
  contractId: z.string(),
  quantity: z.number(),
  averagePrice: z.number(),
  marketPrice: z.number().optional(),
  unrealizedPnL: z.number().optional(),
  realizedPnL: z.number().optional(),
  timestamp: z.string().optional()
});

export const QuoteSchema = z.object({
  contractId: z.string(),
  lastPrice: z.number().optional(),
  bidPrice: z.number().optional(),
  askPrice: z.number().optional(),
  bidSize: z.number().optional(),
  askSize: z.number().optional(),
  volume: z.number().optional(),
  timestamp: z.string().optional()
});

export const TradingAccountSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  balance: z.number().optional(),
  equity: z.number().optional(),
  margin: z.number().optional(),
  isActive: z.boolean().optional(),
  accountType: z.string().optional()
});

export const HistoricalDataRequestSchema = z.object({
  contractId: z.string(),
  timeframeId: z.number().optional(),
  timeframe: z.string().optional(),
  fromTimestamp: z.string().optional(),
  toTimestamp: z.string().optional(),
  barsBack: z.number().positive().optional()
});

export const PlaceOrderRequestSchema = z.object({
  accountId: z.union([z.string(), z.number()]),
  contractId: z.string(),
  orderType: z.string(),
  orderSide: z.string(),
  quantity: z.number().positive(),
  price: z.number().optional(),
  stopPrice: z.number().optional(),
  timeInForce: z.string().optional(),
  brackets: z.object({
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional()
  }).optional()
});

export const validateOrder = (data: unknown) => {
  return OrderSchema.safeParse(data);
};

export const validatePosition = (data: unknown) => {
  return PositionSchema.safeParse(data);
};

export const validateQuote = (data: unknown) => {
  return QuoteSchema.safeParse(data);
};

export const validateTradingAccount = (data: unknown) => {
  return TradingAccountSchema.safeParse(data);
};

export const validateHistoricalDataRequest = (data: unknown) => {
  return HistoricalDataRequestSchema.safeParse(data);
};

export const validatePlaceOrderRequest = (data: unknown) => {
  return PlaceOrderRequestSchema.safeParse(data);
};

export const validateArrayOf = <T,>(
  schema: z.ZodType<T>,
  data: unknown
): { success: boolean; data?: T[]; error?: z.ZodError } => {
  const arraySchema = z.array(schema);
  const result = arraySchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
};
