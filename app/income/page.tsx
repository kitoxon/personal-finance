'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Income } from '@/lib/storage';
import { PlusCircle, Trash2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    loadIncomes();
  }, []);

  const loadIncomes = () => {
    const data = storage.getIncome();
    setIncomes(data.sort((a, b) => b.month.localeCompare(a.month)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('金額を入力してください');
      return;
    }

    if (!source.trim()) {
      alert('収入源を入力してください');
      return;
    }

    const income: Income = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      source: source.trim(),
      month
    };

    storage.saveIncome(income);
    setAmount('');
    setSource('');
    loadIncomes();
  };

  const handleDelete = (id: string) => {
    if (confirm('この収入を削除しますか？')) {
      storage.deleteIncome(id);
      loadIncomes();
    }
  };

  const currentMonthTotal = incomes
    .filter(i => i.month === format(new Date(), 'yyyy-MM'))
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-green-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">収入管理</h1>
        <p className="text-sm opacity-90">今月の収入: ¥{currentMonthTotal.toLocaleString()}</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">新しい収入</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                金額 (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="300000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                収入源
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="給料、ボーナス、副業など"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                月
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center"
            >
              <PlusCircle size={20} className="mr-2" />
              追加する
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">収入履歴</h2>
          
          {incomes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
              まだ収入が記録されていません
            </div>
          ) : (
            incomes.map(income => (
              <div key={income.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <DollarSign size={16} className="text-green-600 mr-1" />
                      <span className="text-sm font-medium text-gray-700">{income.source}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{income.month}</p>
                    <p className="text-2xl font-bold text-green-600">
                      ¥{income.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}