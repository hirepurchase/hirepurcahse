import type { Unit } from '../cluster-scorecard/types';

export type KpiGroup = 'AGENT' | 'TEAM' | 'CSO';
export type KpiStatus = 'MET' | 'ON_TRACK' | 'NEAR' | 'BELOW' | 'NO_TARGET' | 'NOT_MEASURED';

export interface KpiDefinition {
  key: string;
  label: string;
  description: string;
  unit: Unit;
  higherIsBetter: boolean;
  cumulative: boolean;
  currentOnly?: boolean;
}

export interface KpiLine {
  key: string;
  label: string;
  description: string;
  unit: Unit;
  higherIsBetter: boolean;
  value: number | null;
  count: number;
  target: number | null;
  expected: number | null;
  status: KpiStatus;
}

export interface KpiCard {
  userId: string;
  name: string;
  phone: string | null;
  role: string;
  group: KpiGroup;
  lines: KpiLine[];
  score: { targeted: number; met: number; near: number; below: number; percent: number | null };
  agentCount?: number;
}

export interface MonthMeta {
  month: string;
  inProgress: boolean;
  elapsed: number;
  definitions: Record<KpiGroup, KpiDefinition[]>;
}

export interface MyKpis extends MonthMeta {
  kind: 'AGENT' | 'CLUSTER' | 'CSO' | 'NONE';
  seesEveryone: boolean;
  canSetTargets: boolean;
  own?: KpiCard | null;
  team?: KpiCard | null;
  agents?: KpiCard[];
}

export interface PeopleKpis extends MonthMeta {
  group: KpiGroup;
  people: KpiCard[];
}

export const GROUP_LABEL: Record<KpiGroup, string> = {
  AGENT: 'Agents',
  TEAM: 'Cluster teams',
  CSO: 'Customer service',
};

export const ROLE_LABEL: Record<string, string> = {
  AGENT: 'Agent',
  SALES_AGENT: 'Sales agent',
  CLUSTER_AGENT: 'Cluster leader',
  CUSTOMER_SERVICE: 'Customer service',
};

export const STATUS_STYLE: Record<KpiStatus, { label: string; className: string }> = {
  MET: { label: 'Met', className: 'bg-emerald-50 text-emerald-700' },
  ON_TRACK: { label: 'On track', className: 'bg-emerald-50 text-emerald-700' },
  NEAR: { label: 'Close', className: 'bg-amber-50 text-amber-700' },
  BELOW: { label: 'Below', className: 'bg-red-50 text-red-700' },
  NO_TARGET: { label: 'No target', className: 'bg-gray-100 text-gray-500' },
  NOT_MEASURED: { label: 'Not measured', className: 'bg-gray-100 text-gray-500' },
};
