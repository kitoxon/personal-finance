'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Expense } from '@/lib/storage';
import { Wallet, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, PlusCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export default function Dashboard() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalDebts, setTotalDebts] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [expenses, income, debts] = await Promise.all([
          storage.getExpenses(),
          storage.getIncome(),
          storage.getDebts(),
        ]);

        if (!isMounted) return;

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const today = format(now, 'yyyy-MM-dd');
        const currentMonth = format(now, 'yyyy-MM');

        const monthExpenses = expenses
          .filter(e => isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd }))
          .reduce((sum, e) => sum + e.amount, 0);
        setMonthlyExpenses(monthExpenses);

        const todayExp = expenses
          .filter(e => e.date === today)
          .reduce((sum, e) => sum + e.amount, 0);
        setTodayExpenses(todayExp);

        const monthIncome = income
          .filter(i => i.month === currentMonth)
          .reduce((sum, i) => sum + i.amount, 0);
        setMonthlyIncome(monthIncome);

        const unpaidDebts = debts
          .filter(d => !d.isPaid)
          .reduce((sum, d) => sum + d.amount, 0);
        setTotalDebts(unpaidDebts);

        const sortedExpenses = [...expenses].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setRecentExpenses(sortedExpenses.slice(0, 5));
        setError(null);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError('We could not refresh your latest data. Showing any cached information instead.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const balance = monthlyIncome - monthlyExpenses - totalDebts;
  const balanceMessage = balance > 0 ? 'Surplus' : balance === 0 ? 'Balanced' : 'Deficit';

  const topCategories = useMemo(() => {
    const categoryTotals = recentExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [recentExpenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white px-4 sm:px-6 lg:px-12 pt-10 pb-14 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto">
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 -mt-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
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

        {/* Quick Tip */}
        <div className="mt-7 sm:mt-8 bg-slate-900/80 rounded-2xl p-5 sm:p-6 lg:p-7 border border-slate-800/80">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-slate-100 mb-1">Monthly Summary</h3>
             <p className="text-sm text-slate-300 leading-relaxed">
                {balance > 0 
                  ? `Excellent! You have ¥${balance.toLocaleString()} remaining this month. Keep it up!` 
                  : balance === 0
                  ? 'You are breaking even this month. Try to save more!'
                  : `Watch out! You are ¥${Math.abs(balance).toLocaleString()} over budget this month.`}
              </p>
            </div>
          </div>
          {topCategories.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {topCategories.map(([category, total]) => (
                <div key={category} className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{category}</p>
                  <p className="text-sm font-semibold text-slate-100">{formatCurrency(total)}</p>
                </div>
              ))}
            </div>
          )}
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
                    <p className="text-xs text-slate-500">{format(parseISO(expense.date), 'MMM d, yyyy')} · {expense.description || 'No note added'}</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-200">- {formatCurrency(expense.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
