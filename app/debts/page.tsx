'use client';

import { useMemo, useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { storage, Debt } from '@/lib/storage';
import { PlusCircle, Trash2, CreditCard, CheckCircle, Circle, AlertCircle, Search, RefreshCw, Filter } from 'lucide-react';

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaid, setShowPaid] = useState(true);

  useEffect(() => {
    void loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      setIsLoading(true);
      const data = await storage.getDebts();
      setDebts(data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('Unable to refresh debts. Showing any cached items.');
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

    if (!name.trim()) {
      setFormError('Please enter a debt name.');
      return;
    }

    if (!dueDate) {
      setFormError('Please enter a due date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await storage.saveDebt({
        name: name.trim(),
        amount: parseFloat(amount),
        dueDate,
        isPaid: false,
      });
      setAmount('');
      setName('');
      setDueDate('');
      await loadDebts();
    } catch (err) {
      console.error(err);
      setFormError('We could not save that debt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    try {
      await storage.updateDebt(id, { isPaid: !currentStatus });
      await loadDebts();
    } catch (err) {
      console.error(err);
      setLoadError('Failed to update debt status. Please refresh.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this debt?')) {
      try {
        await storage.deleteDebt(id);
        await loadDebts();
      } catch (err) {
        console.error(err);
        setLoadError('Failed to delete debt. Please refresh.');
      }
    }
  };

  const normalizedDebts = useMemo(() => {
    if (!searchTerm) return debts;
    return debts.filter(debt =>
      debt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.dueDate.includes(searchTerm)
    );
  }, [debts, searchTerm]);

  const unpaidDebts = normalizedDebts.filter(d => !d.isPaid);
  const paidDebts = normalizedDebts.filter(d => d.isPaid);
  const totalUnpaid = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0);
  const overdueCount = debts.filter(d => !d.isPaid && new Date(d.dueDate) < new Date()).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-slate-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-rose-950 to-red-950 text-white px-6 lg:px-12 pt-10 pb-12 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Debts & Bills</h1>
          <div className="flex items-center gap-2">
            <p className="text-rose-200 text-sm">Total unpaid:</p>
            <p className="text-xl font-bold text-rose-100">¥{totalUnpaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 -mt-8 pb-16">
        <div className="mb-8 grid gap-4 lg:gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Outstanding total</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">¥{totalUnpaid.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Overdue items</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">{overdueCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Total records</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">{debts.length}</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-8 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {loadError}
          </div>
        )}

        {/* Add Debt Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 border border-slate-800/80">
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
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 py-4 rounded-xl font-bold hover:from-rose-400 hover:to-amber-400 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle size={20} className="text-slate-950" />
              {isSubmitting ? 'Saving...' : 'Add Debt'}
            </button>
            {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}
          </div>
        </form>

        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Filter size={16} />
            <span className="text-sm font-semibold">Organize debts</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus-within:border-rose-500">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or date"
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadDebts()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-500"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showPaid}
                onChange={(event) => setShowPaid(event.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-rose-400 focus:ring-rose-500"
              />
              Show paid
            </label>
          </div>
        </div>

        {/* Unpaid Debts */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-200" />
            Unpaid ({unpaidDebts.length})
          </h2>
          
          {isLoading ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/70 p-12 text-center text-slate-300">
              Loading your debts...
            </div>
          ) : unpaidDebts.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl shadow-md p-10 lg:p-12 text-center border border-slate-800/70">
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
                    className={`bg-slate-900/70 rounded-2xl shadow-md p-6 lg:p-7 border border-slate-800/80 hover:shadow-lg transition-all ${
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
        {showPaid && paidDebts.length > 0 && (
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
