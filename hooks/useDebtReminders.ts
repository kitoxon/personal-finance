'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storage } from '@/lib/storage';
import { notifications } from '@/lib/notifications';
import { differenceInDays, parseISO } from 'date-fns';

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
      
      for (const debt of debts) {
        if (debt.isPaid) continue;
        
        try {
          const dueDate = parseISO(debt.dueDate);
          const daysUntil = differenceInDays(dueDate, today);
          
          if ([0, 1, 3, 7].includes(daysUntil)) {
            await notifications.scheduleDebtReminder(debt.name, debt.amount, daysUntil);
          }
        } catch (error) {
          console.error('Error checking debt reminder:', error);
        }
      }
    };

    // Check immediately
    checkDebts();

    // Check daily
    const interval = setInterval(checkDebts, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [debts]);
}