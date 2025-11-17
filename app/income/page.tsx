'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SyncStatus from '@/components/SyncStatus';
import { storage, Income, DEFAULT_CURRENCY_CODE, DEFAULT_CURRENCY_LOCALE } from '@/lib/storage';
import {
  PlusCircle,
  Trash2,
  DollarSign,
  TrendingUp,
  Search,
  RefreshCw,
  LayoutList,
  List,
  X,
} from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';

const quickAmounts = [100000, 250000, 500000, 1000000] as const;

export default function IncomePage() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);

  const queryClient = useQueryClient();

  const budgetSettingsQuery = useQuery({
    queryKey: ['budgetSettings'],
    queryFn: () => storage.getBudgetSettings(),
  });

  const currencyLocale = budgetSettingsQuery.data?.currencyLocale ?? DEFAULT_CURRENCY_LOCALE;
  const currencyCode = budgetSettingsQuery.data?.currencyCode ?? DEFAULT_CURRENCY_CODE;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyLocale, currencyCode],
  );

  const formatCurrency = (value: number) => currencyFormatter.format(value);

  const openFormSheet = () => {
    setFormError(null);
    setIsFormSheetOpen(true);
  };

  const closeFormSheet = () => {
    setIsFormSheetOpen(false);
    setFormError(null);
  };

  const {
    data: incomesData = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['income'],
    queryFn: () => storage.getIncome(),
  });

  const incomes = useMemo<Income[]>(() => {
    return [...incomesData].sort((a, b) => b.month.localeCompare(a.month));
  }, [incomesData]);

  const saveIncomeMutation = useMutation({
    mutationFn: storage.saveIncome,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['income'] });
      setAmount('');
      setSource('');
      setFormError(null);
      setListError(null);
      if (isFormSheetOpen) {
        closeFormSheet();
      }
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: storage.deleteIncome,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['income'] });
      setListError(null);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }

    if (!source.trim()) {
      setFormError('Please enter an income source.');
      return;
    }

    try {
      await saveIncomeMutation.mutateAsync({
        amount: parseFloat(amount),
        source: source.trim(),
        month,
      });
    } catch {
      setFormError('We could not save that income entry. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income record?')) return;

    try {
      await deleteIncomeMutation.mutateAsync(id);
    } catch {
      setListError('Failed to delete income record. Please refresh.');
    }
  };

  const currentMonthTotal = incomes
    .filter(i => i.month === format(new Date(), 'yyyy-MM'))
    .reduce((sum, i) => sum + i.amount, 0);

  const filteredIncome = useMemo(() => {
    if (!searchTerm) return incomes;
    return incomes.filter(entry =>
      entry.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.month.includes(searchTerm)
    );
  }, [incomes, searchTerm]);

  const filteredTotal = useMemo(() => {
    return filteredIncome.reduce((sum, entry) => sum + entry.amount, 0);
  }, [filteredIncome]);

  const totalCount = incomes.length;
  const filteredCount = filteredIncome.length;

  const annualTotal = useMemo(() => {
    const currentYear = format(new Date(), 'yyyy');
    return incomes
      .filter(income => income.month.startsWith(currentYear))
      .reduce((sum, income) => sum + income.amount, 0);
  }, [incomes]);

  const topSources = useMemo(() => {
    const bucket = incomes.reduce<Record<string, number>>((acc, income) => {
      acc[income.source] = (acc[income.source] ?? 0) + income.amount;
      return acc;
    }, {});
    return Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [incomes]);

  const trendMonths = useMemo(() => {
    const base = startOfMonth(new Date());
    return Array.from({ length: 6 }, (_, index) => subMonths(base, 5 - index));
  }, []);

  const monthlyTrend = useMemo(() => {
    return trendMonths.map(referenceDate => {
      const monthKey = format(referenceDate, 'yyyy-MM');
      const total = incomes
        .filter(entry => entry.month === monthKey)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return {
        monthKey,
        label: format(referenceDate, 'MMM'),
        total,
      };
    });
  }, [trendMonths, incomes]);

  const trendMax = useMemo(() => {
    return monthlyTrend.reduce((max, entry) => Math.max(max, entry.total), 0);
  }, [monthlyTrend]);

  const latestTrend = monthlyTrend.at(-1);
  const previousTrend = monthlyTrend.at(-2);
  const latestTrendTotal = latestTrend?.total ?? 0;
  const previousTrendTotal = previousTrend?.total ?? 0;
  const incomeDelta = latestTrendTotal - previousTrendTotal;
  const incomeDeltaPercent = previousTrendTotal > 0 ? (incomeDelta / previousTrendTotal) * 100 : null;
  const currentTrendLabel = latestTrend?.label ?? format(new Date(), 'MMM');

  const describeDelta = (value: number, percent: number | null) => {
    if (value === 0) {
      return 'No change from last month';
    }
    const direction = value > 0 ? 'Up' : 'Down';
    const percentText = percent !== null ? ` (${Math.abs(percent).toFixed(1)}%)` : '';
    return `${direction} ${currencyFormatter.format(Math.abs(value))}${percentText}`;
  };

  const incomeDeltaLabel = describeDelta(incomeDelta, incomeDeltaPercent);

  const expectedMonthlyIncome = budgetSettingsQuery.data?.monthlyIncome ?? 0;
  const hasIncomeTarget = expectedMonthlyIncome > 0;
  const incomeProgressPercent = hasIncomeTarget
    ? Math.min(100, (currentMonthTotal / expectedMonthlyIncome) * 100)
    : null;
  const incomeProgressLabel = hasIncomeTarget
    ? `${formatCurrency(currentMonthTotal)} of ${formatCurrency(expectedMonthlyIncome)}`
    : 'Set a monthly income target in Settings to track expectations.';
  const incomeProgressStatus =
    hasIncomeTarget && incomeProgressPercent !== null
      ? incomeProgressPercent >= 100
        ? 'Target met'
        : `${Math.floor(incomeProgressPercent)}% of target`
      : 'No target set';

  const recurringTemplates = useMemo(() => {
    const seen = new Set<string>();
    const templates: Array<{ source: string; amount: number }> = [];
    incomes.forEach(entry => {
      if (seen.has(entry.source)) return;
      templates.push({ source: entry.source, amount: entry.amount });
      seen.add(entry.source);
      if (templates.length >= 3) {
        return;
      }
    });
    return templates;
  }, [incomes]);

  const activeFilterChips = useMemo(
    () =>
      searchTerm.trim().length > 0
        ? [
            {
              key: 'search',
              label: `Search: ${searchTerm.trim()}`,
              onRemove: () => setSearchTerm(''),
            },
          ]
        : [],
    [searchTerm],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 pb-14 sm:pb-18">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white px-4 sm:px-6 lg:px-12 pt-8 pb-10 lg:pt-10 lg:pb-12 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Income</h1>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <p className="text-emerald-200 text-sm">This month:</p>
            <p className="text-xl font-bold text-emerald-100">{formatCurrency(currentMonthTotal)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 -mt-6 lg:-mt-10 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8 grid gap-4 lg:gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">This month</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">{formatCurrency(currentMonthTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Year to date</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">{formatCurrency(annualTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Entries logged</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">{incomes.length}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Expected vs actual</h3>
              <p className="text-sm text-slate-400">
                Track progress toward your monthly income target.
              </p>
            </div>
            <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              {incomeProgressStatus}
            </div>
          </div>
          <div className="mt-4 h-3 w-full rounded-full bg-slate-800/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width]"
              style={{ width: `${incomeProgressPercent ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{incomeProgressLabel}</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SyncStatus
            isLoading={isLoading}
            isFetching={isFetching}
            lastUpdated={dataUpdatedAt}
            className="justify-start"
          />
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/20 sm:self-auto"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing' : 'Refresh data'}
          </button>
        </div>

        {(isError || listError) && (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {listError || 'Unable to refresh income records. Showing any cached data.'}
            {isError && error instanceof Error ? ` (${error.message})` : null}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Filtered total</p>
              <p className="text-xl font-semibold text-emerald-200 break-words sm:text-2xl">
                {currencyFormatter.format(filteredTotal)}
              </p>
              <p className="text-xs text-slate-400">
                {filteredCount === totalCount
                  ? 'Showing every entry'
                  : `Showing ${filteredCount} of ${totalCount} entries`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                type="button"
                onClick={openFormSheet}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-400/30 lg:hidden"
              >
                <PlusCircle size={16} />
                Add income
              </button> */}
              <div className="inline-flex rounded-xl border border-slate-800/70 bg-slate-950/50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('detailed')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'detailed'
                      ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-100 shadow-inner'
                      : 'text-slate-300 hover:text-emerald-100'
                  }`}
                  aria-pressed={viewMode === 'detailed'}
                >
                  <LayoutList size={16} />
                  Detailed
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'compact'
                      ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-100 shadow-inner'
                      : 'text-slate-300 hover:text-emerald-100'
                  }`}
                  aria-pressed={viewMode === 'compact'}
                >
                  <List size={16} />
                  Compact
                </button>
              </div>
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map(chip => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 transition hover:border-emerald-500/60 hover:text-emerald-100"
                >
                  {chip.label}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus-within:border-emerald-500">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search source or month"
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
              />
            </label>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-emerald-400 hover:text-emerald-100"
              >
                Clear search
              </button>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-400 hover:text-emerald-100"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 lg:gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Monthly inflow</h3>
                <p className="text-sm text-slate-400">Total income over the past six months.</p>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  This month ({currentTrendLabel})
                </p>
                <p className="text-sm font-semibold text-emerald-200">
                  {currencyFormatter.format(latestTrendTotal)}
                </p>
                <p className="text-xs text-slate-400">{incomeDeltaLabel}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex h-40 items-end gap-2 sm:gap-3">
                {monthlyTrend.map(point => {
                  const height =
                    trendMax > 0 ? Math.max(12, (point.total / trendMax) * 100) : 0;
                  return (
                    <div key={point.monthKey} className="flex flex-1 h-full flex-col items-center gap-2">
                      <div className="flex h-full w-full max-w-[42px] items-end rounded-2xl border border-emerald-500/40 bg-slate-950/40 p-0.5">
                        <div
                          className="w-full rounded-xl bg-gradient-to-t from-emerald-600 via-emerald-400 to-teal-400 transition-[height]"
                          style={{ height: `${height}%` }}
                          title={`${point.label}: ${currencyFormatter.format(point.total)}`}
                        />
                      </div>
                      <div className="flex flex-col items-center text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <span>{point.label}</span>
                        <span className="text-[10px] text-emerald-200">
                          {currencyFormatter.format(point.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                Peaks highlight stronger months; try logging consistent amounts to smooth out cashflow.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Top sources
            </h3>
            {topSources.length > 0 ? (
              <div className="mt-4 space-y-3">
                {topSources.map(([label, total]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
                      <p className="text-[11px] text-slate-400">Lifetime total</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-200">
                      {currencyFormatter.format(total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Add income entries to see your top sources.</p>
            )}
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-5 shadow-lg lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-200/90">Quick add</p>
              <h3 className="text-lg font-semibold text-slate-100">Capture income fast</h3>
              <p className="mt-1 text-sm text-emerald-100/80">
                Use a preset amount or open the form to log the full details.
              </p>
            </div>
            <button
              type="button"
              onClick={openFormSheet}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-md transition hover:bg-emerald-400"
            >
              <PlusCircle size={16} />
              Add
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickAmounts.map(value => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAmount(String(value));
                  openFormSheet();
                }}
                className="rounded-full border border-emerald-500/50 bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:bg-emerald-400/35"
              >
                +{currencyFormatter.format(value)}
              </button>
            ))}
          </div>
          {recurringTemplates.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-emerald-200/90">Recurring sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recurringTemplates.map(template => (
                  <button
                    key={template.source}
                    type="button"
                    onClick={() => {
                      setSource(template.source);
                      setAmount(String(template.amount));
                      setMonth(format(new Date(), 'yyyy-MM'));
                      openFormSheet();
                    }}
                    className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/30"
                  >
                    {template.source}
                    <span className="ml-1 text-emerald-200/80">
                      {currencyFormatter.format(template.amount)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-emerald-200/70">
                Prefills the amount, source, and current month.
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-7 shadow-xl lg:block"
        >
          <h2 className="mb-5 flex items-center gap-3 text-lg font-bold text-slate-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-200 shadow-md">
              <PlusCircle size={18} className="text-emerald-100" />
            </span>
            <span>Add New Income</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Amount ({currencyCode})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="300000"
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                inputMode="numeric"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {quickAmounts.map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/60 hover:text-emerald-100"
                  >
                    +{currencyFormatter.format(value)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Salary, Bonus, Freelance, etc."
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
              {recurringTemplates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-200/70">
                  {recurringTemplates.map(template => (
                    <button
                      key={template.source}
                      type="button"
                      onClick={() => {
                        setSource(template.source);
                        setAmount(String(template.amount));
                        setMonth(format(new Date(), 'yyyy-MM'));
                      }}
                      className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-semibold uppercase tracking-wide transition hover:border-emerald-400 hover:bg-emerald-400/30"
                    >
                      {template.source}
                      <span className="ml-1 text-emerald-200/80">
                        {currencyFormatter.format(template.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Month
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 font-medium text-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saveIncomeMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 font-bold text-slate-950 shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle size={20} className="text-slate-950" />
              {saveIncomeMutation.isPending ? 'Saving...' : 'Add Income'}
            </button>
            {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}
          </div>
        </form>

        {/* Income List */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-200" />
            Income History
          </h2>
          
          {isLoading ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/70 p-9 sm:p-12 text-center text-slate-300">
              Fetching your income records...
            </div>
          ) : filteredIncome.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl shadow-md p-10 text-center border border-slate-800/70">
              <div className="text-6xl mb-4">💰</div>
              <p className="text-slate-300 font-medium">No income recorded yet</p>
              <p className="text-sm text-slate-500 mt-2">Add your first income above</p>
            </div>
          ) : (
            filteredIncome.map(income => {
              if (viewMode === 'compact') {
                return (
                  <div
                    key={income.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-emerald-200">{income.source}</span>
                      <span className="text-xs text-slate-500">{income.month}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-100">
                        {currencyFormatter.format(income.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(income.id)}
                        className="rounded-lg p-1 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-60"
                        disabled={deleteIncomeMutation.isPending}
                        aria-label="Delete income"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={income.id}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-md transition-all hover:shadow-lg sm:p-6 lg:p-7"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-100 shadow-md">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">{income.source}</p>
                          <p className="text-xs text-slate-400">{income.month}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-emerald-300">
                        {currencyFormatter.format(income.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(income.id)}
                      className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-60"
                      disabled={deleteIncomeMutation.isPending}
                      aria-label="Delete income"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isFormSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 backdrop-blur-sm lg:hidden">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Close income form"
              onClick={closeFormSheet}
            />
            <div className="relative w-full max-h-[82vh] overflow-y-auto rounded-t-3xl border border-emerald-500/20 bg-slate-950 p-5 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Log Income</h2>
                  <button
                    type="button"
                    onClick={closeFormSheet}
                    className="rounded-full border border-emerald-500/30 p-2 text-emerald-100 transition hover:bg-emerald-500/20"
                    aria-label="Close income form"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/60 p-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-emerald-100">
                      Amount ({currencyCode})
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="300000"
                      className="w-full rounded-xl border-2 border-emerald-500/40 bg-slate-950/80 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-emerald-200/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 transition-all shadow-sm"
                      inputMode="numeric"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {quickAmounts.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAmount(String(value))}
                          className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-400/25"
                        >
                          +{currencyFormatter.format(value)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-emerald-100">
                      Source
                    </label>
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="Salary, Bonus, Freelance, etc."
                      className="w-full rounded-xl border-2 border-emerald-500/40 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-emerald-200/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 transition-all shadow-sm"
                    />
                    {recurringTemplates.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-200/70">
                        {recurringTemplates.map(template => (
                          <button
                            key={template.source}
                            type="button"
                            onClick={() => {
                              setSource(template.source);
                              setAmount(String(template.amount));
                              setMonth(format(new Date(), 'yyyy-MM'));
                            }}
                            className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 font-semibold uppercase tracking-wide transition hover:border-emerald-400 hover:bg-emerald-400/30"
                          >
                            {template.source}
                            <span className="ml-1 text-emerald-200/80">
                              {currencyFormatter.format(template.amount)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-emerald-100">
                      Month
                    </label>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full rounded-xl border-2 border-emerald-500/40 bg-slate-950/80 px-4 py-3 font-medium text-slate-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}

                <button
                  type="submit"
                  disabled={saveIncomeMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-md transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PlusCircle size={18} className="text-slate-950" />
                  {saveIncomeMutation.isPending ? 'Saving...' : 'Save income'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
