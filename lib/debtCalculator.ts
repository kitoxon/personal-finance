import { addMonths } from 'date-fns';

export type PayoffScheduleEntryType = 'extra' | 'skip' | 'payment';

export interface PayoffScheduleEntry {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
  type: PayoffScheduleEntryType;
}

export interface PayoffScheduleResult {
  payoffDate: Date | null;
  totalInterest: number;
  totalPaid: number;
  months: number;
  schedule: PayoffScheduleEntry[];
  isComplete: boolean;
  failureReason?: 'paymentTooLow' | 'maxMonthsExceeded';
}

export interface PayoffCalculatorOptions {
  startDate?: Date;
  maxMonths?: number;
  extraPayment?: number;
  skipMonths?: number;
}

export function calculatePayoffSchedule(
  currentBalance: number,
  monthlyPayment: number,
  annualInterestRate: number,
  options: PayoffCalculatorOptions = {},
): PayoffScheduleResult | null {
  if (currentBalance <= 0 || monthlyPayment <= 0 || Number.isNaN(currentBalance) || Number.isNaN(monthlyPayment)) {
    return null;
  }

  const schedule: PayoffScheduleEntry[] = [];
  let balance = currentBalance;
  let totalInterest = 0;
  let month = 0;
  const effectiveRate = Math.max(0, annualInterestRate);
  const monthlyRate = effectiveRate / 12;
  const maxMonths = options.maxMonths ?? 600;
  const startDate = options.startDate ?? new Date();
  const extraPayment = Math.max(0, options.extraPayment ?? 0);
  const skipMonths = Math.max(0, Math.trunc(options.skipMonths ?? 0));
  let failureReason: PayoffScheduleResult['failureReason'];

  if (extraPayment > 0 && balance > 0) {
    const appliedExtra = Math.min(extraPayment, balance);
    balance = Number((balance - appliedExtra).toFixed(2));
    schedule.push({
      month: 0,
      type: 'extra',
      payment: appliedExtra,
      interest: 0,
      principal: appliedExtra,
      remainingBalance: Math.max(0, balance),
    });
  }

  for (let skipped = 0; skipped < skipMonths && balance > 0 && month < maxMonths; skipped += 1) {
    const interest = balance * monthlyRate;
    balance = Number((balance + interest).toFixed(2));
    totalInterest += interest;
    month += 1;
    schedule.push({
      month,
      type: 'skip',
      payment: 0,
      interest,
      principal: 0,
      remainingBalance: Math.max(0, balance),
    });
  }

  while (balance > 0 && month < maxMonths) {
    const interest = balance * monthlyRate;
    const principalBeforeClamp = monthlyPayment - interest;

    if (principalBeforeClamp <= 0) {
      failureReason = 'paymentTooLow';
      break;
    }

    const principal = Math.min(principalBeforeClamp, balance);
    const payment = interest + principal;
    balance = Number((balance - principal).toFixed(2));
    totalInterest += interest;
    month += 1;

    schedule.push({
      month,
      type: 'payment',
      payment,
      interest,
      principal,
      remainingBalance: Math.max(0, balance),
    });
  }

  if (balance > 0 && !failureReason) {
    failureReason = 'maxMonthsExceeded';
  }

  const isComplete = balance <= 0 && !failureReason;
  const payoffDate = isComplete ? addMonths(startDate, month) : null;
  const totalPaid = schedule.reduce((sum, entry) => sum + entry.payment, 0);

  return {
    payoffDate,
    totalInterest,
    totalPaid,
    months: month,
    schedule,
    isComplete,
    failureReason,
  };
}
