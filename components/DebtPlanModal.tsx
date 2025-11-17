'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, CalendarClock, TrendingUp, AlertTriangle } from 'lucide-react';
import { calculatePayoffSchedule } from '@/lib/debtCalculator';
import type { Debt } from '@/lib/storage';
import { formatDateForDisplay } from '@/lib/datetime';

interface DebtPlanModalProps {
  debt: Debt;
  onClose: () => void;
  onSaveInterest: (interestRate: number | null) => Promise<void> | void;
  isSavingInterest: boolean;
  currencyFormatter: Intl.NumberFormat;
}

export function DebtPlanModal({
  debt,
  onClose,
  onSaveInterest,
  isSavingInterest,
  currencyFormatter,
}: DebtPlanModalProps) {
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [extraPayment, setExtraPayment] = useState('0');
  const [skipMonth, setSkipMonth] = useState(false);
  const [interestInput, setInterestInput] = useState('');
  const [interestFeedback, setInterestFeedback] = useState<string | null>(null);
  const [interestErrorMessage, setInterestErrorMessage] = useState<string | null>(null);
  const sliderStep = 1000;
  const suggestedPayment = useMemo(
    () => Math.max(5000, Math.round(debt.amount / 12)),
    [debt.amount],
  );
  const monthlySliderMin = sliderStep;
  const monthlySliderMax = useMemo(() => {
    const base = Math.max(debt.amount, suggestedPayment * 3, sliderStep * 10);
    return Math.ceil(base / sliderStep) * sliderStep;
  }, [debt.amount, suggestedPayment, sliderStep]);
  const extraSliderMax = useMemo(() => {
    const base = Math.max(debt.amount, sliderStep);
    return Math.ceil(base / sliderStep) * sliderStep;
  }, [debt.amount, sliderStep]);

  useEffect(() => {
    setMonthlyPayment(String(suggestedPayment));
    setExtraPayment('0');
    setSkipMonth(false);
    setInterestInput(
      debt.interestRate !== undefined && debt.interestRate !== null
        ? String(Number((debt.interestRate * 100).toFixed(2)))
        : '',
    );
    setInterestFeedback(null);
    setInterestErrorMessage(null);
  }, [debt, suggestedPayment]);

  useEffect(() => {
    if (!interestFeedback) return;
    const timer = setTimeout(() => setInterestFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [interestFeedback]);

  useEffect(() => {
    setInterestErrorMessage(null);
  }, [interestInput]);

  const rawInterestValue = interestInput.trim() === '' ? null : parseFloat(interestInput);
  const interestValidationError =
    rawInterestValue !== null && (Number.isNaN(rawInterestValue) || rawInterestValue < 0 || rawInterestValue > 100)
      ? 'Enter an interest rate between 0% and 100%.'
      : null;
  const parsedInterestDecimal =
    rawInterestValue === null || Number.isNaN(rawInterestValue) ? null : rawInterestValue / 100;

  const storedInterest = debt.interestRate ?? null;
  const normalizedInterestForSave =
    interestInput.trim() === '' ? null : parsedInterestDecimal ?? null;
  const interestChanged =
    normalizedInterestForSave === null
      ? storedInterest !== null
      : storedInterest === null
      ? true
      : Math.abs(storedInterest - normalizedInterestForSave) > 0.0001;

  const effectiveInterestForCalc =
    interestInput.trim() === ''
      ? debt.interestRate ?? 0
      : parsedInterestDecimal ?? 0;

  const monthlyPaymentValue = monthlyPayment.trim() === '' ? NaN : parseFloat(monthlyPayment);
  const monthlySliderValue = Number.isNaN(monthlyPaymentValue)
    ? suggestedPayment
    : Math.min(monthlySliderMax, Math.max(monthlySliderMin, monthlyPaymentValue));
  const extraPaymentValueRaw = extraPayment.trim() === '' ? 0 : parseFloat(extraPayment);
  const extraPaymentValue = Number.isNaN(extraPaymentValueRaw)
    ? 0
    : Math.max(0, extraPaymentValueRaw);
  const extraSliderValue = Math.min(extraSliderMax, Math.max(0, extraPaymentValue));
  const remainingAfterExtra = Math.max(0, debt.amount - Math.min(extraPaymentValue, debt.amount));
  const paymentError =
    monthlyPayment.trim() === ''
      ? 'Enter your target monthly payment.'
      : Number.isNaN(monthlyPaymentValue) || monthlyPaymentValue <= 0
      ? 'Monthly payment must be greater than zero.'
      : null;

  const projection = useMemo(() => {
    if (paymentError || interestValidationError) {
      return null;
    }
    return calculatePayoffSchedule(debt.amount, monthlyPaymentValue, effectiveInterestForCalc, {
      extraPayment: extraPaymentValue,
      skipMonths: skipMonth ? 1 : 0,
    });
  }, [
    debt.amount,
    monthlyPaymentValue,
    effectiveInterestForCalc,
    paymentError,
    interestValidationError,
    extraPaymentValue,
    skipMonth,
  ]);

  const handleSaveInterest = async () => {
    if (!interestChanged || interestValidationError) {
      return;
    }
    try {
      await onSaveInterest(normalizedInterestForSave);
      setInterestFeedback('Interest rate saved');
      setInterestErrorMessage(null);
    } catch (error) {
      console.error(error);
      setInterestErrorMessage('Failed to save interest rate. Please try again.');
      setInterestFeedback(null);
    }
  };

  const schedulePreview = projection?.schedule.slice(0, 6) ?? [];
  const remainingMonths = projection ? Math.max(projection.months - schedulePreview.length, 0) : 0;
  const skipInterestCost =
    skipMonth && projection
      ? projection.schedule.find(entry => entry.type === 'skip')?.interest ?? 0
      : 0;

  const failureMessage =
    projection?.failureReason === 'paymentTooLow'
      ? 'Monthly payment is not enough to cover the interest. Increase the amount to generate a payoff date.'
      : projection?.failureReason === 'maxMonthsExceeded'
      ? 'Projection is capped at 600 months. Increase the payment to pay this debt sooner.'
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 px-4 py-6">
      <div
        className="absolute inset-0 z-0 cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Payoff plan</p>
            <h3 className="text-xl font-semibold text-slate-100">{debt.name}</h3>
            <p className="text-sm text-slate-400">
              Balance {currencyFormatter.format(debt.amount)} · Due{' '}
              {formatDateForDisplay(debt.dueDate, 'MMM d, yyyy')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-800/80 p-2 text-slate-300 transition hover:border-rose-500 hover:text-rose-100"
            aria-label="Close payoff plan"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Monthly payment plan</p>
                  <p className="text-xs text-slate-500">Use the slider or type an amount.</p>
                </div>
                <p className="text-lg font-bold text-slate-100">
                  {currencyFormatter.format(Math.round(monthlySliderValue))}/mo
                </p>
              </div>
              <input
                type="range"
                min={monthlySliderMin}
                max={monthlySliderMax}
                step={sliderStep}
                value={monthlySliderValue}
                onChange={(event) => setMonthlyPayment(event.target.value)}
                className="mt-4 w-full accent-rose-400"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={monthlyPayment}
                  onChange={(event) => setMonthlyPayment(event.target.value)}
                  className="w-full flex-1 rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-2.5 text-base font-semibold text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition"
                  placeholder="50000"
                />
                <button
                  type="button"
                  onClick={() => setMonthlyPayment(String(suggestedPayment))}
                  className="rounded-full border border-slate-700/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-rose-400 hover:text-rose-100"
                >
                  Use suggestion
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Suggested {currencyFormatter.format(suggestedPayment)} / month keeps you close to a 12-month payoff.
              </p>
              {paymentError && <p className="mt-2 text-xs font-semibold text-rose-300">{paymentError}</p>}
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Interest rate (APR %)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={interestInput}
                onChange={(event) => setInterestInput(event.target.value)}
                placeholder="18"
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {storedInterest === null
                    ? 'No default rate saved yet.'
                    : `Saved: ${Number((storedInterest * 100).toFixed(2))}% APR`}
                </span>
                {interestChanged && (
                  <button
                    type="button"
                    onClick={handleSaveInterest}
                    disabled={isSavingInterest || Boolean(interestValidationError)}
                    className="font-semibold text-rose-200 transition hover:text-rose-100 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    {isSavingInterest ? 'Saving…' : 'Save as default'}
                  </button>
                )}
              </div>
              {interestValidationError && (
                <p className="mt-2 text-xs font-semibold text-rose-300">{interestValidationError}</p>
              )}
              {interestFeedback && !interestValidationError && (
                <p className="mt-2 text-xs font-semibold text-emerald-300">{interestFeedback}</p>
              )}
              {interestErrorMessage && (
                <p className="mt-2 text-xs font-semibold text-rose-300">{interestErrorMessage}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">One-time extra payment</p>
                  <p className="text-xs text-slate-500">Applies immediately to this balance.</p>
                </div>
                <p className="text-lg font-bold text-rose-200">
                  {currencyFormatter.format(Math.round(extraSliderValue))}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={extraSliderMax}
                step={sliderStep}
                value={extraSliderValue}
                onChange={(event) => setExtraPayment(event.target.value)}
                className="mt-4 w-full accent-amber-400"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={extraPayment}
                  onChange={(event) => setExtraPayment(event.target.value)}
                  className="w-full flex-1 rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-2.5 text-base font-semibold text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 transition"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setExtraPayment('0')}
                  className="rounded-full border border-slate-700/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-amber-400 hover:text-amber-100"
                >
                  Clear
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {extraPaymentValue > 0
                  ? `Balance drops to ${currencyFormatter.format(Math.round(remainingAfterExtra))} instantly.`
                  : 'Use this to test a bonus or tax refund payoff.'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Skip next month (emergency)</p>
                  <p className="text-xs text-slate-500">See the cost of pausing for one cycle.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSkipMonth(prev => !prev)}
                  aria-pressed={skipMonth}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    skipMonth
                      ? 'border border-amber-400/70 bg-amber-500/20 text-amber-100'
                      : 'border border-slate-700/60 text-slate-200 hover:border-amber-400 hover:text-amber-100'
                  }`}
                >
                  {skipMonth ? 'Skipping' : 'Keep paying'}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {skipMonth
                  ? `Adds ${currencyFormatter.format(Math.round(skipInterestCost))} interest before payments resume.`
                  : 'Leave off to stay on schedule.'}
              </p>
            </div>
          </div>

          {projection ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <CalendarClock size={16} />
                    Payoff date
                  </div>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {projection.isComplete && projection.payoffDate
                      ? format(projection.payoffDate, 'MMM yyyy')
                      : 'Not reachable'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {projection.isComplete ? `${projection.months} months away` : 'Increase payment to reach payoff.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <TrendingUp size={16} />
                    Total interest
                  </div>
                  <p className="mt-2 text-xl font-semibold text-rose-200">
                    {currencyFormatter.format(Math.round(projection.totalInterest))}
                  </p>
                  <p className="text-xs text-slate-500">Total paid {currencyFormatter.format(Math.round(projection.totalPaid))}</p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <TrendingUp size={16} />
                    Monthly timeline
                  </div>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {projection.months}
                  </p>
                  <p className="text-xs text-slate-500">Months to freedom</p>
                </div>
              </div>

              {failureMessage && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <AlertTriangle size={18} />
                  <p>{failureMessage}</p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Scenario timeline
                  </h4>
                  {remainingMonths > 0 && (
                    <span className="text-xs text-slate-500">+ {remainingMonths} more steps</span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {schedulePreview.map(entry => {
                    const isExtra = entry.type === 'extra';
                    const isSkip = entry.type === 'skip';
                    return (
                      <div
                        key={`${entry.type}-${entry.month}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {isExtra
                              ? 'Instant extra payment'
                              : isSkip
                              ? `Month ${entry.month}: skipped`
                              : `Month ${entry.month}`}
                          </span>
                          <span className="text-xs text-slate-400">
                            Remaining {currencyFormatter.format(Math.round(entry.remainingBalance))}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                          <span>
                            Interest {currencyFormatter.format(Math.round(entry.interest))}
                            {isSkip ? ' (accrued)' : ''}
                          </span>
                          <span>
                            Principal {currencyFormatter.format(Math.round(entry.principal))}
                          </span>
                          <span>
                            Payment {currencyFormatter.format(Math.round(entry.payment))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {schedulePreview.length === 0 && (
                    <p className="text-sm text-slate-400">Enter a payment amount to see the payoff schedule.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-center text-slate-400">
              Enter a monthly payment and interest rate to preview your payoff plan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
