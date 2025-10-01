'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Debt } from '@/lib/storage';
import { PlusCircle, Trash2, CreditCard, CheckCircle, Circle, AlertCircle } from 'lucide-react';

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
      alert('Please enter a valid amount');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a debt name');
      return;
    }

    if (!dueDate) {
      alert('Please enter a due date');
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
    if (confirm('Delete this debt?')) {
      storage.deleteDebt(id);
      loadDebts();
    }
  };

  const unpaidDebts = debts.filter(d => !d.isPaid);
  const paidDebts = debts.filter(d => d.isPaid);
  const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-500 via-pink-600 to-rose-600 text-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-xl">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">Debts & Bills</h1>
          <div className="flex items-center gap-2">
            <p className="text-red-100 text-sm">Total unpaid:</p>
            <p className="text-xl font-bold">¥{totalUnpaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Add Debt Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <PlusCircle size={20} className="text-red-600" />
            Add New Debt
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Debt Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Credit Card, Loan, Bill, etc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Amount (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg font-semibold transition-all"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-xl font-bold hover:from-red-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Add Debt
            </button>
          </div>
        </form>

        {/* Unpaid Debts */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            Unpaid ({unpaidDebts.length})
          </h2>
          
          {unpaidDebts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-10 text-center border border-gray-100">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-500 font-medium">No unpaid debts!</p>
              <p className="text-gray-500 font-medium">You&apos;re doing great!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidDebts.map(debt => {
                const isOverdue = new Date(debt.dueDate) < new Date();
                return (
                  <div 
                    key={debt.id} 
                    className={`bg-white rounded-2xl shadow-md p-5 border-l-4 ${
                      isOverdue ? 'border-red-500' : 'border-yellow-400'
                    } hover:shadow-lg transition-all`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                            isOverdue 
                              ? 'bg-gradient-to-br from-red-400 to-rose-500' 
                              : 'bg-gradient-to-br from-yellow-400 to-orange-500'
                          }`}>
                            <CreditCard size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{debt.name}</p>
                            <p className="text-xs text-gray-500">
                              Due: {debt.dueDate}
                              {isOverdue && <span className="text-red-600 font-bold ml-2">OVERDUE!</span>}
                            </p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                          ¥{debt.amount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(debt.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Mark as Paid
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
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Paid ({paidDebts.length})
            </h2>
            <div className="space-y-3">
              {paidDebts.map(debt => (
                <div 
                  key={debt.id} 
                  className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md p-5 border border-green-200 opacity-75"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                          <CheckCircle size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-700 line-through">{debt.name}</p>
                          <p className="text-xs text-gray-500">Paid on: {debt.dueDate}</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-gray-600 line-through mt-2">
                        ¥{debt.amount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                    className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
                  >
                    <Circle size={18} />
                    Mark as Unpaid
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