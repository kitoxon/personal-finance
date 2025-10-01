'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Debt } from '@/lib/storage';
import { PlusCircle, Trash2, CreditCard, CheckCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = () => {
    const data = storage.getDebts();
    setDebts(data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('金額を入力してください');
      return;
    }

    if (!name.trim()) {
      alert('借金名を入力してください');
      return;
    }

    if (!dueDate) {
      alert('支払期日を入力してください');
      return;
    }

    const debt: Debt = {
      id: Date.now().toString(),
      name: name.trim(),
      amount: parseFloat(amount),
      dueDate,
      isPaid: false
    };

    storage.saveDebt(debt);
    setAmount('');
    setName('');
    setDueDate('');
    loadDebts();
  };

  const handleTogglePaid = (id: string, currentStatus: boolean) => {
    storage.updateDebt(id, { isPaid: !currentStatus });
    loadDebts();
  };

  const handleDelete = (id: string) => {
    if (confirm('この借金を削除しますか？')) {
      storage.deleteDebt(id);
      loadDebts();
    }
  };

  const unpaidDebts = debts.filter(d => !d.isPaid);
  const paidDebts = debts.filter(d => d.isPaid);
  const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-red-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">借金管理</h1>
        <p className="text-sm opacity-90">未払い合計: ¥{totalUnpaid.toLocaleString()}</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">新しい借金</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                借金名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="クレジットカード、ローンなど"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                金額 (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払期日
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center"
            >
              <PlusCircle size={20} className="mr-2" />
              追加する
            </button>
          </div>
        </form>

        {/* Unpaid Debts */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">未払い ({unpaidDebts.length})</h2>
          
          {unpaidDebts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
              未払いの借金はありません 🎉
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidDebts.map(debt => {
                const isOverdue = new Date(debt.dueDate) < new Date();
                return (
                  <div 
                    key={debt.id} 
                    className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${
                      isOverdue ? 'border-red-500' : 'border-yellow-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <CreditCard size={16} className="text-red-600 mr-2" />
                          <span className="font-semibold text-gray-800">{debt.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          期日: {debt.dueDate}
                          {isOverdue && <span className="text-red-600 ml-2 font-semibold">期限切れ！</span>}
                        </p>
                        <p className="text-2xl font-bold text-red-600">
                          ¥{debt.amount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(debt.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                      className="w-full bg-green-100 text-green-700 py-2 rounded-lg font-medium hover:bg-green-200 transition flex items-center justify-center"
                    >
                      <CheckCircle size={18} className="mr-2" />
                      支払い済みにする
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paid Debts */}
        {paidDebts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">支払い済み ({paidDebts.length})</h2>
            <div className="space-y-3">
              {paidDebts.map(debt => (
                <div 
                  key={debt.id} 
                  className="bg-gray-50 rounded-xl shadow-sm p-4 border-l-4 border-green-500 opacity-75"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <CheckCircle size={16} className="text-green-600 mr-2" />
                        <span className="font-semibold text-gray-700 line-through">{debt.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">期日: {debt.dueDate}</p>
                      <p className="text-xl font-bold text-gray-600 line-through">
                        ¥{debt.amount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center justify-center"
                  >
                    <Circle size={18} className="mr-2" />
                    未払いに戻す
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}