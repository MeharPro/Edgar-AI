"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ChartData = {
  date: string;
  [key: string]: string | number;
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export default function UsageGraph() {
  const [period, setPeriod] = useState('week');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/usage/graph?period=${period}`)
      .then(res => res.json())
      .then(result => {
        setChartData(result.data || []);
        
        // Extract unique models from data
        if (result.data && result.data.length > 0) {
          const uniqueModels = Object.keys(result.data[0]).filter(key => key !== 'time');
          setModels(uniqueModels);
        }
      })
      .catch(error => {
        console.error('Failed to fetch graph data:', error);
      });
  }, [period]);

  const formatYAxis = (tickItem: number) => {
    if (tickItem >= 1000) {
      return `${(tickItem / 1000).toFixed(1)}k`;
    }
    return tickItem.toString();
  };

  const formatTooltip = (value: number, name: string) => {
    return [`${value.toLocaleString()} tokens`, name];
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg font-medium">API Usage Graph</h2>
        <div className="flex gap-2">
          {['hour', 'day', 'week', 'month', 'ytd', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                formatter={formatTooltip}
              />
              <Legend />
              {models.map((model, index) => (
                <Line
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <p className="text-white/60">No usage data for this period</p>
        </div>
      )}
    </div>
  );
}
