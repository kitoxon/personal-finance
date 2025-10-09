import { Expense, Income, Debt, SavingsGoal, BudgetSettings } from './storage';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

export interface OverflowCalculation {
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  fixedExpenses: number;
  availableForSavings: number;
  overflow: number;
  recommendedAllocations: Array<{
    goalId: string;
    goalName: string;
    amount: number;
    priority: number;
  }>;
}

export function calculateMonthlyOverflow(
  expenses: Expense[],
  income: Income[],
  debts: Debt[],
  goals: SavingsGoal[],
  settings: BudgetSettings,
  month?: Date
): OverflowCalculation {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const currentMonth = format(targetMonth, 'yyyy-MM');

  // Calculate total income for the month
  const totalIncome = income
    .filter(i => i.month === currentMonth)
    .reduce((sum, i) => sum + i.amount, 0);

  // Calculate total expenses for the month
  const totalExpenses = expenses
    .filter(e => {
      const expenseDate = new Date(e.date);
      return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate unpaid debts
  const totalDebts = debts
    .filter(d => !d.isPaid)
    .reduce((sum, d) => sum + d.amount, 0);

  // Fixed expenses from settings
  const fixedExpenses = settings.fixedExpenses;

  // Calculate overflow
  const totalCommitted = totalExpenses + totalDebts + fixedExpenses;
  const availableForSavings = Math.max(0, totalIncome - totalCommitted);
  
  // Minimum savings target (percentage of income)
  const minSavings = (totalIncome * settings.savingsTarget) / 100;
  const overflow = Math.max(0, availableForSavings - minSavings);

  // Allocate overflow to goals by priority
  const activeGoals = goals
    .filter(g => !g.isCompleted)
    .sort((a, b) => a.priority - b.priority);

  const recommendedAllocations = [];
  let remainingOverflow = overflow;

  for (const goal of activeGoals) {
    if (remainingOverflow <= 0) break;

    const neededAmount = goal.targetAmount - goal.currentAmount;
    const allocation = Math.min(remainingOverflow, neededAmount);

    if (allocation > 0) {
      recommendedAllocations.push({
        goalId: goal.id,
        goalName: goal.name,
        amount: allocation,
        priority: goal.priority,
      });
      remainingOverflow -= allocation;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    totalDebts,
    fixedExpenses,
    availableForSavings,
    overflow,
    recommendedAllocations,
  };
}

export function getOverflowStatusMessage(calculation: OverflowCalculation): {
  type: 'success' | 'warning' | 'danger';
  message: string;
} {
  if (calculation.overflow > 0) {
    return {
      type: 'success',
      message: `Great! You have ¥${calculation.overflow.toLocaleString()} to allocate to your savings goals.`,
    };
  } else if (calculation.availableForSavings > 0) {
    return {
      type: 'warning',
      message: `You have ¥${calculation.availableForSavings.toLocaleString()} available, but it's within your savings target.`,
    };
  } else {
    const deficit = Math.abs(calculation.availableForSavings);
    return {
      type: 'danger',
      message: `You're ¥${deficit.toLocaleString()} over budget this month. No overflow available.`,
    };
  }
}