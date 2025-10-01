'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { storage } from '@/lib/storage';
import { Wallet, CreditCard, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalDebts, setTotalDebts] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);

  useEffect(() => {
    const expenses = storage.getExpenses();
    const income = storage.getIncome();
    const debts = storage.getDebts();

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
  }, []);

  const balance = monthlyIncome - monthlyExpenses - totalDebts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Welcome back!</p>
              <h1 className="text-2xl font-bold">Finance Dashboard</h1>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Wallet className="text-white" size={24} />
            </div>
          </div>
          
          {/* Balance Card */}
          <div className="bg-slate-900/70 backdrop-blur-lg rounded-3xl p-6 border border-slate-800/80 shadow-2xl">
            <p className="text-slate-300 text-sm font-medium mb-2">Current Balance</p>
            <p className={`break-words leading-tight text-4xl sm:text-5xl font-bold mb-1 ${balance >= 0 ? 'text-slate-50' : 'text-rose-300'}`}>
              ¥{balance.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              {balance >= 0 ? '🎉 Great job managing your finances!' : '⚠️ You are in deficit this month'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-3xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:gap-6">
          {/* Income Card */}
          <div className="bg-slate-900/80 rounded-2xl p-5 shadow-lg border border-slate-800/80">
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
          <div className="bg-slate-900/80 rounded-2xl p-5 shadow-lg border border-slate-800/80">
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
        <div className="space-y-4">
          {/* Today's Expenses */}
          <div className="bg-slate-900/80 rounded-2xl p-5 shadow-lg border border-slate-800/80 flex items-center justify-between">
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
          <div className="bg-slate-900/80 rounded-2xl p-5 shadow-lg border border-slate-800/80 flex items-center justify-between">
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
        <div className="mt-6 bg-slate-900/80 rounded-2xl p-5 border border-slate-800/80">
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
        </div>
      </div>

      <Navigation />
    </div>
  );
}
