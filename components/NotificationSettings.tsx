'use client';

import { useState, useEffect } from 'react';
import { notifications } from '@/lib/notifications';
import { Bell, BellOff, Check, X } from 'lucide-react';

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
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
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleRequestPermission = async () => {
    const newPermission = await notifications.requestPermission();
    setPermission(newPermission);
    
    if (newPermission === 'granted') {
      await notifications.show({
        title: '🎉 Notifications Enabled!',
        body: 'You\'ll now receive updates about your finances',
      });
    }
  };

  const handleTestNotification = async () => {
    await notifications.show({
      title: '🔔 Test Notification',
      body: 'Notifications are working great!',
    });
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
          <p className="text-sm">Notifications are not supported in your browser</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-amber-200" />
          <div>
            <h3 className="font-semibold text-slate-100">Notifications</h3>
            <p className="text-xs text-slate-400">
              {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
            </p>
          </div>
        </div>
        
        {permission === 'default' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            Enable
          </button>
        )}
        
        {permission === 'granted' && (
          <button
            type="button"
            onClick={handleTestNotification}
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            Test
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      )}

      {permission === 'granted' && (
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <p className="text-xs uppercase tracking-wider text-slate-500">Notification Types</p>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Expense added confirmations</span>
            <button
              type="button"
              onClick={() => updateSetting('expenseAdded', !settings.expenseAdded)}
              className={`relative h-6 w-11 rounded-full transition ${
                settings.expenseAdded ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.expenseAdded ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Debt payment reminders</span>
            <button
              type="button"
              onClick={() => updateSetting('debtReminders', !settings.debtReminders)}
              className={`relative h-6 w-11 rounded-full transition ${
                settings.debtReminders ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.debtReminders ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Daily spending alerts</span>
            <button
              type="button"
              onClick={() => updateSetting('dailyLimit', !settings.dailyLimit)}
              className={`relative h-6 w-11 rounded-full transition ${
                settings.dailyLimit ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
                  settings.dailyLimit ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Budget warnings</span>
            <button
              type="button"
              onClick={() => updateSetting('budgetWarnings', !settings.budgetWarnings)}
              className={`relative h-6 w-11 rounded-full transition ${
                settings.budgetWarnings ? 'bg-amber-500' : 'bg-slate-700'
              }`}
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
    </div>
  );
}