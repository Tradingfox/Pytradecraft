
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EquityDataPoint } from '../types';

interface BacktestChartProps {
  data: EquityDataPoint[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-700 text-white p-2 rounded shadow-lg border border-gray-600">
        <p className="label">{`Date : ${label}`}</p>
        <p className="intro">{`Equity : $${payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}</p>
      </div>
    );
  }
  return null;
};

const BacktestChart: React.FC<BacktestChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-400 p-4">No equity data to display.</div>;
  }
  return (
    <div className="h-96 w-full text-gray-300">
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /> {/* gray-600 */}
          <XAxis dataKey="date" stroke="#A0AEC0" /> {/* gray-400 */}
          <YAxis stroke="#A0AEC0" tickFormatter={(value) => `$${value.toLocaleString()}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#E2E8F0' /* gray-300 */ }} />
          <Line type="monotone" dataKey="value" stroke="#38BDF8" strokeWidth={2} dot={false} name="Equity" /> {/* sky-500 */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestChart;
