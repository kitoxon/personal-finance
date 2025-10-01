'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { storage } from '@/lib/storage';
import { Wallet, TrendingUp, CreditCard, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-xl">
        <div className="max-w-lg mx-auto">
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
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <p className="text-blue-100 text-sm font-medium mb-2">Current Balance</p>
            <p className={`text-4xl font-bold mb-1 ${balance >= 0 ? 'text-white' : 'text-red-200'}`}>
              ¥{balance.toLocaleString()}
            </p>
            <p className="text-xs text-blue-100">
              {balance >= 0 ? '🎉 Great job managing your finances!' : '⚠️ You are in deficit this month'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-lg mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Income Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <ArrowUpRight className="text-white" size={20} />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Income
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">¥{monthlyIncome.toLocaleString()}</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>

          {/* Expenses Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                <ArrowDownRight className="text-white" size={20} />
              </div>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                Expenses
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">¥{monthlyExpenses.toLocaleString()}</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
        </div>

        {/* Today & Debts */}
        <div className="space-y-4">
          {/* Today's Expenses */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="text-white" size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-0.5">Today's Spending</p>
                <p className="text-2xl font-bold text-gray-900">¥{todayExpenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Unpaid Debts */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <CreditCard className="text-white" size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-0.5">Unpaid Debts</p>
                <p className="text-2xl font-bold text-red-600">¥{totalDebts.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tip */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Monthly Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
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