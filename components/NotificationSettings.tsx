'use client';

import { useState, useEffect } from 'react';
import { notifications } from '@/lib/notifications';
import { Bell, BellOff, AlertCircle } from 'lucide-react';

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    expenseAdded: true,
    debtReminders: true,
    dailyLimit: true,
    budgetWarnings: true,
  });

  useEffect(() => {
    setIsSupported(notifications.isSupported());
    setPermission(notifications.getPermission());

    // Load settings from localStorage
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      setTestError(null);
      const newPermission = await notifications.requestPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        // Wait a bit for the permission to be fully registered
        setTimeout(async () => {
          try {
            await notifications.testNotification();
          } catch (error) {
            console.error('Failed to show welcome notification:', error);
          }
        }, 500);
      } else if (newPermission === 'denied') {
        setTestError('Notifications were blocked. Please enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      setTestError('Failed to request notification permission');
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      setTestError(null);
      
      // Check permission again before testing
      const currentPermission = notifications.getPermission();
      if (currentPermission !== 'granted') {
        setTestError('Notification permission not granted');
        setPermission(currentPermission);
        return;
      }

      await notifications.testNotification();
      
      // Visual feedback
      setTimeout(() => setIsTesting(false), 2000);
    } catch (error) {
      console.error('Failed to show test notification:', error);
      setTestError('Failed to show notification. Please check your browser settings.');
      setIsTesting(false);
    }
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
        <div className="flex items-center gap-3 text-slate-400">
          <BellOff size={20} />
          <div>
            <p className="text-sm font-medium">Notifications not supported</p>
            <p className="text-xs text-slate-500 mt-1">
              Your browser doesn&rsquo;t support notifications, or you&rsquo;re not using the installed PWA.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            permission === 'granted' 
              ? 'bg-emerald-500/20 text-emerald-200' 
              : permission === 'denied'
              ? 'bg-rose-500/20 text-rose-200'
              : 'bg-amber-500/20 text-amber-200'
          }`}>
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Notifications</h3>
            <p className="text-xs text-slate-400">
              {permission === 'granted' 
                ? '✓ Enabled and working' 
                : permission === 'denied' 
                ? '✗ Blocked by browser' 
                : '○ Not enabled yet'}
            </p>
          </div>
        </div>
        
        {permission === 'default' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 shadow-md"
          >
            Enable
          </button>
        )}
        
        {permission === 'granted' && (
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting}
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Sending...' : 'Test'}
          </button>
        )}
      </div>

      {testError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p>{testError}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <p className="text-sm font-medium text-rose-200 mb-2">Notifications are blocked</p>
          <p className="text-xs text-rose-200/80 mb-3">
            To enable notifications:
          </p>
          <ol className="text-xs text-rose-200/80 space-y-1 list-decimal list-inside">
            <li>Open your browser settings</li>
            <li>Find &quot;Site settings&quot; or &quot;Permissions&quot;</li>
            <li>Look for this website</li>
            <li>Allow notifications</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      )}

      {permission === 'granted' && (
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <p className="text-xs uppercase tracking-wider text-slate-500">Notification Types</p>
          
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm text-slate-200 group-hover:text-slate-100 transition">
                Expense added confirmations
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Get notified when you add an expense
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('expenseAdded', !settings.expenseAdded)}
              className={`relative h-6 w-11 rounded-full transition flex-shrink-0 ${
                settings.expenseAdded ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle expense confirmations"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.expenseAdded ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm text-slate-200 group-hover:text-slate-100 transition">
                Debt payment reminders
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Alerts before bills are due
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('debtReminders', !settings.debtReminders)}
              className={`relative h-6 w-11 rounded-full transition flex-shrink-0 ${
                settings.debtReminders ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle debt reminders"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.debtReminders ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm text-slate-200 group-hover:text-slate-100 transition">
                Daily spending alerts
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                When you reach your daily limit
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('dailyLimit', !settings.dailyLimit)}
              className={`relative h-6 w-11 rounded-full transition flex-shrink-0 ${
                settings.dailyLimit ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle daily spending alerts"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.dailyLimit ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm text-slate-200 group-hover:text-slate-100 transition">
                Budget warnings
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                When you exceed your budget
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('budgetWarnings', !settings.budgetWarnings)}
              className={`relative h-6 w-11 rounded-full transition flex-shrink-0 ${
                settings.budgetWarnings ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle budget warnings"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.budgetWarnings ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      )}

      {permission === 'default' && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-400">
            💡 Enable notifications to get alerts about expenses, bills, and budget limits. 
            We&rsquo;ll only send you helpful reminders, never spam.
          </p>
        </div>
      )}
    </div>
  );
}
