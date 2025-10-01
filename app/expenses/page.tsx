'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Expense } from '@/lib/storage';
import { PlusCircle, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const categories = [
  '食費', '交通費', '娯楽', '光熱費', '通信費', 
  '医療費', '衣類', 'その他'
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
      alert('金額を入力してください');
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
    if (confirm('この支出を削除しますか？')) {
      storage.deleteExpense(id);
      loadExpenses();
    }
  };

  const todayTotal = expenses
    .filter(e => e.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">支出記録</h1>
        <p className="text-sm opacity-90">今日の合計: ¥{todayTotal.toLocaleString()}</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">新しい支出</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                金額 (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリー
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メモ（任意）
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="昼食、コンビニなど"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center"
            >
              <PlusCircle size={20} className="mr-2" />
              追加する
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">最近の支出</h2>
          
          {expenses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
              まだ支出が記録されていません
            </div>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {expense.category}
                      </span>
                      <span className="text-xs text-gray-500 ml-2 flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {expense.date}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mb-1">{expense.description}</p>
                    )}
                    <p className="text-xl font-bold text-gray-900">
                      ¥{expense.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(expense.id)}
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