import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const DisasterTrendsChart: React.FC<{ trends?: any[]; forecast?: any[] }> = ({ trends, forecast }) => {
  const sortedTrends = [...(trends || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedForecast = [...(forecast || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const allData = [...sortedTrends, ...sortedForecast];
  const labels = allData.map(t => {
    const d = new Date(t.date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  
  const trendPoints = sortedTrends.map(t => parseInt(t.count, 10));
  const historicalData = [...trendPoints, ...Array(sortedForecast.length).fill(null)];

  const lastTrendVal = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : null;
  const forecastPoints = sortedForecast.map(t => parseInt(t.count, 10));
  const forecastData = [
    ...Array(Math.max(0, trendPoints.length - 1)).fill(null),
    lastTrendVal,
    ...forecastPoints
  ];

  const data = {
    labels: labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Active Incidents (Historical)',
        data: labels.length > 0 ? historicalData : [12, 19, 15, 8, 22, 30, 25],
        borderColor: '#f43f5e', // Rose 500
        backgroundColor: 'rgba(244, 63, 94, 0.04)',
        borderWidth: 3.5,
        pointBackgroundColor: '#f43f5e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
      {
        label: 'AI Predicted Forecast (30d)',
        data: labels.length > 0 ? forecastData : [null, null, null, null, null, null, 25, 20, 18, 16, 21, 24, 23],
        borderColor: '#6366f1', // Indigo 500
        backgroundColor: 'transparent',
        borderWidth: 3.5,
        borderDash: [6, 4],
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false,
      }
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 11, weight: 'bold' },
          color: '#64748b',
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Outfit', 'Inter', sans-serif", size: 12, weight: 'bold' },
        bodyFont: { family: "'Outfit', 'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 12,
        boxPadding: 6
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 'bold' },
          color: '#94a3b8'
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.4)' },
        ticks: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 'bold' },
          color: '#94a3b8',
          precision: 0
        }
      }
    }
  };

  return <Line data={data} options={options} />;
};

export const ResourceAvailabilityChart: React.FC<{ resourceDistribution?: any[] }> = ({ resourceDistribution }) => {
  const types = [
    { key: 'FOOD', label: 'Food' },
    { key: 'WATER', label: 'Water' },
    { key: 'MEDICINE', label: 'Medicine' },
    { key: 'HOSPITAL_BED', label: 'Beds' },
    { key: 'SHELTER_CAPACITY', label: 'Shelters' }
  ];

  const labels = types.map(t => t.label);
  const dataPoints = types.map(t => {
    const match = resourceDistribution?.find(r => r.type === t.key);
    return match ? parseInt(match.total, 10) : 0;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Available Quantity',
        data: dataPoints,
        backgroundColor: [
          'rgba(245, 158, 11, 0.85)',  // Amber (Food)
          'rgba(20, 184, 166, 0.85)',  // Teal (Water)
          'rgba(168, 85, 247, 0.85)',  // Purple (Medicine)
          'rgba(59, 130, 246, 0.85)',  // Blue (Beds)
          'rgba(99, 102, 241, 0.85)'   // Indigo (Shelters)
        ],
        hoverBackgroundColor: [
          '#f59e0b',
          '#14b8a6',
          '#a855f7',
          '#3b82f6',
          '#6366f1'
        ],
        borderRadius: 8,
        borderWidth: 0
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Outfit', 'Inter', sans-serif", size: 12, weight: 'bold' },
        bodyFont: { family: "'Outfit', 'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 12
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 'bold' },
          color: '#94a3b8'
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.4)' },
        ticks: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 'bold' },
          color: '#94a3b8'
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
};

export const VehicleAvailabilityChart: React.FC<{ resourceDistribution?: any[] }> = ({ resourceDistribution }) => {
  const types = [
    { key: 'AMBULANCE', label: 'Ambulances' },
    { key: 'FIRE_TRUCK', label: 'Fire Trucks' }
  ];

  const labels = types.map(t => t.label);
  const dataPoints = types.map(t => {
    const match = resourceDistribution?.find(r => r.type === t.key);
    return match ? parseInt(match.total, 10) : 0;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Available Vehicles',
        data: dataPoints,
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)', // Emerald (Ambulances)
          'rgba(239, 68, 68, 0.85)'   // Red (Fire Trucks)
        ],
        hoverBackgroundColor: [
          '#10b981',
          '#ef4444'
        ],
        borderRadius: 8,
        borderWidth: 0
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Outfit', 'Inter', sans-serif", size: 12, weight: 'bold' },
        bodyFont: { family: "'Outfit', 'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 12
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 'bold' },
          color: '#94a3b8'
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.4)' },
        ticks: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 'bold' },
          color: '#94a3b8',
          precision: 0
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
};

export const SeverityDistributionChart: React.FC<{ severityDistribution?: any[] }> = ({ severityDistribution }) => {
  const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const dataPoints = levels.map(lvl => {
    const match = severityDistribution?.find(s => s.severity === lvl);
    return match ? parseInt(match.count, 10) : 0;
  });

  const data = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [
      {
        data: dataPoints,
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: { family: "'Outfit', 'Inter', sans-serif", size: 11, weight: 'bold' },
          color: '#64748b',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Outfit', 'Inter', sans-serif", size: 12, weight: 'bold' },
        bodyFont: { family: "'Outfit', 'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 12
      }
    }
  };

  return <Doughnut data={data} options={options} />;
};


