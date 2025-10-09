export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const notifications = {
  // Check if notifications are supported
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  },

  // Get current permission status
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
  },

  // Show a notification
  async show(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    const permission = this.getPermission();
    
    if (permission === 'denied') {
      console.warn('Notification permission denied');
      return;
    }

    if (permission === 'default') {
      const newPermission = await this.requestPermission();
      if (newPermission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }
    }

    // Try to use service worker notification first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      });
    } else {
      // Fallback to regular notification
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
      });
    }
  },

  // Schedule a notification (for debts due soon)
  async scheduleDebtReminder(debtName: string, amount: number, daysUntilDue: number): Promise<void> {
    const messages = [
      { days: 0, message: '⚠️ Due today!' },
      { days: 1, message: '📅 Due tomorrow!' },
      { days: 3, message: '📅 Due in 3 days' },
      { days: 7, message: '📅 Due in 1 week' },
    ];

    const matchedMessage = messages.find(m => m.days === daysUntilDue);
    
    if (matchedMessage) {
      await this.show({
        title: `${debtName} ${matchedMessage.message}`,
        body: `Amount: ¥${amount.toLocaleString()}`,
        tag: `debt-${debtName}`,
        requireInteraction: daysUntilDue === 0,
      });
    }
  },

  // Notify when expense added
  async notifyExpenseAdded(amount: number, category: string): Promise<void> {
    await this.show({
      title: '✅ Expense Added',
      body: `¥${amount.toLocaleString()} - ${category}`,
      tag: 'expense-added',
    });
  },

  // Notify daily spending limit
  async notifyDailyLimit(spent: number, limit: number): Promise<void> {
    if (spent >= limit) {
      await this.show({
        title: '⚠️ Daily Spending Limit Reached!',
        body: `You've spent ¥${spent.toLocaleString()} today (limit: ¥${limit.toLocaleString()})`,
        tag: 'daily-limit',
        requireInteraction: true,
      });
    } else if (spent >= limit * 0.8) {
      await this.show({
        title: '📊 Approaching Daily Limit',
        body: `You've spent ¥${spent.toLocaleString()} of your ¥${limit.toLocaleString()} daily budget`,
        tag: 'daily-warning',
      });
    }
  },

  // Notify budget exceeded
  async notifyBudgetExceeded(monthlySpent: number, monthlyIncome: number): Promise<void> {
    if (monthlySpent > monthlyIncome) {
      await this.show({
        title: '🚨 Budget Exceeded!',
        body: `You've spent ¥${(monthlySpent - monthlyIncome).toLocaleString()} more than your income this month`,
        tag: 'budget-exceeded',
        requireInteraction: true,
      });
    }
  },
};