'use client';

import { useMemo, useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Expense } from '@/lib/storage';
import { PlusCircle, Trash2, Calendar, Filter, Search, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const categories = [
  'Food & Dining', 'Transportation', 'Entertainment', 'Utilities', 
  'Communication', 'Healthcare', 'Shopping', 'Other'
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      const data = await storage.getExpenses();
      setExpenses(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('Unable to refresh expenses from Supabase. Showing any cached records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await storage.saveExpense({
        amount: parseFloat(amount),
        category,
        description,
        date,
      });

      setAmount('');
      setDescription('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      await loadExpenses();
    } catch (err) {
      console.error(err);
      setFormError('We could not save that expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Delete this expense?');
    if (!confirmed) return;

    try {
      await storage.deleteExpense(id);
      await loadExpenses();
    } catch (err) {
      console.error(err);
      setLoadError('Failed to delete expense. Please refresh.');
    }
  };

  const todayTotal = expenses
    .filter(e => e.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const matchesSearch = searchTerm.trim().length === 0
        || expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
        || expense.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [expenses, categoryFilter, searchTerm]);

  const monthTotal = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    return expenses
      .filter(expense => expense.date.startsWith(currentMonth))
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const averageSpend = useMemo(() => {
    if (expenses.length === 0) return 0;
    const uniqueDays = new Set(expenses.map(expense => expense.date)).size;
    return uniqueDays === 0 ? 0 : expenses.reduce((acc, e) => acc + e.amount, 0) / uniqueDays;
  }, [expenses]);

  const quickAmounts = [1000, 2500, 5000, 10000];

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      'Transportation': 'bg-sky-500/15 text-sky-200 border-sky-500/30',
      'Entertainment': 'bg-purple-500/15 text-purple-200 border-purple-500/30',
      'Utilities': 'bg-lime-500/15 text-lime-200 border-lime-500/30',
      'Communication': 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
      'Healthcare': 'bg-rose-500/15 text-rose-200 border-rose-500/30',
      'Shopping': 'bg-pink-500/15 text-pink-200 border-pink-500/30',
      'Other': 'bg-slate-500/15 text-slate-200 border-slate-500/30'
    };
    return colors[cat] || colors['Other'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-slate-100 pb-20 sm:pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-amber-950 to-rose-950 text-white px-4 sm:px-6 lg:px-12 pt-10 pb-12 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Expenses</h1>
          <div className="flex items-center gap-2">
            <p className="text-amber-200 text-sm">Today&apos;s total:</p>
            <p className="text-xl font-bold text-amber-100">¥{todayTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 -mt-8 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8 grid gap-4 lg:gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Today&apos;s spend</p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">¥{todayTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">This month</p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">¥{monthTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Daily average</p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">¥{Math.round(averageSpend).toLocaleString()}</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </div>
        )}

        {/* Add Expense Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 rounded-2xl shadow-xl p-5 sm:p-7 mb-8 border border-slate-800/80">
          <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/30 text-amber-200 shadow-md">
              <PlusCircle size={18} className="text-amber-100" />
            </span>
            <span>Add New Expense</span>
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
                placeholder="1000"
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-slate-950/80 text-lg font-semibold transition-all shadow-sm"
                inputMode="numeric"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {quickAmounts.map(value => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setAmount(String(value))}
                    className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-500/60 hover:text-amber-100"
                  >
                    +¥{value.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium transition-all shadow-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lunch, groceries, etc."
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 py-4 rounded-xl font-bold hover:from-amber-400 hover:to-rose-500 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle size={20} className="text-slate-950" />
              {isSubmitting ? 'Saving...' : 'Add Expense'}
            </button>
            {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}
          </div>
        </form>

        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Filter size={16} />
            <span className="text-sm font-semibold">Filter expenses</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus-within:border-amber-500">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search description"
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadExpenses()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-500"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar size={20} className="text-amber-200" />
            Recent Expenses
          </h2>
          
          {isLoading ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/70 p-8 sm:p-10 text-center text-slate-300">
              Fetching your expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl shadow-md p-10 text-center border border-slate-800/70">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-300 font-medium">No expenses recorded yet</p>
              <p className="text-sm text-slate-500 mt-2">Add your first expense above</p>
            </div>
          ) : (
            filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-slate-900/70 rounded-2xl shadow-md p-4 sm:p-5 border border-slate-800/80 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" />
                        {format(parseISO(expense.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-slate-300 mb-2 font-medium">{expense.description}</p>
                    )}
                    <p className="text-2xl font-bold text-slate-100">
                      ¥{expense.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(expense.id)}
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
