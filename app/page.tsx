'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SyncStatus from '@/components/SyncStatus';
import { storage, Expense } from '@/lib/storage';
import { Wallet, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, PlusCircle, RefreshCw, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { formatDateForDisplay, parseAppDate } from '@/lib/datetime';
import NotificationSettings from '@/components/NotificationSettings';
import { useDebtReminders } from '@/hooks/useDebtReminders';
import { calculateMonthlyOverflow } from '@/lib/overflow';
import { useOverflowNotifications } from '@/hooks/useOverflowNotifications';
import { calculatePayoffSchedule } from '@/lib/debtCalculator';
export default function Dashboard() {
  useOverflowNotifications();
  useDebtReminders();
  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: () => storage.getExpenses(),
  });

  const incomeQuery = useQuery({
    queryKey: ['income'],
    queryFn: () => storage.getIncome(),
  });

  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: () => storage.getDebts(),
  });
  
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const income = useMemo(() => incomeQuery.data ?? [], [incomeQuery.data]);
  const debts = useMemo(() => debtsQuery.data ?? [], [debtsQuery.data]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cashflowTitleId = useId();
  const cashflowDescId = useId();
  const cashflowTableId = useId();
  const currentMonthKey = format(new Date(), 'yyyy-MM');

  const monthlyExpenses = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return expenses.reduce((sum, expense) => {
      const parsed = parseAppDate(expense.date);
      if (!parsed || !isWithinInterval(parsed, { start: monthStart, end: monthEnd })) {
        return sum;
      }
      return sum + expense.amount;
    }, 0);
  }, [expenses]);

  const todayExpenses = useMemo(() => {
    const today = new Date();
    return expenses.reduce((sum, expense) => {
      const parsed = parseAppDate(expense.date);
      if (!parsed || !isSameDay(parsed, today)) {
        return sum;
      }
      return sum + expense.amount;
    }, 0);
  }, [expenses]);

  const monthlyIncome = useMemo(() => {
    return income
      .filter(entry => entry.month === currentMonthKey)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [income, currentMonthKey]);

  const totalDebts = useMemo(() => {
    return debts.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0);
  }, [debts]);

  const recentExpenses = useMemo<Expense[]>(() => {
    return [...expenses]
      .sort((a, b) => {
        const aTime = parseAppDate(a.date)?.getTime() ?? 0;
        const bTime = parseAppDate(b.date)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [expenses]);

  const trendMonths = useMemo(() => {
    const reference = new Date(`${currentMonthKey}-01T00:00:00`);
    const base = Number.isNaN(reference.getTime()) ? startOfMonth(new Date()) : startOfMonth(reference);
    return Array.from({ length: 6 }, (_, index) => subMonths(base, 5 - index));
  }, [currentMonthKey]);

  const monthlyExpenseTrend = useMemo(() => {
    return trendMonths.map(referenceDate => {
      const rangeStart = startOfMonth(referenceDate);
      const rangeEnd = endOfMonth(referenceDate);
      const total = expenses.reduce((sum, expense) => {
        const parsed = parseAppDate(expense.date);
        if (!parsed || !isWithinInterval(parsed, { start: rangeStart, end: rangeEnd })) {
          return sum;
        }
        return sum + expense.amount;
      }, 0);

      return {
        monthKey: format(referenceDate, 'yyyy-MM'),
        label: format(referenceDate, 'MMM'),
        total,
      };
    });
  }, [trendMonths, expenses]);

  const monthlyIncomeTrend = useMemo(() => {
    return trendMonths.map(referenceDate => {
      const monthKey = format(referenceDate, 'yyyy-MM');
      const total = income
        .filter(entry => entry.month === monthKey)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return {
        monthKey,
        label: format(referenceDate, 'MMM'),
        total,
      };
    });
  }, [trendMonths, income]);

  const combinedTrend = useMemo(() => {
    return monthlyExpenseTrend.map((expensePoint, index) => {
      const incomePoint = monthlyIncomeTrend[index];
      return {
        monthKey: expensePoint.monthKey,
        label: expensePoint.label,
        expense: expensePoint.total,
        income: incomePoint?.total ?? 0,
      };
    });
  }, [monthlyExpenseTrend, monthlyIncomeTrend]);

  const trendMax = useMemo(() => {
    return combinedTrend.reduce((max, point) => Math.max(max, point.expense, point.income), 0);
  }, [combinedTrend]);
  const trendRangeLabel = useMemo(() => {
    if (combinedTrend.length === 0) return 'no data available';
    const first = combinedTrend[0]?.label;
    const last = combinedTrend.at(-1)?.label;
    return first && last ? `${first} to ${last}` : 'recent months';
  }, [combinedTrend]);

  const latestExpenseTotal = monthlyExpenseTrend.at(-1)?.total ?? 0;
  const previousExpenseTotal = monthlyExpenseTrend.at(-2)?.total ?? 0;
  const expenseDelta = latestExpenseTotal - previousExpenseTotal;
  const expenseDeltaPercent = previousExpenseTotal > 0 ? (expenseDelta / previousExpenseTotal) * 100 : null;

  const latestIncomeTotal = monthlyIncomeTrend.at(-1)?.total ?? 0;
  const previousIncomeTotal = monthlyIncomeTrend.at(-2)?.total ?? 0;
  const incomeDelta = latestIncomeTotal - previousIncomeTotal;
  const incomeDeltaPercent = previousIncomeTotal > 0 ? (incomeDelta / previousIncomeTotal) * 100 : null;
  const topCategories = useMemo(() => {
      const reference = new Date(`${currentMonthKey}-01T00:00:00`);
      const now = Number.isNaN(reference.getTime()) ? new Date() : reference;
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const categoryTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
        const parsed = parseAppDate(expense.date);
        if (!parsed || !isWithinInterval(parsed, { start: monthStart, end: monthEnd })) {
          return acc;
        }
        acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
        return acc;
      }, {});

      return Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    }, [expenses, currentMonthKey]);
  const currentTrendLabel = monthlyExpenseTrend.at(-1)?.label ?? format(new Date(), 'MMM');
  const topCategoryMax = topCategories[0]?.[1] ?? 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);

  const categoryPalette = [
    { fill: 'bg-amber-500/25', dot: 'bg-amber-400' },
    { fill: 'bg-emerald-500/25', dot: 'bg-emerald-400' },
    { fill: 'bg-sky-500/25', dot: 'bg-sky-400' },
    { fill: 'bg-purple-500/25', dot: 'bg-purple-400' },
    { fill: 'bg-pink-500/25', dot: 'bg-pink-400' },
  ] as const;

  const computeTrendHeight = (value: number) => {
    if (trendMax === 0 || value <= 0) {
      return '0%';
    }
    const raw = (value / trendMax) * 100;
    const clamped = Math.max(raw, 8);
    return `${clamped}%`;
  };

  const describeDelta = (value: number, percent: number | null, noun: string) => {
    if (value === 0) {
      return `No change in ${noun}`;
    }
    const direction = value > 0 ? 'Up' : 'Down';
    const percentText = percent !== null ? ` (${Math.abs(percent).toFixed(1)}%)` : '';
    return `${direction} ${formatCurrency(Math.abs(value))}${percentText}`;
  };

  const expenseDeltaLabel = describeDelta(expenseDelta, expenseDeltaPercent, 'spending');
  const incomeDeltaLabel = describeDelta(incomeDelta, incomeDeltaPercent, 'income');

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        expensesQuery.refetch(),
        incomeQuery.refetch(),
        debtsQuery.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = expensesQuery.isLoading || incomeQuery.isLoading || debtsQuery.isLoading;
  const isFetching = expensesQuery.isFetching || incomeQuery.isFetching || debtsQuery.isFetching;
  const lastUpdated = Math.max(
    expensesQuery.dataUpdatedAt ?? 0,
    incomeQuery.dataUpdatedAt ?? 0,
    debtsQuery.dataUpdatedAt ?? 0,
  );
  const combinedError = expensesQuery.error || incomeQuery.error || debtsQuery.error;
  const overviewErrorMessage = combinedError
    ? `We could not refresh your latest data. Showing any cached information instead.${
        combinedError instanceof Error ? ` (${combinedError.message})` : ''
      }`
    : null;

  const balance = monthlyIncome - monthlyExpenses - totalDebts;
  const monthlySurplus = Math.max(0, monthlyIncome - monthlyExpenses);
  const balanceMessage = balance > 0 ? 'Surplus' : balance === 0 ? 'Balanced' : 'Deficit';

  const { data: settings } = useQuery({
    queryKey: ['budgetSettings'],
    queryFn: () => storage.getBudgetSettings(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: () => storage.getSavingsGoals(),
  });

  // Calculate overflow
  const overflowCalc = useMemo(() => {
    if (!settings) return null;
    // You'll need to get expenses, income, debts from queries
    return calculateMonthlyOverflow(expenses, income, debts, goals, settings);
  }, [expenses, income, debts, goals, settings]);

  const debtFreedomTracker = useMemo(() => {
    const activeDebts = debts.filter(debt => !debt.isPaid);
    if (activeDebts.length === 0) {
      return {
        items: [] as Array<{
          id: string;
          name: string;
          amount: number;
          payment: number;
          payoffDate: Date | null;
          months: number | null;
          totalInterest: number;
          dueDate: string;
        }>,
        overallDate: null as Date | null,
        overallMonths: null as number | null,
        totalInterest: 0,
      };
    }

    const items = activeDebts.map(debt => {
      const estimatedPayment = Math.max(10000, Math.round(debt.amount / 12));
      const projection = calculatePayoffSchedule(
        debt.amount,
        estimatedPayment,
        debt.interestRate ?? 0,
      );
      const payoffDate = projection?.payoffDate ?? parseAppDate(debt.dueDate) ?? null;

      return {
        id: debt.id,
        name: debt.name,
        amount: debt.amount,
        payment: estimatedPayment,
        payoffDate,
        months: projection?.months ?? null,
        totalInterest: projection?.totalInterest ?? 0,
        dueDate: debt.dueDate,
      };
    });

    const overallDate = items.reduce<Date | null>((latest, item) => {
      if (!item.payoffDate) return latest;
      if (!latest || item.payoffDate > latest) {
        return item.payoffDate;
      }
      return latest;
    }, null);

    const overallMonths = items.reduce<number | null>((max, item) => {
      if (item.months == null) return max;
      if (max == null || item.months > max) {
        return item.months;
      }
      return max;
    }, null);

    const totalInterest = items.reduce((sum, item) => sum + item.totalInterest, 0);

    return {
      items,
      overallDate,
      overallMonths,
      totalInterest,
    };
  }, [debts]);

  const goalBreakdown = useMemo(() => {
    const activeGoals = goals.filter(goal => !goal.isCompleted);
    if (activeGoals.length === 0) {
      return {
        items: [] as Array<{
          id: string;
          name: string;
          remaining: number;
          progress: number;
          eta: Date | null;
          months: number | null;
          color: string;
        }>,
        monthlyPerGoal: 0,
        monthlyBudget: 0,
      };
    }

    const monthlyBudget =
      overflowCalc && overflowCalc.overflow > 0 ? overflowCalc.overflow : monthlySurplus;
    const monthlyPerGoal =
      monthlyBudget > 0 ? Math.max(5000, Math.round(monthlyBudget / activeGoals.length)) : 0;

    const items = activeGoals.map(goal => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const months = monthlyPerGoal > 0 ? Math.ceil(remaining / monthlyPerGoal) : null;
      const eta = months ? addMonths(new Date(), months) : null;
      const progress =
        goal.targetAmount > 0
          ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
          : 0;

      return {
        id: goal.id,
        name: goal.name,
        remaining,
        progress,
        eta,
        months,
        color: goal.color,
      };
    });

    return {
      items,
      monthlyPerGoal,
      monthlyBudget,
    };
  }, [goals, overflowCalc, monthlySurplus]);

  const goalDelayMessage = (() => {
    if (goalBreakdown.items.length === 0) {
      return 'No active savings goals—channel every spare yen into the debt snowball first.';
    }
    if (debtFreedomTracker.items.length === 0) {
      return 'Debt-free! Keep routing extra cash toward the next savings milestone.';
    }
    if (goalBreakdown.monthlyPerGoal === 0) {
      return 'No overflow assigned to goals this month. Increase surplus or pause contributions until debt balances fall.';
    }

    const slowGoal = goalBreakdown.items.reduce<(typeof goalBreakdown.items)[number] | null>(
      (current, item) => {
        if (!current) return item;
        const currentMonths = current.months ?? -1;
        const itemMonths = item.months ?? -1;
        if (itemMonths > currentMonths) {
          return item;
        }
        return current;
      },
      null,
    );

    if (!slowGoal?.months || debtFreedomTracker.overallMonths == null) {
      return `Funding plan synced. Keep auto-saving ${formatCurrency(goalBreakdown.monthlyPerGoal)} per goal.`;
    }

    const extraMonths = slowGoal.months - debtFreedomTracker.overallMonths;
    if (extraMonths <= 0) {
      return `All goals finish before debt freedom. Keep auto-saving ${formatCurrency(goalBreakdown.monthlyPerGoal)} per goal.`;
    }

    const extraWeeks = Math.max(1, Math.round(extraMonths * 4));
    return `${slowGoal.name} would delay debt freedom by ~${extraWeeks} weeks at the current pace. Shift overflow back to debts once the essentials are funded.`;
  })();

  const showFreedomTracker =
    debtFreedomTracker.items.length > 0 || goalBreakdown.items.length > 0;
  const debtFreedomSummary = debtFreedomTracker.items.length > 0
    ? debtFreedomTracker.overallDate
      ? `Projected finish ${format(debtFreedomTracker.overallDate, 'MMM d, yyyy')}`
      : 'Using current due dates as payoff milestones.'
    : 'Add a debt or goal to unlock this view.';
  const trackerInterestLabel =
    debtFreedomTracker.totalInterest > 0
      ? `Interest exposure ≈ ${formatCurrency(Math.round(debtFreedomTracker.totalInterest))}`
      : null;
  const averageDebtPayment =
    debtFreedomTracker.items.length > 0
      ? Math.round(
          debtFreedomTracker.items.reduce((sum, item) => sum + item.payment, 0) /
            debtFreedomTracker.items.length,
        )
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 pb-20 lg:pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white px-4 sm:px-6 lg:px-12 pt-8 pb-12 lg:pt-10 lg:pb-14 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Welcome back!</p>
              <h1 className="text-2xl font-bold">Finance Dashboard</h1>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Wallet className="text-white" size={24} />
            </div>
          </div>
          
          {/* Balance Card */}
          <div className="bg-slate-900/70 backdrop-blur-lg rounded-[2.25rem] p-5 sm:p-7 lg:p-8 border border-slate-800/80 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium mb-1">Current Balance</p>
                <p className={`break-words leading-tight text-4xl sm:text-5xl font-bold ${balance >= 0 ? 'text-slate-50' : 'text-rose-300'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                balance > 0
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : balance === 0
                  ? 'bg-slate-500/30 text-slate-200'
                  : 'bg-rose-500/30 text-rose-200'
              }`}
              >
                {balanceMessage}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {balance >= 0
                ? '🎉 Excellent progress. Keep allocating a portion of this surplus to future goals.'
                : '⚠️ Spending outpaced income. Review expenses below and adjust upcoming payments.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
              >
                <PlusCircle size={16} />
                Add Expense
              </Link>
              <Link
                href="/income"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
              >
                <ArrowUpRight size={16} />
                Log Income
              </Link>
              <Link
                href="/debts"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
              >
                <CreditCard size={16} />
                Review Debts
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 -mt-8 lg:-mt-12">
        {overviewErrorMessage && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {overviewErrorMessage}
          </div>
        )}
        {isLoading && (
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500/70"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-slate-300"></span>
              </span>
              <span className="text-sm font-medium uppercase tracking-[0.3em]">Loading overview</span>
            </div>
          </div>
        )}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SyncStatus
            isLoading={isLoading}
            isFetching={isFetching}
            lastUpdated={lastUpdated || undefined}
            className="justify-start"
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isRefreshing}
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-800/70 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={`${isFetching || isRefreshing ? 'animate-spin text-indigo-300' : 'text-indigo-200'}`}
            />
            {isFetching || isRefreshing ? 'Refreshing' : 'Refresh data'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7 xl:gap-8 mb-8">
          {/* Income Card */}
          <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 lg:p-7 shadow-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-500/80 rounded-xl flex items-center justify-center shadow-md">
                <ArrowUpRight className="text-slate-950" size={20} />
              </div>
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-900/40 px-2 py-1 rounded-full">
                Income
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-100 mb-1">¥{monthlyIncome.toLocaleString()}</p>
            <p className="text-xs text-slate-400">This month</p>
          </div>

          {/* Expenses Card */}
          <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 lg:p-7 shadow-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-rose-500/80 rounded-xl flex items-center justify-center shadow-md">
                <ArrowDownRight className="text-slate-950" size={20} />
              </div>
              <span className="text-xs font-semibold text-rose-300 bg-rose-900/40 px-2 py-1 rounded-full">
                Expenses
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-100 mb-1">¥{monthlyExpenses.toLocaleString()}</p>
            <p className="text-xs text-slate-400">This month</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:gap-7 xl:gap-8">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 lg:p-7 shadow-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 id={cashflowTitleId} className="text-lg font-semibold text-slate-100">
                  Monthly cashflow
                </h3>
                <p className="text-sm text-slate-400">Income vs spending across the past six months.</p>
                <p id={cashflowDescId} className="sr-only">
                  Bar chart compares monthly income and expenses from {trendRangeLabel}. Detailed values follow in the
                  table below.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  This month ({currentTrendLabel})
                </p>
                <p
                  className={`text-sm font-semibold ${
                    latestIncomeTotal - latestExpenseTotal >= 0 ? 'text-emerald-200' : 'text-rose-200'
                  }`}
                >
                  {formatCurrency(latestIncomeTotal - latestExpenseTotal)}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Income · {incomeDeltaLabel} vs last month
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  Spending · {expenseDeltaLabel} vs last month
                </span>
              </div>
              <div
                className="flex items-end gap-2 sm:gap-3 lg:gap-4"
                role="img"
                aria-labelledby={`${cashflowTitleId} ${cashflowDescId}`}
                aria-describedby={cashflowTableId}
                tabIndex={0}
              >
                {combinedTrend.map(point => {
                  const incomeHeight = computeTrendHeight(point.income);
                  const expenseHeight = computeTrendHeight(point.expense);
                  const net = point.income - point.expense;
                  return (
                    <div key={point.monthKey} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end gap-1 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-1">
                        <div
                          className="flex-1 rounded-full bg-emerald-500/80 transition-[height]"
                          style={{ height: incomeHeight }}
                          title={`Income ${formatCurrency(point.income)}`}
                        />
                        <div
                          className="flex-1 rounded-full bg-rose-500/80 transition-[height]"
                          style={{ height: expenseHeight }}
                          title={`Spending ${formatCurrency(point.expense)}`}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {point.label}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${net >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}
                        >
                          {`${net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(net))}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table
                id={cashflowTableId}
                className="min-w-full text-left text-xs sm:text-sm text-slate-300"
              >
                <caption className="sr-only">Table listing monthly income, expenses, and net cashflow</caption>
                <thead>
                  <tr className="text-slate-400">
                    <th scope="col" className="px-2 py-1 font-semibold uppercase tracking-wide">
                      Month
                    </th>
                    <th scope="col" className="px-2 py-1 font-semibold uppercase tracking-wide">
                      Income
                    </th>
                    <th scope="col" className="px-2 py-1 font-semibold uppercase tracking-wide">
                      Expenses
                    </th>
                    <th scope="col" className="px-2 py-1 font-semibold uppercase tracking-wide">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {combinedTrend.map(point => {
                    const net = point.income - point.expense;
                    return (
                      <tr key={`table-${point.monthKey}`} className="border-t border-slate-800/60">
                        <th scope="row" className="px-2 py-1 font-semibold text-slate-200">
                          {point.label}
                        </th>
                        <td className="px-2 py-1">{formatCurrency(point.income)}</td>
                        <td className="px-2 py-1">{formatCurrency(point.expense)}</td>
                        <td
                          className={`px-2 py-1 font-semibold ${
                            net >= 0 ? 'text-emerald-200' : 'text-rose-200'
                          }`}
                        >
                          {`${net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(net))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 lg:p-7 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Spending by category</h3>
                <p className="text-sm text-slate-400">Top categories in {currentTrendLabel}.</p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Month spend</p>
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(monthlyExpenses)}</p>
              </div>
            </div>
            {topCategories.length > 0 ? (
              <div className="mt-5 space-y-3">
                {topCategories.map(([category, total], index) => {
                  const widthPercent = topCategoryMax > 0 ? (total / topCategoryMax) * 100 : 0;
                  const safeWidth = total > 0 ? Math.min(100, Math.max(widthPercent, 12)) : 0;
                  const share = monthlyExpenses > 0 ? Math.round((total / monthlyExpenses) * 100) : 0;
                  const palette = categoryPalette[index % categoryPalette.length];
                  return (
                    <div
                      key={category}
                      className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3"
                    >
                      <div
                        className={`absolute inset-y-1 left-1 rounded-xl ${palette.fill}`}
                        style={{ width: `${safeWidth}%` }}
                      />
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-100">{category}</span>
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              {share}% of month
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-100">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                Log some expenses this month to unlock category insights.
              </p>
            )}
          </div>
        </div>

        {/* Today & Debts */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Today's Expenses */}
          <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 lg:p-7 shadow-lg border border-slate-800/80 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/80 rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="text-slate-950" size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-0.5">Today&apos;s Spending</p>
                <p className="text-2xl font-bold text-slate-100">¥{todayExpenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Unpaid Debts */}
          <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 lg:p-7 shadow-lg border border-slate-800/80 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/80 rounded-xl flex items-center justify-center shadow-md">
                <CreditCard className="text-slate-950" size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-0.5">Unpaid Debts</p>
                <p className="text-2xl font-bold text-amber-300">¥{totalDebts.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {showFreedomTracker && (
          <div className="mt-7 sm:mt-8 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-indigo-950/70 p-5 sm:p-6 lg:p-7 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200/80">
                  Strategy
                </p>
                <h3 className="text-xl font-semibold text-slate-50">Debt Freedom Tracker</h3>
                <p className="text-sm text-slate-300">{debtFreedomSummary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/50 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  {debtFreedomTracker.items.length} debts
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/50 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  {goalBreakdown.items.length} goals
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Debt timeline
                    </h4>
                    <p className="text-xs text-slate-500">
                      Snowball assumes ¥{averageDebtPayment.toLocaleString()} per debt
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-200">
                    {trackerInterestLabel ?? 'Focus on interest-heavy balances first.'}
                  </p>
                </div>
                {debtFreedomTracker.items.length > 0 ? (
                  <ul className="space-y-3">
                    {debtFreedomTracker.items.map(item => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                            <p className="text-xs text-slate-400">
                              Target {item.payoffDate ? formatDateForDisplay(item.payoffDate, 'MMM d, yyyy') : formatDateForDisplay(item.dueDate)} ·{' '}
                              {item.months ? `≈${item.months} months` : 'follow due date'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-rose-200">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">
                    Add an unpaid debt to see a payoff projection.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Savings goals
                    </h4>
                    <p className="text-xs text-slate-500">
                      Funding ≈ {goalBreakdown.monthlyPerGoal > 0 ? formatCurrency(goalBreakdown.monthlyPerGoal) : '0'} per goal each month
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {goalBreakdown.monthlyBudget > 0
                      ? `Budgeted ${formatCurrency(goalBreakdown.monthlyBudget)}/mo`
                      : 'Assign overflow to start funding goals'}
                  </p>
                </div>
                {goalBreakdown.items.length > 0 ? (
                  <ul className="space-y-3">
                    {goalBreakdown.items.map(goal => (
                      <li key={goal.id} className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{goal.name}</p>
                            <p className="text-xs text-slate-400">
                              {goal.eta
                                ? `Fully funded by ${format(goal.eta, 'MMM yyyy')}`
                                : 'Waiting on monthly overflow'}
                            </p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {goal.months ? `≈${goal.months} mo` : 'On hold'}
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-800/80">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${goal.progress}%`,
                              backgroundColor: goal.color || '#f472b6',
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatCurrency(goal.remaining)} to go
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">
                    No open savings goals. Create one to keep momentum going.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/debts"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                Adjust plan
              </Link>
              <Link
                href="/overflow"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                Review goals
              </Link>
            </div>

            {goalDelayMessage && (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                {goalDelayMessage}
              </div>
            )}
          </div>
        )}

        {/* Quick Tip */}
        <div className="mt-7 sm:mt-8 bg-slate-900/80 rounded-2xl p-5 sm:p-6 lg:p-7 border border-slate-800/80">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-slate-100 mb-1">Monthly Summary</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {balance > 0
                  ? `You're on track with a ${formatCurrency(balance)} surplus. Consider routing part toward savings or upcoming goals.`
                  : balance === 0
                  ? 'You are breaking even this month. Set aside a small buffer now so surprises do not derail progress.'
                  : `Spending is outpacing income by ${formatCurrency(Math.abs(balance))}. Trim discretionary items or defer non-essential buys to recover.`}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Income: {incomeDeltaLabel} · Spending: {expenseDeltaLabel}
              </p>
            </div>
          </div>
        </div>

        {recentExpenses.length > 0 && !isLoading && (
          <div className="mt-7 sm:mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Recent Expenses</h3>
                <p className="text-sm text-slate-400">A quick glance at where money is going right now.</p>
              </div>
              <Link
                href="/expenses"
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
              >
                View all
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {recentExpenses.map(expense => (
                <li key={`${expense.id}-${expense.date}`} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{expense.category}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateForDisplay(expense.date)} · {expense.description || 'No note added'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-200">- {formatCurrency(expense.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-7 sm:mt-8">
          <NotificationSettings />
        </div>
        {overflowCalc && overflowCalc.overflow > 0 && (
        <Link
          href="/overflow"
          className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 hover:border-purple-500/40 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="text-purple-300" size={20} />
              <span className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                Cash Overflow
              </span>
            </div>
            <span className="text-xs text-purple-300">→</span>
          </div>
          <p className="text-2xl font-bold text-purple-100 mb-1">
            ¥{overflowCalc.overflow.toLocaleString()}
          </p>
          <p className="text-sm text-purple-200/80">
            Available to allocate to {goals.filter(g => !g.isCompleted).length} savings goals
          </p>
        </Link>
      )}
      </div>
      
    </div>
  );
}
