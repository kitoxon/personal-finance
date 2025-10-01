'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Income } from '@/lib/storage';
import { PlusCircle, Trash2, DollarSign, TrendingUp } from 'lucide-react';
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
      alert('Please enter a valid amount');
      return;
    }

    if (!source.trim()) {
      alert('Please enter an income source');
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
    if (confirm('Delete this income record?')) {
      storage.deleteIncome(id);
      loadIncomes();
    }
  };

  const currentMonthTotal = incomes
    .filter(i => i.month === format(new Date(), 'yyyy-MM'))
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 text-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-xl">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">Income</h1>
          <div className="flex items-center gap-2">
            <p className="text-emerald-100 text-sm">This month:</p>
            <p className="text-xl font-bold">¥{currentMonthTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Add Income Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <PlusCircle size={20} className="text-emerald-600" />
            Add New Income
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Amount (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="300000"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold transition-all"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Salary, Bonus, Freelance, etc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Month
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Add Income
            </button>
          </div>
        </form>

        {/* Income List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={20} />
            Income History
          </h2>
          
          {incomes.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-10 text-center border border-gray-100">
              <div className="text-6xl mb-4">💰</div>
              <p className="text-gray-500 font-medium">No income recorded yet</p>
              <p className="text-sm text-gray-400 mt-2">Add your first income above</p>
            </div>
          ) : (
            incomes.map(income => (
              <div key={income.id} className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                        <DollarSign size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{income.source}</p>
                        <p className="text-xs text-gray-500">{income.month}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">
                      ¥{income.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
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