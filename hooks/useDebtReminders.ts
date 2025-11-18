'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storage } from '@/lib/storage';
import { notifications } from '@/lib/notifications';
import { differenceInDays, format, parseISO } from 'date-fns';

const REMINDER_LOG_KEY = 'debtReminderLog';

type ReminderLog = Record<
  string,
  {
    [threshold: string]: string;
  }
>;

const readReminderLog = (): ReminderLog => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(REMINDER_LOG_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReminderLog;
  } catch {
    return {};
  }
};

const writeReminderLog = (log: ReminderLog) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REMINDER_LOG_KEY, JSON.stringify(log));
  } catch {
    // ignore storage errors
  }
};

export function useDebtReminders() {
  const { data: debts } = useQuery({
    queryKey: ['debts'],
    queryFn: () => storage.getDebts(),
  });

  useEffect(() => {
    if (!debts) return;

    const checkDebts = async () => {
      const settings = JSON.parse(
        localStorage.getItem('notificationSettings') || '{"debtReminders":true}'
      );
      
      if (!settings.debtReminders) return;

      const today = new Date();
      const todayKey = format(today, 'yyyy-MM-dd');
      const reminderLog = readReminderLog();
      let logChanged = false;

      for (const debt of debts) {
        if (debt.isPaid) continue;

        try {
          const dueDate = parseISO(debt.dueDate);
          const daysUntil = differenceInDays(dueDate, today);
          
          if ([0, 1, 3, 7].includes(daysUntil)) {
            const debtLog = reminderLog[debt.id] ?? {};
            if (debtLog[String(daysUntil)] === todayKey) {
              continue;
            }
            await notifications.scheduleDebtReminder(debt.name, debt.amount, daysUntil);
            reminderLog[debt.id] = {
              ...debtLog,
              [String(daysUntil)]: todayKey,
            };
            logChanged = true;
          }
        } catch (error) {
          console.error('Error checking debt reminder:', error);
        }
      }

      if (logChanged) {
        writeReminderLog(reminderLog);
      }
    };

    // Check immediately
    checkDebts();

    // Check daily
    const interval = setInterval(checkDebts, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [debts]);
}
