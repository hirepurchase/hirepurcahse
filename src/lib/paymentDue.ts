import { roundMoney } from '@/lib/utils';

/**
 * What a customer owes right now and what a payment will cover, worked out
 * from the schedule. The payment screens offer these as one-tap amounts, so
 * nobody has to scroll a daily contract's long schedule to pay.
 */

export interface DueInstallment {
  id: string;
  installmentNo: number;
  amount: number;
  paidAmount: number;
  dueDate: string | Date;
  status: string;
}

const remaining = (i: DueInstallment) => roundMoney(i.amount - i.paidAmount);

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function unpaidInstallments(installments: DueInstallment[] = []): DueInstallment[] {
  return installments.filter((i) => i.status !== 'PAID' && i.status !== 'WRITTEN_OFF' && remaining(i) > 0.005);
}

export function isInstallmentOverdue(i: DueInstallment): boolean {
  return i.status === 'OVERDUE' || new Date(i.dueDate).getTime() < startOfToday();
}

export interface DueSummary {
  overdue: DueInstallment[];
  overdueAmount: number;
  penaltyOutstanding: number;
  /** Overdue installments plus late charges: what clears the arrears. */
  dueNow: number;
  next: DueInstallment | null;
  /** Everything owed, late charges included: the most a payment may be. */
  totalDue: number;
  unpaidCount: number;
}

export function summariseDue(contract: {
  installments?: DueInstallment[];
  outstandingBalance: number;
  penaltyOutstanding?: number | null;
  totalDue?: number | null;
}): DueSummary {
  const unpaid = unpaidInstallments(contract.installments);
  const overdue = unpaid.filter(isInstallmentOverdue);
  const overdueAmount = roundMoney(overdue.reduce((s, i) => s + remaining(i), 0));
  const penaltyOutstanding = roundMoney(contract.penaltyOutstanding ?? 0);
  return {
    overdue,
    overdueAmount,
    penaltyOutstanding,
    dueNow: roundMoney(overdueAmount + penaltyOutstanding),
    next: unpaid.find((i) => !isInstallmentOverdue(i)) ?? null,
    totalDue: roundMoney(contract.totalDue ?? contract.outstandingBalance + penaltyOutstanding),
    unpaidCount: unpaid.length,
  };
}

export interface QuickAmount {
  key: string;
  label: string;
  amount: number;
}

/** The one-tap amounts: arrears, arrears plus the next one, and everything. */
export function quickAmounts(summary: DueSummary): QuickAmount[] {
  const options: QuickAmount[] = [];
  if (summary.dueNow > 0) {
    options.push({ key: 'due', label: summary.overdue.length ? 'Overdue now' : 'Late charges', amount: summary.dueNow });
  }
  if (summary.next) {
    const withNext = roundMoney(summary.dueNow + remaining(summary.next));
    options.push({ key: 'next', label: summary.dueNow > 0 ? 'Overdue + next' : 'Next payment', amount: withNext });
  }
  if (summary.totalDue > 0 && !options.some((o) => Math.abs(o.amount - summary.totalDue) < 0.005)) {
    options.push({ key: 'all', label: 'Pay everything', amount: summary.totalDue });
  }
  return options.filter((o) => o.amount <= summary.totalDue + 0.005);
}

/**
 * What an amount will settle, in the order the server applies it: overdue
 * installments, then late charges, then installments not yet due.
 */
export function describeCoverage(
  contract: { installments?: DueInstallment[]; penaltyOutstanding?: number | null },
  amount: number,
): string {
  let left = roundMoney(amount);
  if (left <= 0) return '';
  const unpaid = unpaidInstallments(contract.installments);
  const overdue = unpaid.filter(isInstallmentOverdue);
  const upcoming = unpaid.filter((i) => !isInstallmentOverdue(i));
  let cleared = 0;
  let lastDate: string | Date | null = null;
  let partial = false;
  const take = (list: DueInstallment[]) => {
    for (const i of list) {
      if (left <= 0.005) return;
      if (left + 0.005 >= remaining(i)) {
        left = roundMoney(left - remaining(i));
        cleared++;
        lastDate = i.dueDate;
      } else {
        left = 0;
        partial = true;
      }
    }
  };
  take(overdue);
  const penalty = roundMoney(contract.penaltyOutstanding ?? 0);
  const penaltiesCleared = penalty > 0 && left + 0.005 >= penalty;
  left = roundMoney(Math.max(0, left - penalty));
  take(upcoming);

  const parts: string[] = [];
  if (cleared) {
    const through = lastDate
      ? ` (to ${new Date(lastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`
      : '';
    parts.push(`${cleared} installment${cleared === 1 ? '' : 's'}${through}`);
  }
  if (penaltiesCleared) parts.push('late charges');
  if (partial) parts.push(cleared ? 'part of the next' : 'part of an installment');
  return parts.length ? `Covers ${parts.join(', ')}` : '';
}

/** Ghana prefixes → Mobile Money network, so the customer rarely has to pick. */
export function guessNetwork(phone: string): 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | null {
  const p = phone.replace(/\D/g, '').replace(/^233/, '0');
  const prefix = p.slice(0, 3);
  if (['024', '025', '053', '054', '055', '059'].includes(prefix)) return 'MTN';
  if (['020', '050'].includes(prefix)) return 'VODAFONE';
  if (['026', '027', '056', '057'].includes(prefix)) return 'AIRTELTIGO';
  return null;
}
