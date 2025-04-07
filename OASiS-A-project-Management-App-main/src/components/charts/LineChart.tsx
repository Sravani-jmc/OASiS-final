'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string | string[];
      borderWidth: number;
      tension?: number;
    }>;
  };
}

const LineChart = ({ data }: LineChartProps) => {
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
        type: 'line',
        data: data,
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
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

export default LineChart; 