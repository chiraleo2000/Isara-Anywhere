import React from 'react';

// Placeholder for VitalsChart component
// In production, use a charting library like recharts or chart.js

interface VitalsChartProps {
  data: any[];
  type: 'bloodPressure' | 'heartRate' | 'weight' | 'bloodGlucose';
  className?: string;
}

export const VitalsChart: React.FC<VitalsChartProps> = ({
  data,
  type,
  className = '',
}) => {
  // Simple sparkline visualization
  const getValues = () => {
    switch (type) {
      case 'bloodPressure':
        return data.map(d => d.bloodPressure?.systolic || 0);
      case 'heartRate':
        return data.map(d => d.heartRate?.value || 0);
      case 'weight':
        return data.map(d => d.weight?.value || 0);
      case 'bloodGlucose':
        return data.map(d => d.bloodGlucose?.value || 0);
      default:
        return [];
    }
  };

  const values = getValues();
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className={`h-16 flex items-end gap-1 ${className}`}>
      {values.slice(-7).map((value, index) => (
        <div
          key={`${type}-${index}`}
          className="flex-1 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
          style={{
            height: `${Math.max(((value - min) / range) * 100, 10)}%`,
          }}
          title={`${value}`}
        />
      ))}
    </div>
  );
};
