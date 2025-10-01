'use client';

import { useMemo, useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Income } from '@/lib/storage';
import { PlusCircle, Trash2, DollarSign, TrendingUp, Filter, Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void loadIncomes();
  }, []);

  const loadIncomes = async () => {
    try {
      setIsLoading(true);
      const data = await storage.getIncome();
      setIncomes(data.sort((a, b) => b.month.localeCompare(a.month)));
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('Unable to refresh income records. Showing any cached data.');
    } finally {
      setIsLoading(false);
    }
  };

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

    setIsSubmitting(true);
    try {
      await storage.saveIncome({
        amount: parseFloat(amount),
        source: source.trim(),
        month,
      });
      setAmount('');
      setSource('');
      await loadIncomes();
    } catch (err) {
      console.error(err);
      setFormError('We could not save that income entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income record?')) return;

    try {
      await storage.deleteIncome(id);
      await loadIncomes();
    } catch (err) {
      console.error(err);
      setLoadError('Failed to delete income record. Please refresh.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 pb-20 sm:pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white px-4 sm:px-6 lg:px-12 pt-10 pb-12 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Income</h1>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <p className="text-emerald-200 text-sm">This month:</p>
            <p className="text-xl font-bold text-emerald-100">¥{currentMonthTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 -mt-8 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8 grid gap-4 lg:gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">This month</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">¥{currentMonthTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Year to date</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">¥{annualTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Entries logged</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">{incomes.length}</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {loadError}
          </div>
        )}

        {/* Add Income Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 rounded-2xl shadow-xl p-5 sm:p-7 mb-8 border border-slate-800/80">
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
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 py-4 rounded-xl font-bold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle size={20} className="text-slate-950" />
              {isSubmitting ? 'Saving...' : 'Add Income'}
            </button>
            {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}
          </div>
        </form>

        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Filter size={16} />
            <span className="text-sm font-semibold">Review income</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus-within:border-emerald-500">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search source or month"
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadIncomes()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-500"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

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
            filteredIncome.map(income => (
              <div key={income.id} className="bg-slate-900/70 rounded-2xl shadow-md p-5 sm:p-6 lg:p-7 border border-slate-800/80 hover:shadow-lg transition-all">
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
          {topSources.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Top sources</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {topSources.map(([label, total]) => (
                  <div key={label} className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2">
                    <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-emerald-200">¥{total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
