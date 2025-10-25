import { supabase } from './supabaseClient';
import { TradingSignal } from './signalService';

export interface InterpretedSignal {
  signal_id: string;
  instrument: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  order_type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  risk_percentage?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  account_filter?: string[];
  confidence_score: number;
  reasoning?: string;
}

export interface AIInterpretationResult {
  success: boolean;
  interpretation?: InterpretedSignal;
  error?: string;
  manual_review_required?: boolean;
  validation_errors?: string[];
}

class AISignalInterpreter {
  private llmEndpoint: string;
  private llmModel: string;
  private llmApiKey: string;

  constructor() {
    this.llmEndpoint = import.meta.env.VITE_LLM_ENDPOINT || 'http://localhost:8000/v1';
    this.llmModel = import.meta.env.VITE_LLM_MODEL || 'qwen';
    this.llmApiKey = import.meta.env.VITE_LLM_API_KEY || '';
  }

  async interpretSignal(
    signal: TradingSignal,
    userPreferences?: {
      default_risk_percentage?: number;
      default_stop_loss_pips?: number;
      default_take_profit_ratio?: number;
      max_position_size?: number;
      preferred_accounts?: string[];
    }
  ): Promise<AIInterpretationResult> {
    try {
      const rawSignalText = this.prepareSignalText(signal);

      const prompt = this.buildPrompt(rawSignalText, userPreferences);

      let interpretation: InterpretedSignal;

      if (this.llmEndpoint && this.llmEndpoint !== 'http://localhost:8000/v1') {
        interpretation = await this.callExternalLLM(prompt, signal.id);
      } else {
        interpretation = this.fallbackInterpretation(signal, userPreferences);
      }

      const validationResult = this.validateInterpretation(interpretation);

      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Interpretation validation failed',
          validation_errors: validationResult.errors,
          manual_review_required: true,
        };
      }

      await this.saveInterpretation(signal.id, rawSignalText, interpretation);

      return {
        success: true,
        interpretation,
      };
    } catch (error) {
      console.error('Error interpreting signal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        manual_review_required: true,
      };
    }
  }

  private prepareSignalText(signal: TradingSignal): string {
    let text = `Signal Type: ${signal.signal_type}\n`;
    text += `Symbol: ${signal.symbol}\n`;

    if (signal.action) text += `Action: ${signal.action}\n`;
    if (signal.price) text += `Price: ${signal.price}\n`;
    if (signal.stop_loss) text += `Stop Loss: ${signal.stop_loss}\n`;
    if (signal.take_profit) text += `Take Profit: ${signal.take_profit}\n`;
    if (signal.quantity) text += `Quantity: ${signal.quantity}\n`;
    if (signal.leverage) text += `Leverage: ${signal.leverage}\n`;
    if (signal.timeframe) text += `Timeframe: ${signal.timeframe}\n`;
    if (signal.comment) text += `Comment: ${signal.comment}\n`;

    if (signal.raw_data && typeof signal.raw_data === 'object') {
      text += `\nRaw Data: ${JSON.stringify(signal.raw_data, null, 2)}\n`;
    }

    return text;
  }

  private buildPrompt(signalText: string, userPreferences?: any): string {
    return `You are a trading signal interpreter. Analyze the following trading signal and convert it into a structured order format.

TRADING SIGNAL:
${signalText}

USER PREFERENCES:
${JSON.stringify(userPreferences || {}, null, 2)}

INSTRUCTIONS:
1. Extract the trading action (BUY, SELL, or CLOSE)
2. Determine the order type (MARKET, LIMIT, or STOP)
3. Calculate appropriate position size based on risk percentage
4. Validate stop loss and take profit levels
5. Assess signal priority based on clarity and urgency
6. Rate your confidence in the interpretation (0-1)

OUTPUT FORMAT (JSON):
{
  "signal_id": "original_signal_id",
  "instrument": "symbol",
  "action": "BUY/SELL/CLOSE",
  "order_type": "MARKET/LIMIT/STOP",
  "quantity": numeric_value,
  "price": numeric_value_or_null,
  "stop_loss": numeric_value_or_null,
  "take_profit": numeric_value_or_null,
  "risk_percentage": percentage,
  "priority": "HIGH/MEDIUM/LOW",
  "confidence_score": 0.0_to_1.0,
  "reasoning": "brief_explanation"
}

Respond ONLY with valid JSON. Do not include any other text.`;
  }

  private async callExternalLLM(prompt: string, signalId: string): Promise<InterpretedSignal> {
    try {
      const response = await fetch(`${this.llmEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.llmApiKey && { 'Authorization': `Bearer ${this.llmApiKey}` }),
        },
        body: JSON.stringify({
          model: this.llmModel,
          messages: [
            {
              role: 'system',
              content: 'You are a trading signal interpreter. Respond only with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in LLM response');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const interpretation = JSON.parse(jsonMatch[0]);
      interpretation.signal_id = signalId;

      return interpretation as InterpretedSignal;
    } catch (error) {
      console.error('Error calling external LLM:', error);
      throw error;
    }
  }

  private fallbackInterpretation(
    signal: TradingSignal,
    userPreferences?: any
  ): InterpretedSignal {
    const defaultRiskPercentage = userPreferences?.default_risk_percentage || 1;

    let action: 'BUY' | 'SELL' | 'CLOSE' = 'BUY';
    if (signal.signal_type === 'sell') action = 'SELL';
    else if (signal.signal_type === 'close') action = 'CLOSE';

    let orderType: 'MARKET' | 'LIMIT' | 'STOP' = 'MARKET';
    if (signal.action === 'limit') orderType = 'LIMIT';
    else if (signal.action === 'stop') orderType = 'STOP';

    const quantity = signal.quantity || this.calculatePositionSize(
      signal.price || 0,
      signal.stop_loss || 0,
      defaultRiskPercentage,
      userPreferences?.max_position_size
    );

    return {
      signal_id: signal.id,
      instrument: signal.symbol,
      action,
      order_type: orderType,
      quantity,
      price: signal.price || undefined,
      stop_loss: signal.stop_loss || undefined,
      take_profit: signal.take_profit || undefined,
      risk_percentage: defaultRiskPercentage,
      priority: 'MEDIUM',
      account_filter: userPreferences?.preferred_accounts,
      confidence_score: 0.8,
      reasoning: 'Fallback interpretation using rule-based logic',
    };
  }

  private calculatePositionSize(
    entryPrice: number,
    stopLoss: number,
    riskPercentage: number,
    maxPositionSize?: number
  ): number {
    if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
      return maxPositionSize || 1;
    }

    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    const accountBalance = 10000;
    const riskAmount = accountBalance * (riskPercentage / 100);
    let positionSize = riskAmount / riskPerUnit;

    if (maxPositionSize && positionSize > maxPositionSize) {
      positionSize = maxPositionSize;
    }

    return Math.max(0.01, Math.round(positionSize * 100) / 100);
  }

  private validateInterpretation(interpretation: InterpretedSignal): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!interpretation.instrument) {
      errors.push('Missing instrument/symbol');
    }

    if (!['BUY', 'SELL', 'CLOSE'].includes(interpretation.action)) {
      errors.push('Invalid action');
    }

    if (!['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'].includes(interpretation.order_type)) {
      errors.push('Invalid order type');
    }

    if (!interpretation.quantity || interpretation.quantity <= 0) {
      errors.push('Invalid quantity');
    }

    if (interpretation.order_type !== 'MARKET' && !interpretation.price) {
      errors.push('Price required for limit/stop orders');
    }

    if (interpretation.confidence_score < 0 || interpretation.confidence_score > 1) {
      errors.push('Invalid confidence score');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async saveInterpretation(
    signalId: string,
    rawText: string,
    interpretation: InterpretedSignal
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_signal_interpretations')
        .insert({
          signal_id: signalId,
          raw_signal_text: rawText,
          ai_model: this.llmModel,
          interpretation,
          confidence_score: interpretation.confidence_score,
          validation_status: 'validated',
        });

      if (error) {
        console.error('Error saving interpretation:', error);
      }
    } catch (error) {
      console.error('Error in saveInterpretation:', error);
    }
  }

  async getInterpretation(signalId: string) {
    try {
      const { data, error } = await supabase
        .from('ai_signal_interpretations')
        .select('*')
        .eq('signal_id', signalId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching interpretation:', error);
      return null;
    }
  }
}

export const aiSignalInterpreter = new AISignalInterpreter();
