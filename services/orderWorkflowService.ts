import { supabase } from './supabaseClient';
import { aiSignalInterpreter, InterpretedSignal } from './aiSignalInterpreter';
import { signalService, TradingSignal } from './signalService';
import { PlaceOrderRequest } from '../types';

export interface TradingOrder {
  id: string;
  signal_id: string | null;
  interpretation_id: string | null;
  user_id: string;
  account_id: string;
  broker_type: string;
  instrument: string;
  action: 'BUY' | 'SELL' | 'CLOSE' | 'MODIFY';
  order_type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_percentage: number | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'SUBMITTED' | 'PARTIAL_FILL' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'FAILED';
  broker_order_id: string | null;
  filled_quantity: number;
  average_fill_price: number | null;
  execution_time: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

class OrderWorkflowService {
  async processSignalWorkflow(
    signal: TradingSignal,
    accountIds: string[],
    brokerType: string,
    userPreferences?: any
  ): Promise<{
    success: boolean;
    orders: TradingOrder[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const orders: TradingOrder[] = [];

    try {
      console.log('🤖 Step 1: AI Interpretation...');
      const interpretationResult = await aiSignalInterpreter.interpretSignal(signal, userPreferences);

      if (!interpretationResult.success || !interpretationResult.interpretation) {
        errors.push(interpretationResult.error || 'Interpretation failed');

        await this.sendNotification({
          category: 'SIGNAL_RECEIVED',
          title: 'Signal Interpretation Failed',
          message: `Failed to interpret signal for ${signal.symbol}: ${interpretationResult.error}`,
          data: { signal_id: signal.id, error: interpretationResult.error },
        });

        return { success: false, orders, errors };
      }

      const interpretation = interpretationResult.interpretation;

      await this.sendNotification({
        category: 'SIGNAL_RECEIVED',
        title: 'Signal Interpreted Successfully',
        message: `${interpretation.action} ${interpretation.instrument} - Confidence: ${(interpretation.confidence_score * 100).toFixed(0)}%`,
        data: { signal_id: signal.id, interpretation },
      });

      console.log('📊 Step 2: Creating Orders...');
      const filteredAccounts = interpretation.account_filter
        ? accountIds.filter(id => interpretation.account_filter?.includes(id))
        : accountIds;

      if (filteredAccounts.length === 0) {
        errors.push('No accounts match the filter criteria');
        return { success: false, orders, errors };
      }

      for (const accountId of filteredAccounts) {
        try {
          const order = await this.createOrder(
            signal.id,
            interpretation,
            accountId,
            brokerType
          );
          orders.push(order);
        } catch (error) {
          errors.push(`Failed to create order for account ${accountId}: ${error}`);
        }
      }

      if (orders.length === 0) {
        return { success: false, orders, errors };
      }

      console.log('🚀 Step 3: Executing Orders...');
      for (const order of orders) {
        try {
          await this.executeOrder(order, brokerType);
        } catch (error) {
          errors.push(`Failed to execute order ${order.id}: ${error}`);
        }
      }

      return {
        success: true,
        orders,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { success: false, orders, errors };
    }
  }

  private async createOrder(
    signalId: string,
    interpretation: InterpretedSignal,
    accountId: string,
    brokerType: string
  ): Promise<TradingOrder> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('trading_orders')
        .insert({
          signal_id: signalId,
          user_id: user.id,
          account_id: accountId,
          broker_type: brokerType,
          instrument: interpretation.instrument,
          action: interpretation.action,
          order_type: interpretation.order_type,
          quantity: interpretation.quantity,
          price: interpretation.price,
          stop_loss: interpretation.stop_loss,
          take_profit: interpretation.take_profit,
          risk_percentage: interpretation.risk_percentage,
          priority: interpretation.priority,
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;

      await signalService.logSignalExecution(
        signalId,
        'order_created',
        true,
        `Order created for account ${accountId}`,
        { order_id: data.id }
      );

      return data as TradingOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  private async executeOrder(order: TradingOrder, brokerType: string): Promise<void> {
    try {
      await this.updateOrderStatus(order.id, 'SUBMITTED', 'Order submitted to broker');

      await this.sendNotification({
        category: 'ORDER_EXECUTED',
        title: 'Order Submitted',
        message: `${order.action} ${order.quantity} ${order.instrument} @ ${order.price || 'MARKET'}`,
        data: { order_id: order.id },
      });

      console.log(`Order ${order.id} marked as SUBMITTED (actual broker execution to be implemented)`);

    } catch (error) {
      await this.updateOrderStatus(
        order.id,
        'FAILED',
        error instanceof Error ? error.message : 'Execution failed'
      );

      await this.sendNotification({
        category: 'ORDER_FAILED',
        title: 'Order Execution Failed',
        message: `Failed to execute ${order.action} ${order.instrument}: ${error}`,
        data: { order_id: order.id, error: String(error) },
      });

      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: TradingOrder['status'],
    errorMessage?: string,
    brokerOrderId?: string,
    filledQuantity?: number,
    averageFillPrice?: number
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        error_message: errorMessage,
      };

      if (brokerOrderId) {
        updates.broker_order_id = brokerOrderId;
      }

      if (filledQuantity !== undefined) {
        updates.filled_quantity = filledQuantity;
      }

      if (averageFillPrice !== undefined) {
        updates.average_fill_price = averageFillPrice;
      }

      if (status === 'FILLED' || status === 'PARTIAL_FILL') {
        updates.execution_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('trading_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      if (status === 'FILLED') {
        const { data: order } = await supabase
          .from('trading_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (order) {
          await this.sendNotification({
            category: 'ORDER_FILLED',
            title: 'Order Filled',
            message: `${order.action} ${order.filled_quantity} ${order.instrument} filled @ ${order.average_fill_price}`,
            data: { order_id: orderId, order },
          });
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async modifyOrder(
    orderId: string,
    modificationType: 'MODIFY_PRICE' | 'MODIFY_SL' | 'MODIFY_TP' | 'CANCEL' | 'CLOSE',
    newValues: Partial<Pick<TradingOrder, 'price' | 'stop_loss' | 'take_profit' | 'quantity'>>,
    reason?: string
  ): Promise<boolean> {
    try {
      const { data: order } = await supabase
        .from('trading_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('Order not found');

      const previousValues = {
        price: order.price,
        stop_loss: order.stop_loss,
        take_profit: order.take_profit,
        quantity: order.quantity,
      };

      const { error: modError } = await supabase
        .from('order_modifications')
        .insert({
          order_id: orderId,
          modification_type: modificationType,
          previous_values: previousValues,
          new_values: newValues,
          reason,
          status: 'PENDING',
        });

      if (modError) throw modError;

      if (modificationType === 'CANCEL') {
        await this.updateOrderStatus(orderId, 'CANCELLED');
      } else {
        await supabase
          .from('trading_orders')
          .update(newValues)
          .eq('id', orderId);
      }

      await this.sendNotification({
        category: 'ALERT',
        title: 'Order Modified',
        message: `Order ${orderId} ${modificationType}`,
        data: { order_id: orderId, modification_type: modificationType },
      });

      return true;
    } catch (error) {
      console.error('Error modifying order:', error);
      return false;
    }
  }

  async getOrders(filters?: {
    accountId?: string;
    status?: TradingOrder['status'];
    instrument?: string;
    limit?: number;
  }): Promise<TradingOrder[]> {
    try {
      let query = supabase
        .from('trading_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.accountId) {
        query = query.eq('account_id', filters.accountId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.instrument) {
        query = query.eq('instrument', filters.instrument);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as TradingOrder[];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrderById(orderId: string): Promise<TradingOrder | null> {
    try {
      const { data, error } = await supabase
        .from('trading_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as TradingOrder;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  private async sendNotification(notification: {
    category: 'SIGNAL_RECEIVED' | 'ORDER_EXECUTED' | 'ORDER_FILLED' | 'ORDER_FAILED' | 'ALERT';
    title: string;
    message: string;
    data: Record<string, any>;
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!prefs) return;

      const shouldNotify =
        (notification.category === 'SIGNAL_RECEIVED' && prefs.notify_on_signal_received) ||
        (notification.category === 'ORDER_EXECUTED' && prefs.notify_on_order_executed) ||
        (notification.category === 'ORDER_FILLED' && prefs.notify_on_order_filled) ||
        (notification.category === 'ORDER_FAILED' && prefs.notify_on_errors) ||
        notification.category === 'ALERT';

      if (!shouldNotify) return;

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'IN_APP',
        category: notification.category,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        status: 'PENDING',
      });

      console.log(`📬 Notification sent: ${notification.title}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async getNotifications(limit: number = 50): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ status: 'READ', read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
}

export const orderWorkflowService = new OrderWorkflowService();
