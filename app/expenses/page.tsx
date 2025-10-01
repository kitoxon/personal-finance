'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Expense } from '@/lib/storage';
import { PlusCircle, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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

  const loadExpenses = async () => {
    const data = await storage.getExpenses();
    setExpenses(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    void loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

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
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this expense?')) {
      await storage.deleteExpense(id);
      await loadExpenses();
    }
  };

  const todayTotal = expenses
    .filter(e => e.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + e.amount, 0);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-slate-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-amber-950 to-rose-950 text-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Expenses</h1>
          <div className="flex items-center gap-2">
            <p className="text-amber-200 text-sm">Today's total:</p>
            <p className="text-xl font-bold text-amber-100">¥{todayTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-4">
        {/* Add Expense Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 rounded-2xl shadow-xl p-6 mb-6 border border-slate-800/80">
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
              className="w-full bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 py-4 rounded-xl font-bold hover:from-amber-400 hover:to-rose-500 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} className="text-slate-950" />
              Add Expense
            </button>
          </div>
        </form>

        {/* Expenses List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar size={20} className="text-amber-200" />
            Recent Expenses
          </h2>
          
          {expenses.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl shadow-md p-10 text-center border border-slate-800/70">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-300 font-medium">No expenses recorded yet</p>
              <p className="text-sm text-slate-500 mt-2">Add your first expense above</p>
            </div>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="bg-slate-900/70 rounded-2xl shadow-md p-5 border border-slate-800/80 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" />
                        {expense.date}
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
