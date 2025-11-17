import { addMonths } from 'date-fns';
import type { Debt } from './storage';

export type DebtPayoffStrategy = 'snowball' | 'avalanche';

export type StrategyFailureReason =
  | 'noDebts'
  | 'noBudget'
  | 'paymentTooLow'
  | 'maxMonthsExceeded';

export interface DebtStrategyResult {
  strategy: DebtPayoffStrategy;
  months: number | null;
  payoffDate: Date | null;
  totalInterest: number;
  isSuccessful: boolean;
  failureReason?: StrategyFailureReason;
}

export interface DebtStrategyComparison {
  snowball: DebtStrategyResult;
  avalanche: DebtStrategyResult;
  recommendation: DebtPayoffStrategy | null;
  monthsSaved: number | null;
  interestSaved: number;
  reason?: 'time' | 'interest';
}

const MAX_MONTHS = 600;
const EPSILON = 0.01;

type SimulatedDebt = {
  id: string;
  balance: number;
  rate: number;
};

const cloneDebts = (debts: Debt[]): SimulatedDebt[] =>
  debts
    .filter(debt => !debt.isPaid && debt.amount > 0)
    .map(debt => ({
      id: debt.id,
      balance: debt.amount,
      rate: Math.max(0, debt.interestRate ?? 0),
    }));

const sortDebts = (debts: SimulatedDebt[], strategy: DebtPayoffStrategy): SimulatedDebt[] => {
  if (strategy === 'snowball') {
    return [...debts].sort((a, b) => {
      if (a.balance === b.balance) {
        return a.rate - b.rate;
      }
      return a.balance - b.balance;
    });
  }

  return [...debts].sort((a, b) => {
    if (a.rate === b.rate) {
      return b.balance - a.balance;
    }
    return b.rate - a.rate;
  });
};

export function simulateDebtStrategy(
  debts: Debt[],
  monthlyBudget: number,
  strategy: DebtPayoffStrategy,
): DebtStrategyResult {
  const normalized = cloneDebts(debts);

  if (normalized.length === 0) {
    return {
      strategy,
      months: 0,
      payoffDate: new Date(),
      totalInterest: 0,
      isSuccessful: true,
    };
  }

  if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return {
      strategy,
      months: null,
      payoffDate: null,
      totalInterest: 0,
      isSuccessful: false,
      failureReason: 'noBudget',
    };
  }

  const ordered = sortDebts(normalized, strategy);
  let months = 0;
  let totalInterest = 0;

  while (months < MAX_MONTHS) {
    if (normalized.every(item => item.balance <= EPSILON)) {
      break;
    }

    months += 1;

    for (const debt of normalized) {
      if (debt.balance <= EPSILON || debt.rate <= 0) continue;
      const interest = debt.balance * (debt.rate / 12);
      debt.balance += interest;
      totalInterest += interest;
    }

    let budget = monthlyBudget;
    let paidThisMonth = 0;

    for (const debt of ordered) {
      if (budget <= 0) break;
      if (debt.balance <= EPSILON) continue;
      const payment = Math.min(debt.balance, budget);
      debt.balance -= payment;
      budget -= payment;
      paidThisMonth += payment;
    }

    if (normalized.every(debt => debt.balance <= EPSILON)) {
      const payoffDate = addMonths(new Date(), months);
      return {
        strategy,
        months,
        payoffDate,
        totalInterest,
        isSuccessful: true,
      };
    }

    if (paidThisMonth <= EPSILON) {
      return {
        strategy,
        months: null,
        payoffDate: null,
        totalInterest,
        isSuccessful: false,
        failureReason: 'paymentTooLow',
      };
    }
  }

  return {
    strategy,
    months: null,
    payoffDate: null,
    totalInterest,
    isSuccessful: false,
    failureReason: 'maxMonthsExceeded',
  };
}

export function compareDebtStrategies(
  debts: Debt[],
  monthlyBudget: number,
): DebtStrategyComparison {
  const snowball = simulateDebtStrategy(debts, monthlyBudget, 'snowball');
  const avalanche = simulateDebtStrategy(debts, monthlyBudget, 'avalanche');

  let recommendation: DebtPayoffStrategy | null = null;
  let monthsSaved: number | null = null;
  let interestSaved = 0;
  let reason: 'time' | 'interest' | undefined;

  const successfulSnowball = snowball.isSuccessful;
  const successfulAvalanche = avalanche.isSuccessful;

  if (successfulSnowball && !successfulAvalanche) {
    recommendation = 'snowball';
    reason = 'time';
  } else if (!successfulSnowball && successfulAvalanche) {
    recommendation = 'avalanche';
    reason = 'time';
  } else if (successfulSnowball && successfulAvalanche) {
    if (snowball.months !== null && avalanche.months !== null && snowball.months !== avalanche.months) {
      recommendation = snowball.months < avalanche.months ? 'snowball' : 'avalanche';
      monthsSaved = Math.abs(snowball.months - avalanche.months);
      interestSaved =
        recommendation === 'snowball'
          ? Math.max(0, avalanche.totalInterest - snowball.totalInterest)
          : Math.max(0, snowball.totalInterest - avalanche.totalInterest);
      reason = 'time';
    } else {
      const interestDifference = avalanche.totalInterest - snowball.totalInterest;
      if (Math.abs(interestDifference) > EPSILON) {
        recommendation = interestDifference > 0 ? 'snowball' : 'avalanche';
        interestSaved = Math.abs(interestDifference);
        reason = 'interest';
      }
    }
  }

  return {
    snowball,
    avalanche,
    recommendation,
    monthsSaved,
    interestSaved,
    reason,
  };
}
