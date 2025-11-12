'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storage, DEFAULT_CURRENCY_CODE, DEFAULT_CURRENCY_LOCALE } from '@/lib/storage';
import { calculateMonthlyOverflow } from '@/lib/overflow';
import { notifications } from '@/lib/notifications';
import { getDate } from 'date-fns';

export function useOverflowNotifications() {
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

  const { data: goals = [] } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: () => storage.getSavingsGoals(),
  });

  const { data: settings } = useQuery({
    queryKey: ['budgetSettings'],
    queryFn: () => storage.getBudgetSettings(),
  });

  const currencyLocale = settings?.currencyLocale ?? DEFAULT_CURRENCY_LOCALE;
  const currencyCode = settings?.currencyCode ?? DEFAULT_CURRENCY_CODE;
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyLocale, currencyCode],
  );
  const formatCurrency = (value: number) => currencyFormatter.format(value);

  useEffect(() => {
    if (!settings) return;

    const checkOverflow = async () => {
      const today = getDate(new Date());
      
      // Check if it's the overflow calculation day
      if (today !== settings.overflowDay) return;

      // Check if we already notified today
      const lastNotified = localStorage.getItem('lastOverflowNotification');
      const todayKey = new Date().toDateString();
      if (lastNotified === todayKey) return;

      const calc = calculateMonthlyOverflow(expenses, income, debts, goals, settings);

      if (calc.overflow > 0) {
        await notifications.show({
          title: '💰 Cash Overflow Available!',
          body: `You have ${formatCurrency(calc.overflow)} to allocate to your savings goals`,
          tag: 'overflow-available',
          requireInteraction: true,
        });

        localStorage.setItem('lastOverflowNotification', todayKey);
      }
    };

    checkOverflow();

    // Check daily at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      checkOverflow();
      // Then check every 24 hours
      const interval = setInterval(checkOverflow, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [expenses, income, debts, goals, settings]);
}
