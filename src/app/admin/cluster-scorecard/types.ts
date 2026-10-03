export type PayoutType = 'RATE' | 'PER_UNIT' | 'TARGET' | 'TIERS';
export type Unit = 'GHS' | 'PERCENT' | 'COUNT';

export interface IndicatorDefinition {
  key: string;
  label: string;
  description: string;
  unit: Unit;
  payoutTypes: PayoutType[];
  higherIsBetter: boolean;
}

export interface IndicatorRule {
  key: string;
  enabled: boolean;
  payoutType: PayoutType;
  rate: number;
  unitAmount: number;
  target: number | null;
  targetDirection: 'GTE' | 'LTE';
  targetAmount: number;
  tiers: Array<{ threshold: number; amount: number }> | null;
  cap: number | null;
}

export interface ScorecardSettings {
  baseAmount: number;
  parGateEnabled: boolean;
  parGateCeiling: number;
  gateWithholdsBase: boolean;
  depositRemitDays: number;
}

export interface Line {
  key: string;
  value: number | null;
  count: number;
  payout: number;
  explanation: string;
}

export interface LeaderCard {
  leaderId: string;
  name: string;
  phone: string | null;
  agentCount: number;
  lines: Line[];
  base: number;
  variable: number;
  deductions: number;
  total: number;
  gated: boolean;
  gateReason: string | null;
  status: 'PREVIEW' | 'PENDING' | 'PAID';
  paidAt: string | null;
  reference: string | null;
}

export interface MonthData {
  month: string;
  status: 'PREVIEW' | 'CLOSED' | 'APPROVED';
  canClose: boolean;
  closedAt: string | null;
  approvedAt: string | null;
  rules: { indicators: IndicatorRule[]; settings: ScorecardSettings };
  leaders: LeaderCard[];
  totals: { base: number; variable: number; deductions: number; total: number; paid: number };
  indicators: IndicatorDefinition[];
  canManage: boolean;
}

export const PAYOUT_LABEL: Record<PayoutType, string> = {
  RATE: '% of value',
  PER_UNIT: 'Amount per unit',
  TARGET: 'Bonus when target met',
  TIERS: 'Tiered bonus',
};

export function formatValue(unit: Unit | undefined, value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (unit === 'GHS') return `GHS ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (unit === 'PERCENT') return `${Math.round(value * 100) / 100}%`;
  return String(value);
}

export const ghs = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function errorText(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
}

export function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
