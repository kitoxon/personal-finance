'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  storage,
  BudgetSettings,
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_LOCALE,
  DEFAULT_EXPENSE_CATEGORIES,
} from '@/lib/storage';
import { calculateMonthlyOverflow, getOverflowStatusMessage } from '@/lib/overflow';
import { Target, PlusCircle, Trash2, ArrowRight, Settings, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { format } from 'date-fns';

const goalColors = [
  'from-blue-500 to-indigo-600',
  'from-green-500 to-emerald-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-teal-600',
  'from-yellow-500 to-orange-600',
];

const currencyOptions = [
  { code: 'JPY', label: 'Japanese Yen (JPY)', locale: 'ja-JP' },
  { code: 'USD', label: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'AUD', label: 'Australian Dollar (AUD)', locale: 'en-AU' },
] as const;

export default function CashOverflowPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  
  // New goal form
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedColor, setSelectedColor] = useState(goalColors[0]);
  
  // Budget settings form
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('20');
  const [overflowDay, setOverflowDay] = useState('25');
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY_CODE);
  const [currencyLocale, setCurrencyLocale] = useState(DEFAULT_CURRENCY_LOCALE);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(Array.from(DEFAULT_EXPENSE_CATEGORIES));
  const [newCategory, setNewCategory] = useState('');

  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: () => storage.getSavingsGoals(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => storage.getExpenses(),
  });

  const { data: income = [] } = useQuery({
    queryKey: ['income'],
    queryFn: () => storage.getIncome(),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: () => storage.getDebts(),
  });

  const { data: settings } = useQuery({
    queryKey: ['budgetSettings'],
    queryFn: () => storage.getBudgetSettings(),
  });

  useEffect(() => {
    if (settings) {
      setMonthlyIncome(settings.monthlyIncome.toString());
      setFixedExpenses(settings.fixedExpenses.toString());
      setSavingsTarget(settings.savingsTarget.toString());
      setOverflowDay(settings.overflowDay.toString());
      setAutoAllocate(settings.autoAllocate);
      setCurrencyCode(settings.currencyCode);
      setCurrencyLocale(settings.currencyLocale);
      setExpenseCategories(
        settings.expenseCategories.length > 0
          ? settings.expenseCategories
          : Array.from(DEFAULT_EXPENSE_CATEGORIES),
      );
      setNewCategory('');
    }
  }, [settings]);

  const saveGoalMutation = useMutation({
    mutationFn: storage.saveSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      setGoalName('');
      setTargetAmount('');
      setDeadline('');
      setShowAddGoal(false);
    },
  });

  const resolvedCurrencyCode = settings?.currencyCode ?? currencyCode;
  const resolvedCurrencyLocale = settings?.currencyLocale ?? currencyLocale;
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(resolvedCurrencyLocale, {
        style: 'currency',
        currency: resolvedCurrencyCode,
        maximumFractionDigits: 0,
      }),
    [resolvedCurrencyCode, resolvedCurrencyLocale],
  );
  const formatCurrency = (value: number) => currencyFormatter.format(value);

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (expenseCategories.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
      setNewCategory('');
      return;
    }
    setExpenseCategories(prev => [...prev, trimmed]);
    setNewCategory('');
  };

  const handleRemoveCategory = (category: string) => {
    setExpenseCategories(prev => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter(cat => cat !== category);
    });
  };

  const deleteGoalMutation = useMutation({
    mutationFn: storage.deleteSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: storage.saveBudgetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetSettings'] });
      setShowSettings(false);
    },
  });

  const allocateOverflowMutation = useMutation({
    mutationFn: async (allocations: Array<{ goalId: string; amount: number }>) => {
      for (const allocation of allocations) {
        await storage.saveOverflowAllocation({
          amount: allocation.amount,
          goalId: allocation.goalId,
          date: format(new Date(), 'yyyy-MM-dd'),
          source: 'auto-overflow',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      queryClient.invalidateQueries({ queryKey: ['overflowAllocations'] });
    },
  });

  const overflowCalc = useMemo(() => {
    if (!settings) return null;
    return calculateMonthlyOverflow(expenses, income, debts, goals, settings);
  }, [expenses, income, debts, goals, settings]);

  const statusMessage = overflowCalc ? getOverflowStatusMessage(overflowCalc, formatCurrency) : null;

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalName.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      alert('Please enter a valid goal name and target amount');
      return;
    }

    const nextPriority = goals.length > 0 ? Math.max(...goals.map(g => g.priority)) + 1 : 1;

    saveGoalMutation.mutate({
      name: goalName.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      priority: nextPriority,
      color: selectedColor,
      deadline: deadline || undefined,
      isCompleted: false,
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedCurrencyCode = currencyCode.trim().toUpperCase() || DEFAULT_CURRENCY_CODE;
    const sanitizedLocale = currencyLocale.trim() || DEFAULT_CURRENCY_LOCALE;
    const sanitizedCategories = expenseCategories
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);

    const newSettings: BudgetSettings = {
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      fixedExpenses: parseFloat(fixedExpenses) || 0,
      savingsTarget: parseInt(savingsTarget) || 20,
      overflowDay: parseInt(overflowDay) || 25,
      autoAllocate,
      currencyCode: sanitizedCurrencyCode,
      currencyLocale: sanitizedLocale,
      expenseCategories:
        sanitizedCategories.length > 0
          ? sanitizedCategories
          : Array.from(DEFAULT_EXPENSE_CATEGORIES),
    };

    updateSettingsMutation.mutate(newSettings);
  };

  const handleAllocateOverflow = () => {
    if (!overflowCalc || overflowCalc.recommendedAllocations.length === 0) return;

    if (confirm(`Allocate ${formatCurrency(overflowCalc.overflow)} to your savings goals?`)) {
      allocateOverflowMutation.mutate(
        overflowCalc.recommendedAllocations.map(a => ({
          goalId: a.goalId,
          amount: a.amount,
        }))
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-slate-100 pb-14 sm:pb-18">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white px-4 sm:px-6 lg:px-12 lg:pt-10 lg:pb-12 pt-8 pb-10 rounded-b-[3rem] shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Cash Overflow</h1>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              <Settings size={20} />
            </button>
          </div>
          <p className="text-sm text-indigo-100">Allocate your leftover money to savings goals</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 space-y-6">
        {/* Overflow Summary */}
        {overflowCalc && statusMessage && (
          <div className={`rounded-2xl border p-5 ${
            statusMessage.type === 'success' 
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : statusMessage.type === 'warning'
              ? 'border-yellow-500/40 bg-yellow-500/10'
              : 'border-rose-500/40 bg-rose-500/10'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-500/20'
                  : statusMessage.type === 'warning'
                  ? 'bg-yellow-500/20'
                  : 'bg-rose-500/20'
              }`}>
                {statusMessage.type === 'success' ? (
                  <Zap className="text-emerald-200" size={24} />
                ) : statusMessage.type === 'warning' ? (
                  <AlertCircle className="text-yellow-200" size={24} />
                ) : (
                  <AlertCircle className="text-rose-200" size={24} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">
                  {overflowCalc.overflow > 0 
                    ? `${formatCurrency(overflowCalc.overflow)} Overflow Available`
                    : 'No Overflow This Month'}
                </h3>
                <p className="text-sm opacity-90 mb-3">{statusMessage.message}</p>
                
                {overflowCalc.overflow > 0 && overflowCalc.recommendedAllocations.length > 0 && (
                  <button
                    onClick={handleAllocateOverflow}
                    disabled={allocateOverflowMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
                  >
                    <ArrowRight size={16} />
                    {allocateOverflowMutation.isPending ? 'Allocating...' : 'Allocate Now'}
                  </button>
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs opacity-70">Income</p>
                <p className="font-bold">{formatCurrency(overflowCalc.totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Expenses</p>
                <p className="font-bold">{formatCurrency(overflowCalc.totalExpenses)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Debts</p>
                <p className="font-bold">{formatCurrency(overflowCalc.totalDebts)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Available</p>
                <p className="font-bold">{formatCurrency(overflowCalc.availableForSavings)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Savings Goals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Target size={20} className="text-purple-300" />
              Savings Goals
            </h2>
            <button
              onClick={() => setShowAddGoal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition"
            >
              <PlusCircle size={16} />
              Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-10 text-center">
              <Target size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="font-medium text-slate-300">No savings goals yet</p>
              <p className="text-sm text-slate-500 mt-2">Create your first goal to start tracking overflow</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {goals.map(goal => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                
                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 relative overflow-hidden"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${goal.color} opacity-5`}
                    />
                    
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${goal.color}`} />
                            <span className="text-xs text-slate-400">Priority #{goal.priority}</span>
                          </div>
                          <h3 className="font-bold text-lg">{goal.name}</h3>
                          {goal.deadline && (
                            <p className="text-xs text-slate-400 mt-1">
                              Due: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${goal.name}"?`)) {
                              deleteGoalMutation.mutate(goal.id);
                            }
                          }}
                          className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-2xl font-bold">{formatCurrency(goal.currentAmount)}</p>
                            <p className="text-xs text-slate-400">of {formatCurrency(goal.targetAmount)}</p>
                          </div>
                          {goal.isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 text-xs font-semibold text-emerald-200">
                              <CheckCircle size={12} />
                              Completed
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-slate-300">
                              {progress.toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${goal.color} transition-all`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>

                        {!goal.isCompleted && (
                          <p className="text-xs text-slate-400">
                            {formatCurrency(remaining)} remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">New Savings Goal</h2>
            
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Goal Name</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Emergency Fund, Vacation, New Car..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Target Amount ({resolvedCurrencyCode})</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="100000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Deadline (Optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Color</label>
                <div className="flex gap-2">
                  {goalColors.map((color, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} ${
                        selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveGoalMutation.isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                >
                  {saveGoalMutation.isPending ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Budget Settings</h2>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Monthly Income ({currencyCode})</label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="300000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Fixed Monthly Expenses ({currencyCode})</label>
                <input
                  type="number"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(e.target.value)}
                  placeholder="100000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  inputMode="numeric"
                />
                <p className="text-xs text-slate-400 mt-1">Rent, utilities, subscriptions, etc.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Savings Target (%)</label>
                <input
                  type="number"
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(e.target.value)}
                  placeholder="20"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  inputMode="numeric"
                />
                <p className="text-xs text-slate-400 mt-1">Percentage of income to save before overflow</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Overflow Calculation Day</label>
                <input
                  type="number"
                  value={overflowDay}
                  onChange={(e) => setOverflowDay(e.target.value)}
                  placeholder="25"
                  min="1"
                  max="31"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  inputMode="numeric"
                />
                <p className="text-xs text-slate-400 mt-1">Day of month to calculate overflow (e.g., 25th)</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-2">Currency Code</label>
                  <input
                    type="text"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().slice(0, 5))}
                    list="currency-code-options"
                    placeholder="e.g. JPY"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  />
                  <p className="text-xs text-slate-400 mt-1">Will be used across every currency formatter.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Locale</label>
                  <input
                    type="text"
                    value={currencyLocale}
                    onChange={(e) => setCurrencyLocale(e.target.value)}
                    placeholder="e.g. ja-JP"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-slate-100 focus:border-purple-500 transition"
                  />
                  <p className="text-xs text-slate-400 mt-1">Controls thousand separators and symbol placement.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Expense Categories</label>
                <p className="text-xs text-slate-400 mb-2">
                  Reorder by deleting/adding. These feed the expense form and filters.
                </p>
                <div className="flex flex-wrap gap-2">
                  {expenseCategories.map(category => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(category)}
                        disabled={expenseCategories.length === 1}
                        className="rounded-full p-0.5 text-slate-400 transition hover:text-rose-300 disabled:opacity-40"
                        aria-label={`Remove ${category}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="Add new category"
                    className="flex-1 rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:border-purple-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim()}
                    className="rounded-xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {expenseCategories.length === 1 && (
                  <p className="mt-2 text-xs text-amber-200">
                    At least one category is required.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <p className="font-semibold">Auto-allocate Overflow</p>
                  <p className="text-xs text-slate-400">Automatically distribute overflow to goals</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoAllocate(!autoAllocate)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    autoAllocate ? 'bg-purple-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                      autoAllocate ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <datalist id="currency-code-options">
                {currencyOptions.map(option => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </datalist>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                >
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
