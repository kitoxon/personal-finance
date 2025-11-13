export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  data?: Record<string, unknown>;
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

  // Get service worker registration
  async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        return registration;
      } catch (error) {
        console.error('Failed to get service worker registration:', error);
        return null;
      }
    }
    return null;
  },

  // Show a notification (works on both desktop and mobile)
  async show(options: NotificationPayload): Promise<void> {
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

    const notificationOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/icon-192x192.png',
      badge: options.badge || '/icon-192x192.png',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {},
    };

    // Try to use service worker notification (required for mobile)
    const registration = await this.getRegistration();
    
    if (registration) {
      try {
        await registration.showNotification(options.title, notificationOptions);
        console.log('✅ Notification shown via Service Worker');
      } catch (error) {
        console.error('Failed to show notification via service worker:', error);
        // Fallback to regular notification
        this.showFallback(options.title, notificationOptions);
      }
    } else {
      // Fallback to regular notification
      this.showFallback(options.title, notificationOptions);
    }
  },

  // Fallback notification (for desktop browsers)
  showFallback(title: string, options: NotificationOptions): void {
    try {
      new Notification(title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
      });
      console.log('✅ Notification shown via Fallback API');
    } catch (error) {
      console.error('Failed to show fallback notification:', error);
    }
  },

  // Schedule a notification (for debts due soon)
  async scheduleDebtReminder(debtName: string, amount: number, daysUntilDue: number): Promise<void> {
    const messages = [
      { days: 0, message: '⚠️ Due today!', urgent: true },
      { days: 1, message: '📅 Due tomorrow!', urgent: true },
      { days: 3, message: '📅 Due in 3 days', urgent: false },
      { days: 7, message: '📅 Due in 1 week', urgent: false },
    ];

    const matchedMessage = messages.find(m => m.days === daysUntilDue);
    
    if (matchedMessage) {
      await this.show({
        title: `${debtName} ${matchedMessage.message}`,
        body: `Amount: ¥${amount.toLocaleString()}`,
        tag: `debt-${debtName}`,
        requireInteraction: matchedMessage.urgent,
        vibrate: matchedMessage.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
      });
    }
  },

  // Notify when expense added
  async notifyExpenseAdded(amount: number, category: string): Promise<void> {
    await this.show({
      title: '✅ Expense Added',
      body: `¥${amount.toLocaleString()} - ${category}`,
      tag: 'expense-added',
      vibrate: [100, 50, 100],
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
        vibrate: [200, 100, 200, 100, 200, 100, 200],
      });
    } else if (spent >= limit * 0.8) {
      await this.show({
        title: '📊 Approaching Daily Limit',
        body: `You've spent ¥${spent.toLocaleString()} of your ¥${limit.toLocaleString()} daily budget`,
        tag: 'daily-warning',
        vibrate: [200, 100, 200],
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
        vibrate: [300, 100, 300, 100, 300],
      });
    }
  },

  // Test notification with vibration
  async testNotification(): Promise<void> {
    await this.show({
      title: '🔔 Test Notification',
      body: 'Notifications are working perfectly! 🎉',
      tag: 'test',
      vibrate: [200, 100, 200, 100, 400],
      requireInteraction: false,
    });
  },
};
