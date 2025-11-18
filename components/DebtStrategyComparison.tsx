'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, BarChart3, CheckCircle2 } from 'lucide-react';
import type { Debt } from '@/lib/storage';
import { formatDateForDisplay } from '@/lib/datetime';
import {
  compareDebtStrategies,
  DebtPayoffStrategy,
  DebtStrategyResult,
} from '@/lib/debtStrategy';

interface DebtStrategyComparisonProps {
  debts: Debt[];
  currencyFormatter: Intl.NumberFormat;
  defaultBudget?: number | null;
  defaultStrategy?: DebtPayoffStrategy | null;
  onSaveDefaults?: (budget: number, strategy: DebtPayoffStrategy) => void | Promise<void>;
  isSavingDefaults?: boolean;
}

const STRATEGY_LABELS: Record<DebtPayoffStrategy, string> = {
  snowball: 'Pay smallest balance first',
  avalanche: 'Pay highest interest first',
};

const FAILURE_COPY: Record<string, string> = {
  noDebts: 'No active debts to simulate.',
  noBudget: 'Enter a monthly budget above zero.',
  paymentTooLow: 'Budget is not enough to reduce any balances. Increase the amount to see a plan.',
  maxMonthsExceeded: 'Projection capped at 600 months. Increase payments to accelerate payoff.',
};

const hasActiveDebts = (debts: Debt[]) => debts.some(debt => !debt.isPaid && debt.amount > 0);

const formatDifference = (value: number, formatter: Intl.NumberFormat) => {
  if (!Number.isFinite(value) || Math.abs(value) < 1) {
    return formatter.format(0);
  }
  return formatter.format(Math.round(value));
};

const StrategyCard = ({
  result,
  isRecommended,
  currencyFormatter,
}: {
  result: DebtStrategyResult;
  isRecommended: boolean;
  currencyFormatter: Intl.NumberFormat;
}) => {
  const failureMessage = result.failureReason ? FAILURE_COPY[result.failureReason] : null;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isRecommended
          ? 'border-emerald-500/40 bg-emerald-500/10 shadow-lg'
          : 'border-slate-800/70 bg-slate-950/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{result.strategy}</p>
          <h4 className="text-sm font-semibold text-slate-100">{STRATEGY_LABELS[result.strategy]}</h4>
        </div>
        {isRecommended && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
            <CheckCircle2 size={12} />
            Recommended
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Freedom date</dt>
          <dd className="font-semibold text-slate-100">
            {result.payoffDate ? formatDateForDisplay(result.payoffDate, 'MMM d, yyyy') : '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Months to finish</dt>
          <dd className="font-semibold text-slate-100">{result.months ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Projected interest</dt>
          <dd className="font-semibold text-rose-200">
            {currencyFormatter.format(Math.round(result.totalInterest))}
          </dd>
        </div>
      </dl>

      {failureMessage && (
        <p className="mt-3 text-xs font-semibold text-rose-200">
          <AlertTriangle size={12} className="mr-1 inline text-rose-200" />
          {failureMessage}
        </p>
      )}
    </div>
  );
};

export function DebtStrategyComparison({
  debts,
  currencyFormatter,
  defaultBudget,
  defaultStrategy,
  onSaveDefaults,
  isSavingDefaults,
}: DebtStrategyComparisonProps) {
  const unpaidDebts = useMemo(() => debts.filter(debt => !debt.isPaid && debt.amount > 0), [debts]);
  const totalUnpaid = useMemo(
    () => unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0),
    [unpaidDebts],
  );
  const computedDefaultBudget = useMemo(() => {
    if (unpaidDebts.length === 0) {
      return 0;
    }
    return Math.max(5000, Math.round(totalUnpaid / Math.max(1, unpaidDebts.length)));
  }, [totalUnpaid, unpaidDebts.length]);

  const initialBudget = defaultBudget && defaultBudget > 0 ? defaultBudget : computedDefaultBudget;

  const [monthlyBudget, setMonthlyBudget] = useState(() =>
    initialBudget ? String(initialBudget) : '0',
  );
  const [strategyPreference, setStrategyPreference] = useState<DebtPayoffStrategy>(
    defaultStrategy ?? 'snowball',
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (defaultBudget && defaultBudget > 0) {
      setMonthlyBudget(String(defaultBudget));
    } else if (computedDefaultBudget > 0) {
      setMonthlyBudget(String(computedDefaultBudget));
    }
  }, [defaultBudget, computedDefaultBudget]);

  useEffect(() => {
    if (defaultStrategy) {
      setStrategyPreference(defaultStrategy);
    }
  }, [defaultStrategy]);

  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  const hasDebts = hasActiveDebts(debts);

  const parsedBudget = monthlyBudget.trim() === '' ? NaN : parseFloat(monthlyBudget);
  const budgetError =
    !Number.isFinite(parsedBudget) || parsedBudget <= 0
      ? 'Enter how much you can pay toward debt each month.'
      : null;
  const sliderMin = 1000;
  const sliderMax = Math.max(sliderMin, Math.ceil(totalUnpaid / 2) || sliderMin * 10);
  const resolvedBudgetValue = Number.isFinite(parsedBudget)
    ? parsedBudget
    : initialBudget || sliderMin;
  const sliderValue = Math.min(Math.max(resolvedBudgetValue, sliderMin), sliderMax);

  const comparison = useMemo(() => {
    if (!hasDebts || budgetError || unpaidDebts.length === 0) {
      return null;
    }
    return compareDebtStrategies(unpaidDebts, parsedBudget);
  }, [hasDebts, budgetError, unpaidDebts, parsedBudget]);

  const recommendationLabel = comparison?.recommendation
    ? STRATEGY_LABELS[comparison.recommendation]
    : null;

  let highlightMessage: string | null = null;

  if (comparison && comparison.recommendation && comparison.reason === 'time' && comparison.monthsSaved) {
    highlightMessage = `${recommendationLabel} gets you debt-free about ${comparison.monthsSaved} month${
      comparison.monthsSaved === 1 ? '' : 's'
    } sooner.`;
  } else if (comparison && comparison.recommendation && comparison.reason === 'interest') {
    highlightMessage = `${recommendationLabel} keeps more cash in your pocket—roughly ${formatDifference(
      comparison.interestSaved,
      currencyFormatter,
    )} less interest.`;
  } else if (budgetError) {
    highlightMessage = budgetError;
  }

  if (!hasDebts) {
    return null;
  }

  const canPersistDefaults = Boolean(onSaveDefaults) && !budgetError;

  const handleSaveDefaultsClick = async () => {
    if (!onSaveDefaults || budgetError) return;
    try {
      await onSaveDefaults(resolvedBudgetValue, strategyPreference);
      setSaveFeedback('Defaults saved');
    } catch {
      setSaveFeedback('Unable to save defaults.');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 sm:p-6 shadow-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200/80">
            Strategy Lab
          </p>
          <h3 className="text-lg font-semibold text-slate-100">Which plan is smarter?</h3>
          <p className="text-sm text-slate-400">
            Compare paying smallest balances first vs. highest interest first using your monthly budget.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
          <BarChart3 size={14} />
          Scenario
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">Monthly debt budget</p>
            <p className="text-xs text-slate-400">Include minimums + any extra you can throw at balances.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-50">
              {currencyFormatter.format(resolvedBudgetValue)}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={500}
            value={sliderValue}
            onChange={event => setMonthlyBudget(event.target.value)}
            className="w-full accent-rose-400"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="number"
              min={0}
              value={monthlyBudget}
              onChange={event => setMonthlyBudget(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-400"
              placeholder="50000"
            />
            <button
              type="button"
              onClick={() => setMonthlyBudget(String(initialBudget || sliderMin))}
              className="rounded-full border border-slate-700/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-rose-400 hover:text-rose-100"
            >
              Use suggestion
            </button>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your default strategy
            </p>
            <div className="mt-2 inline-flex rounded-xl border border-slate-800/60 bg-slate-950/60 p-1">
              {(['snowball', 'avalanche'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStrategyPreference(option)}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-lg transition ${
                    strategyPreference === option
                      ? 'bg-rose-500/20 text-rose-100 border border-rose-400/60 shadow-inner'
                      : 'text-slate-300 hover:text-rose-100'
                  }`}
                >
                  {STRATEGY_LABELS[option]}
                </button>
              ))}
            </div>
            {onSaveDefaults && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDefaultsClick}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-400/20 disabled:opacity-40"
                  disabled={!canPersistDefaults || Boolean(isSavingDefaults)}
                >
                  {isSavingDefaults ? 'Saving…' : 'Save as default'}
                </button>
                {saveFeedback && (
                  <span className="text-xs font-semibold text-emerald-200">{saveFeedback}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {comparison && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <StrategyCard
              result={comparison.snowball}
              isRecommended={comparison.recommendation === 'snowball'}
              currencyFormatter={currencyFormatter}
            />
            <StrategyCard
              result={comparison.avalanche}
              isRecommended={comparison.recommendation === 'avalanche'}
              currencyFormatter={currencyFormatter}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-indigo-100 flex items-start gap-3">
            <ArrowRightLeft size={18} className="text-indigo-200" />
            <div>
              {highlightMessage || 'Adjust the slider to see how your plan shifts.'}
            </div>
          </div>
        </>
      )}

      {!comparison && (
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100 flex items-start gap-3">
          <AlertTriangle size={18} />
          <div>{highlightMessage ?? 'Enter a budget to preview payoff strategies.'}</div>
        </div>
      )}
    </div>
  );
}
