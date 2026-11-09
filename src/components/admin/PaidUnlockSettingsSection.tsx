'use client';

/**
 * Paid temporary unlock settings: the on/off switch, how many unlocks a
 * customer gets per spell of arrears, and the tiers (share %, hours, charge %).
 * Shown on Knox Guard → Settings; saved with the rest of that page's form.
 */

export interface UnlockTier {
  percent: number;
  hours: number;
  /** The charge, as a percentage of the arrears added to the share. */
  feePercent: number;
}

export interface PaidUnlockSettingsValue {
  temporaryUnlockEnabled?: boolean;
  temporaryUnlockMaxUses?: number;
  temporaryUnlockTiers?: UnlockTier[];
}

export const DEFAULT_UNLOCK_TIERS: UnlockTier[] = [
  { percent: 25, hours: 24, feePercent: 0 },
  { percent: 50, hours: 72, feePercent: 0 },
  { percent: 75, hours: 120, feePercent: 0 },
  { percent: 90, hours: 168, feePercent: 0 },
];

/** The same rules the server applies, so mistakes show while typing. */
export function unlockTiersProblem(tiers: UnlockTier[], maxHours: number): string | null {
  if (tiers.length < 4 || tiers.length > 6) return 'Set between 4 and 6 tiers.';
  for (let i = 0; i < tiers.length; i++) {
    const { percent, hours } = tiers[i];
    const charge = tiers[i].feePercent ?? 0;
    if (!Number.isInteger(percent) || percent < 1 || percent > 99) return `Tier ${i + 1}: the share must be a whole number from 1 to 99.`;
    if (!Number.isInteger(hours) || hours < 1) return `Tier ${i + 1}: the hours must be a whole number of at least 1.`;
    if (hours > maxHours) return `Tier ${i + 1}: no more than ${maxHours} hours — a phone cannot be opened further ahead.`;
    if (!Number.isInteger(charge) || charge < 0 || charge > 50) return `Tier ${i + 1}: the charge must be a whole percentage from 0 to 50.`;
    if (percent + charge >= 100) return `Tier ${i + 1}: the share and the charge together (${percent + charge}%) must be less than 100%.`;
    if (i > 0 && percent <= tiers[i - 1].percent) return `Tier ${i + 1} must ask for a higher share than tier ${i}.`;
    if (i > 0 && hours <= tiers[i - 1].hours) return `Tier ${i + 1} must give more hours than tier ${i}.`;
  }
  return null;
}

export function normaliseTiers(tiers: UnlockTier[] | undefined): UnlockTier[] {
  return (tiers ?? DEFAULT_UNLOCK_TIERS).map((t) => ({ ...t, feePercent: t.feePercent ?? 0 }));
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-cyan-500';
const tierInputCls = 'w-full min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-cyan-500';

export function PaidUnlockSettingsSection({
  value,
  maxHours,
  onChange,
}: {
  value: PaidUnlockSettingsValue;
  maxHours: number;
  onChange: (patch: PaidUnlockSettingsValue) => void;
}) {
  const tiers = normaliseTiers(value.temporaryUnlockTiers);
  const problem = unlockTiersProblem(tiers, maxHours);
  const setTier = (i: number, key: keyof UnlockTier, v: number) =>
    onChange({ temporaryUnlockTiers: tiers.map((t, j) => (j === i ? { ...t, [key]: v } : t)) });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-base font-semibold text-gray-900">Paid temporary unlock</h2>
        <p className="mt-1 text-sm text-gray-500">
          A customer whose phone has locked pays part of what is overdue — on the short code, in the app or with cash at the
          office — and the phone opens for a while. Applies to Samsung and Transsion phones.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Offer paid temporary unlocks</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Off until switched on. A Samsung phone that is offline when its time runs out locks when it next connects.
            </p>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              aria-label="Offer paid temporary unlocks"
              checked={value.temporaryUnlockEnabled ?? false}
              onChange={(e) => onChange({ temporaryUnlockEnabled: e.target.checked })}
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300" />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Unlocks allowed per spell of arrears</label>
          <input
            type="number"
            min={1}
            max={20}
            value={value.temporaryUnlockMaxUses ?? 2}
            onChange={(e) => onChange({ temporaryUnlockMaxUses: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">1 to 20. The count starts again once the customer clears everything overdue.</p>
        </div>

        <div>
          <p className="mb-1.5 block text-sm font-medium text-gray-700">Tiers</p>
          <p className="mb-3 text-xs text-gray-500">
            Each tier asks for a share of what is overdue and opens the phone for that many hours. 4 to 6 tiers, each asking
            more and giving longer than the one before, up to {maxHours} hours. The charge is a further percentage of the
            arrears added to the share — 25% with a 5% charge asks for 30% — and is kept by the company: it does not pay off
            any of the arrears. Use 0 for no charge.
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-[1.25rem_1fr_1fr_1fr_2rem] gap-2 text-xs font-medium text-gray-500">
              <span />
              <span>Share %</span>
              <span>Hours</span>
              <span>Charge %</span>
              <span />
            </div>
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1.25rem_1fr_1fr_1fr_2rem] items-center gap-2">
                <span className="text-sm text-gray-500">{i + 1}.</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  aria-label={`Tier ${i + 1} share percent`}
                  value={t.percent}
                  onChange={(e) => setTier(i, 'percent', parseInt(e.target.value) || 0)}
                  className={tierInputCls}
                />
                <input
                  type="number"
                  min={1}
                  max={maxHours}
                  aria-label={`Tier ${i + 1} hours`}
                  value={t.hours}
                  onChange={(e) => setTier(i, 'hours', parseInt(e.target.value) || 0)}
                  className={tierInputCls}
                />
                <input
                  type="number"
                  min={0}
                  max={50}
                  aria-label={`Tier ${i + 1} charge percent`}
                  value={t.feePercent}
                  onChange={(e) => setTier(i, 'feePercent', parseInt(e.target.value) || 0)}
                  className={tierInputCls}
                />
                <button
                  type="button"
                  className="h-9 w-8 rounded-lg text-lg leading-none text-red-600 hover:bg-red-50 disabled:opacity-30"
                  disabled={tiers.length <= 4}
                  onClick={() => onChange({ temporaryUnlockTiers: tiers.filter((_, j) => j !== i) })}
                  aria-label={`Remove tier ${i + 1}`}
                  title="Remove tier"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={tiers.length >= 6}
              onClick={() => {
                const last = tiers[tiers.length - 1] ?? { percent: 0, hours: 0, feePercent: 0 };
                onChange({
                  temporaryUnlockTiers: [
                    ...tiers,
                    { percent: Math.min(99, last.percent + 5), hours: Math.min(maxHours, last.hours + 24), feePercent: last.feePercent },
                  ],
                });
              }}
            >
              Add tier
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              onClick={() => onChange({ temporaryUnlockTiers: DEFAULT_UNLOCK_TIERS })}
            >
              Use the defaults
            </button>
          </div>
          {problem && <p className="mt-2 text-sm text-red-600">{problem}</p>}
        </div>
      </div>
    </div>
  );
}
