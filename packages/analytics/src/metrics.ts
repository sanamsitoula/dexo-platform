export interface MetricPoint {
  date: string;
  value: number;
}

export const sum = (points: MetricPoint[]) =>
  points.reduce((acc, p) => acc + p.value, 0);

export const average = (points: MetricPoint[]) =>
  points.length ? sum(points) / points.length : 0;

export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
