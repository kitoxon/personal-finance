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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-slate-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-rose-950 to-red-950 text-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Debts & Bills</h1>
          <div className="flex items-center gap-2">
            <p className="text-rose-200 text-sm">Total unpaid:</p>
            <p className="text-xl font-bold text-rose-100">¥{totalUnpaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-4">
        {/* Add Debt Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 rounded-2xl shadow-xl p-6 mb-6 border border-slate-800/80">
          <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/30 text-rose-200 shadow-md">
              <PlusCircle size={18} className="text-rose-100" />
            </span>
            <span>Add New Debt</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Debt Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Credit Card, Loan, Bill, etc."
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Amount (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-lg font-semibold transition-all shadow-sm"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-medium transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 py-4 rounded-xl font-bold hover:from-rose-400 hover:to-amber-400 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} className="text-slate-950" />
              Add Debt
            </button>
          </div>
        </form>

        {/* Unpaid Debts */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-200" />
            Unpaid ({unpaidDebts.length})
          </h2>
          
          {unpaidDebts.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl shadow-md p-10 text-center border border-slate-800/70">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-slate-300 font-medium">No unpaid debts!</p>
              <p className="text-slate-400 font-medium">You&apos;re doing great!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidDebts.map(debt => {
                const isOverdue = new Date(debt.dueDate) < new Date();
                return (
                  <div 
                    key={debt.id} 
                    className={`bg-slate-900/70 rounded-2xl shadow-md p-5 border border-slate-800/80 hover:shadow-lg transition-all ${
                      isOverdue ? 'border-l-4 border-rose-500/80' : 'border-l-4 border-amber-400/80'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                            isOverdue 
                              ? 'bg-rose-500/30 text-rose-100' 
                              : 'bg-amber-500/30 text-amber-100'
                          }`}>
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-100">{debt.name}</p>
                            <p className="text-xs text-slate-400">
                              Due: {debt.dueDate}
                              {isOverdue && <span className="text-rose-300 font-bold ml-2">OVERDUE!</span>}
                            </p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-rose-300 mt-2">
                          ¥{debt.amount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(debt.id)}
                        className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 p-2 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 py-3 rounded-xl font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} className="text-slate-950" />
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
            <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-200" />
              Paid ({paidDebts.length})
            </h2>
            <div className="space-y-3">
              {paidDebts.map(debt => (
                <div 
                  key={debt.id} 
                  className="bg-emerald-500/10 rounded-2xl shadow-md p-5 border border-emerald-500/20"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-emerald-500/30 text-emerald-100">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-300 line-through">{debt.name}</p>
                          <p className="text-xs text-slate-400">Paid on: {debt.dueDate}</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-slate-400 line-through mt-2">
                        ¥{debt.amount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                    className="w-full bg-slate-800/60 text-slate-200 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
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
