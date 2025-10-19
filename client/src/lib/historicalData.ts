import { database, ref, get, query, orderByChild, startAt, endAt } from './firebase';
import type { HistoricalSensorData } from '@/../../shared/schema';

export interface TimeRange {
  start: number;
  end: number;
  label: string;
}

export const TIME_RANGES = {
  '24h': { hours: 24, label: '24 Stunden' },
  '7d': { hours: 24 * 7, label: '7 Tage' },
  '30d': { hours: 24 * 30, label: '30 Tage' },
} as const;

export type TimeRangeKey = keyof typeof TIME_RANGES;

export function getTimeRange(rangeKey: TimeRangeKey): TimeRange {
  const range = TIME_RANGES[rangeKey];
  const end = Date.now();
  const start = end - (range.hours * 60 * 60 * 1000);
  
  return {
    start,
    end,
    label: range.label,
  };
}

export async function fetchHistoricalData(
  rangeKey: TimeRangeKey
): Promise<HistoricalSensorData[]> {
  try {
    const { start, end } = getTimeRange(rangeKey);
    const historyRef = ref(database, 'historicalData');
    
    const historyQuery = query(
      historyRef,
      orderByChild('timestamp'),
      startAt(start),
      endAt(end)
    );

    const snapshot = await get(historyQuery);
    
    if (!snapshot.exists()) {
      return [];
    }

    const data: HistoricalSensorData[] = [];
    snapshot.forEach((child) => {
      data.push(child.val());
    });

    return data.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

export function downsampleData(
  data: HistoricalSensorData[],
  maxPoints: number = 100
): HistoricalSensorData[] {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  const downsampled: HistoricalSensorData[] = [];

  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, i + step);
    
    const avg: HistoricalSensorData = {
      timestamp: chunk[Math.floor(chunk.length / 2)].timestamp,
      plantMoisture: [0, 0, 0, 0],
      temperature: 0,
      humidity: 0,
      waterLevel: 0,
    };

    chunk.forEach(item => {
      for (let j = 0; j < 4; j++) {
        avg.plantMoisture[j] += item.plantMoisture[j];
      }
      avg.temperature += item.temperature;
      avg.humidity += item.humidity;
      avg.waterLevel += item.waterLevel;
    });

    const count = chunk.length;
    avg.plantMoisture = avg.plantMoisture.map(v => Math.round(v / count)) as [number, number, number, number];
    avg.temperature = Math.round((avg.temperature / count) * 10) / 10;
    avg.humidity = Math.round(avg.humidity / count);
    avg.waterLevel = Math.round(avg.waterLevel / count);

    downsampled.push(avg);
  }

  return downsampled;
}
