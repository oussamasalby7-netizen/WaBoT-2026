import { ResponsiveContainer, AreaChart, Area } from "recharts";

export default function MiniTrendChart({ data, color = "#00ff88" }) {
  // Use last 7 data points or mock if none
  const chartData = data || [
    { value: 400 }, { value: 300 }, { value: 600 }, 
    { value: 400 }, { value: 500 }, { value: 700 }, { value: 600 }
  ];

  return (
    <div className="mini-chart-wrapper">
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`colorTrend-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#colorTrend-${color})`} 
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
