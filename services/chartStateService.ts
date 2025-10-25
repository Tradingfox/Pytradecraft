import { supabase } from './supabaseClient';
import { IndicatorState, IndicatorDefinition } from './indicatorEngine';

export interface ChartState {
  id?: string;
  user_id?: string;
  contract_id: string;
  name: string;
  timeframe: string;
  indicators: IndicatorState[];
  drawings: DrawingObject[];
  chart_settings: ChartSettings;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DrawingObject {
  id: string;
  type: 'trendline' | 'horizontal_line' | 'vertical_line' | 'rectangle' | 'fibonacci' | 'text' | 'arrow';
  points: { time: number; price: number }[];
  style: {
    color: string;
    width: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
  };
  text?: string;
  locked?: boolean;
}

export interface ChartSettings {
  chartType: 'candlestick' | 'line' | 'heikin_ashi';
  showVolume: boolean;
  showGrid: boolean;
  theme: 'dark' | 'light';
  colors: {
    background: string;
    text: string;
    upColor: string;
    downColor: string;
  };
  priceScale: {
    mode: 'normal' | 'logarithmic' | 'percentage';
    autoScale: boolean;
  };
}

export class ChartStateService {
  async saveChartState(chartState: ChartState): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (chartState.is_default) {
        await this.clearOtherDefaults(user.id, chartState.contract_id);
      }

      const stateToSave = {
        ...chartState,
        user_id: user.id
      };

      let result;

      if (chartState.id) {
        result = await supabase
          .from('chart_states')
          .update(stateToSave)
          .eq('id', chartState.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('chart_states')
          .insert([stateToSave])
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving chart state:', result.error);
        return { success: false, error: result.error.message };
      }

      return { success: true, id: result.data.id };
    } catch (error) {
      console.error('Error in saveChartState:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async clearOtherDefaults(userId: string, contractId: string): Promise<void> {
    await supabase
      .from('chart_states')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('contract_id', contractId)
      .eq('is_default', true);
  }

  async loadChartState(contractId: string, stateName?: string): Promise<{ success: boolean; state?: ChartState; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      let query = supabase
        .from('chart_states')
        .select('*')
        .eq('user_id', user.id)
        .eq('contract_id', contractId);

      if (stateName) {
        query = query.eq('name', stateName);
      } else {
        query = query.eq('is_default', true);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error loading chart state:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: true, state: this.getDefaultChartState(contractId) };
      }

      return { success: true, state: data as ChartState };
    } catch (error) {
      console.error('Error in loadChartState:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listChartStates(contractId?: string): Promise<{ success: boolean; states?: ChartState[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      let query = supabase
        .from('chart_states')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (contractId) {
        query = query.eq('contract_id', contractId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error listing chart states:', error);
        return { success: false, error: error.message };
      }

      return { success: true, states: data as ChartState[] };
    } catch (error) {
      console.error('Error in listChartStates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteChartState(stateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('chart_states')
        .delete()
        .eq('id', stateId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting chart state:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteChartState:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async saveCustomIndicator(indicator: Partial<IndicatorDefinition>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const indicatorToSave = {
        user_id: user.id,
        name: indicator.name,
        description: indicator.description || '',
        language: indicator.language || 'javascript',
        code: indicator.code,
        parameters: indicator.parameters || [],
        outputs: indicator.outputs || [],
        category: indicator.category || 'custom',
        is_public: false
      };

      const { data, error } = await supabase
        .from('custom_indicators')
        .insert([indicatorToSave])
        .select()
        .single();

      if (error) {
        console.error('Error saving custom indicator:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data.id };
    } catch (error) {
      console.error('Error in saveCustomIndicator:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async loadCustomIndicators(includePublic: boolean = true): Promise<{ success: boolean; indicators?: IndicatorDefinition[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      let query = supabase
        .from('custom_indicators')
        .select('*')
        .order('created_at', { ascending: false });

      if (includePublic) {
        query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading custom indicators:', error);
        return { success: false, error: error.message };
      }

      const indicators: IndicatorDefinition[] = data.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        language: d.language as any,
        code: d.code,
        parameters: d.parameters,
        outputs: d.outputs,
        category: d.category as any
      }));

      return { success: true, indicators };
    } catch (error) {
      console.error('Error in loadCustomIndicators:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getDefaultChartState(contractId: string): ChartState {
    return {
      contract_id: contractId,
      name: 'Default',
      timeframe: '5m',
      indicators: [],
      drawings: [],
      chart_settings: {
        chartType: 'candlestick',
        showVolume: true,
        showGrid: true,
        theme: 'dark',
        colors: {
          background: '#131722',
          text: '#D1D4DC',
          upColor: '#26a69a',
          downColor: '#ef5350'
        },
        priceScale: {
          mode: 'normal',
          autoScale: true
        }
      },
      is_default: true
    };
  }
}

export const chartStateService = new ChartStateService();
