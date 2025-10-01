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
    void loadIncomes();
  }, []);

  const loadIncomes = async () => {
    const data = await storage.getIncome();
    setIncomes(data.sort((a, b) => b.month.localeCompare(a.month)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!source.trim()) {
      alert('Please enter an income source');
      return;
    }

    await storage.saveIncome({
      amount: parseFloat(amount),
      source: source.trim(),
      month,
    });
    setAmount('');
    setSource('');
    await loadIncomes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this income record?')) {
      await storage.deleteIncome(id);
      await loadIncomes();
    }
  };

  const currentMonthTotal = incomes
    .filter(i => i.month === format(new Date(), 'yyyy-MM'))
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Income</h1>
          <div className="flex items-center gap-2">
            <p className="text-emerald-200 text-sm">This month:</p>
            <p className="text-xl font-bold text-emerald-100">¥{currentMonthTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-4">
        {/* Add Income Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 rounded-2xl shadow-xl p-6 mb-6 border border-slate-800/80">
          <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-200 shadow-md">
              <PlusCircle size={18} className="text-emerald-100" />
            </span>
            <span>Add New Income</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Amount (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="300000"
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-slate-950/80 text-lg font-semibold transition-all shadow-sm"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Salary, Bonus, Freelance, etc."
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Month
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 py-4 rounded-xl font-bold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} className="text-slate-950" />
              Add Income
            </button>
          </div>
        </form>

        {/* Income List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-200" />
            Income History
          </h2>
          
          {incomes.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl shadow-md p-10 text-center border border-slate-800/70">
              <div className="text-6xl mb-4">💰</div>
              <p className="text-slate-300 font-medium">No income recorded yet</p>
              <p className="text-sm text-slate-500 mt-2">Add your first income above</p>
            </div>
          ) : (
            incomes.map(income => (
              <div key={income.id} className="bg-slate-900/70 rounded-2xl shadow-md p-5 border border-slate-800/80 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-emerald-500/30 text-emerald-100">
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-100">{income.source}</p>
                        <p className="text-xs text-slate-400">{income.month}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-300 mt-2">
                      ¥{income.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 p-2 rounded-lg transition-all"
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
