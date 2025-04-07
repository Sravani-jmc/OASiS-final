'use client';

import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { ChartConfiguration, ChartTypeRegistry } from 'chart.js';

interface ChartLoaderProps {
  type: 'bar' | 'line' | 'doughnut';
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      tension?: number;
    }>;
  };
}

const ChartLoader: React.FC<ChartLoaderProps> = ({ type, data }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create chart configuration
    const config: ChartConfiguration<keyof ChartTypeRegistry, number[], string> = {
      type: type as keyof ChartTypeRegistry,
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: type === 'doughnut' ? 'top' : 'top',
            display: true
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    };

    // Add specific options based on chart type
    if (type === 'bar' || type === 'line') {
      config.options = {
        ...config.options,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      };
    } else if (type === 'doughnut') {
      // Use type assertion for doughnut chart options
      (config.options as any).cutout = '70%';
    }

    // Create new chart
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      chartRef.current = new Chart(ctx, config);
    }

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [type, data]);

  return <canvas ref={canvasRef} />;
};

export default ChartLoader; 