'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export interface DoughnutChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string | string[];
      borderWidth: number;
    }>;
  };
}

const DoughnutChart = ({ data }: DoughnutChartProps) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                  const percentage = Math.round((value * 100) / total);
                  return `${label}: ${percentage}%`;
                }
              }
            }
          },
          cutout: '70%',
        },
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div className="w-full h-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default DoughnutChart; 