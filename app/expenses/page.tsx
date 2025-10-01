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

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    const data = storage.getExpenses();
    setExpenses(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      description,
      date
    };

    storage.saveExpense(expense);
    setAmount('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    loadExpenses();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this expense?')) {
      storage.deleteExpense(id);
      loadExpenses();
    }
  };

  const todayTotal = expenses
    .filter(e => e.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + e.amount, 0);

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': 'bg-orange-100 text-orange-700 border-orange-200',
      'Transportation': 'bg-blue-100 text-blue-700 border-blue-200',
      'Entertainment': 'bg-purple-100 text-purple-700 border-purple-200',
      'Utilities': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Communication': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'Healthcare': 'bg-red-100 text-red-700 border-red-200',
      'Shopping': 'bg-pink-100 text-pink-700 border-pink-200',
      'Other': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[cat] || colors['Other'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-xl">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">Expenses</h1>
          <div className="flex items-center gap-2">
            <p className="text-orange-100 text-sm">Today's total:</p>
            <p className="text-xl font-bold">¥{todayTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Add Expense Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <PlusCircle size={20} className="text-orange-600" />
            Add New Expense
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
                placeholder="1000"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-semibold transition-all"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium transition-all"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lunch, groceries, etc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Add Expense
            </button>
          </div>
        </form>

        {/* Expenses List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={20} />
            Recent Expenses
          </h2>
          
          {expenses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-10 text-center border border-gray-100">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 font-medium">No expenses recorded yet</p>
              <p className="text-sm text-gray-400 mt-2">Add your first expense above</p>
            </div>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {expense.date}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mb-2 font-medium">{expense.description}</p>
                    )}
                    <p className="text-2xl font-bold text-gray-900">
                      ¥{expense.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(expense.id)}
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