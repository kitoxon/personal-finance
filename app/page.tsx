'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { storage } from '@/lib/storage';
import { Wallet, TrendingUp, CreditCard, Calendar } from 'lucide-react';
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

    // Calculate monthly expenses
    const monthExpenses = expenses
      .filter(e => isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd }))
      .reduce((sum, e) => sum + e.amount, 0);
    setMonthlyExpenses(monthExpenses);

    // Calculate today's expenses
    const todayExp = expenses
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + e.amount, 0);
    setTodayExpenses(todayExp);

    // Calculate monthly income
    const monthIncome = income
      .filter(i => i.month === currentMonth)
      .reduce((sum, i) => sum + i.amount, 0);
    setMonthlyIncome(monthIncome);

    // Calculate total unpaid debts
    const unpaidDebts = debts
      .filter(d => !d.isPaid)
      .reduce((sum, d) => sum + d.amount, 0);
    setTotalDebts(unpaidDebts);
  }, []);

  const balance = monthlyIncome - monthlyExpenses - totalDebts;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6">財務ダッシュボード</h1>
        
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4">
          <p className="text-sm opacity-90 mb-1">今月の残高</p>
          <p className="text-3xl font-bold">¥{balance.toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
            <div className="flex items-center mb-2">
              <TrendingUp size={16} className="mr-1" />
              <p className="text-xs opacity-90">収入</p>
            </div>
            <p className="text-xl font-semibold">¥{monthlyIncome.toLocaleString()}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
            <div className="flex items-center mb-2">
              <Wallet size={16} className="mr-1" />
              <p className="text-xs opacity-90">支出</p>
            </div>
            <p className="text-xl font-semibold">¥{monthlyExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-3">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">今日の支出</p>
              <p className="text-xl font-bold">¥{todayExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg mr-3">
              <CreditCard className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">未払い借金</p>
              <p className="text-xl font-bold text-red-600">¥{totalDebts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-2">💡 今月のヒント</h3>
          <p className="text-sm text-gray-600">
            {balance > 0 
              ? `素晴らしい！今月は¥${balance.toLocaleString()}の黒字です。` 
              : `注意：今月は¥${Math.abs(balance).toLocaleString()}の赤字です。`}
          </p>
        </div>
      </div>

      <Navigation />
    </div>
  );
}