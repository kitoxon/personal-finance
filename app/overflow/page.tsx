'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import { storage, SavingsGoal, BudgetSettings, NewSavingsGoalInput } from '@/lib/storage';
import { calculateMonthlyOverflow, getOverflowStatusMessage } from '@/lib/overflow';
import {
  TrendingUp,
  Target,
  PlusCircle,
  Trash2,
  ArrowRight,
  Settings,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

const goalColors = [
  'from-blue-500 to-indigo-600',
  'from-green-500 to-emerald-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-teal-600',
  'from-yellow-500 to-orange-600',
];

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

  const statusMessage = overflowCalc ? getOverflowStatusMessage(overflowCalc) : null;

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

    const newSettings: BudgetSettings = {
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      fixedExpenses: parseFloat(fixedExpenses) || 0,
      savingsTarget: parseInt(savingsTarget) || 20,
      overflowDay: parseInt(overflowDay) || 25,
      autoAllocate,
    };

    updateSettingsMutation.mutate(newSettings);
  };

  const handleAllocateOverflow = () => {
    if (!overflowCalc || overflowCalc.recommendedAllocations.length === 0) return;

    if (confirm(`Allocate ¥${overflowCalc.overflow.toLocaleString()} to your savings goals?`)) {
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
                    ? `¥${overflowCalc.overflow.toLocaleString()} Overflow Available`
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
                <p className="font-bold">¥{overflowCalc.totalIncome.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Expenses</p>
                <p className="font-bold">¥{overflowCalc.totalExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Debts</p>
                <p className="font-bold">¥{overflowCalc.totalDebts.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Available</p>
                <p className="font-bold">¥{overflowCalc.availableForSavings.toLocaleString()}</p>
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
              {goals.map((goal, index) => {
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
                            <p className="text-2xl font-bold">¥{goal.currentAmount.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">of ¥{goal.targetAmount.toLocaleString()}</p>
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
                            ¥{remaining.toLocaleString()} remaining
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

      <Navigation />

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
                <label className="block text-sm font-semibold mb-2">Target Amount (¥)</label>
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
                <label className="block text-sm font-semibold mb-2">Monthly Income (¥)</label>
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
                <label className="block text-sm font-semibold mb-2">Fixed Monthly Expenses (¥)</label>
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