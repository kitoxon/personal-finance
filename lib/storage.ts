'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase/browser';
import { normalizeToIsoString } from './datetime';

type ExpenseRow = {
  id: string;
  amount: number | string;
  category: string;
  description?: string | null;
  date?: string | null;
  created_at?: string | null;
};

type IncomeRow = {
  id: string;
  amount: number | string;
  source: string;
  month: string;
  created_at?: string | null;
};

type DebtRow = {
  id: string;
  name: string;
  amount: number | string;
  due_date: string;
  is_paid: boolean;
  interest_rate?: number | string | null;
  created_at?: string | null;
};

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt?: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  month: string;
  createdAt?: string;
}

export interface Debt {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  interestRate?: number | null;
  createdAt?: string;
}
type SavingsGoalRow = {
  id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  priority: number;
  color: string;
  icon?: string | null;
  deadline?: string | null;
  is_completed: boolean;
  created_at?: string | null;
};

type OverflowAllocationRow = {
  id: string;
  amount: number | string;
  goal_id: string;
  date: string;
  source: string;
  note?: string | null;
  created_at?: string | null;
};

type BudgetSettingsRow = {
  id: string;
  user_id?: string | null;
  monthly_income: number | string;
  fixed_expenses: number | string;
  savings_target: number;
  overflow_day: number;
  auto_allocate: boolean;
  currency_code?: string | null;
  currency_locale?: string | null;
  expense_categories?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  priority: number; // 1 = highest priority
  color: string;
  icon?: string;
  deadline?: string;
  isCompleted: boolean;
  createdAt?: string;
}

export interface OverflowAllocation {
  id: string;
  amount: number;
  goalId: string;
  date: string;
  source: 'manual' | 'auto-overflow';
  note?: string;
  createdAt?: string;
}

export interface BudgetSettings {
  id?: string;
  monthlyIncome: number;
  fixedExpenses: number;
  savingsTarget: number;
  overflowDay: number;
  autoAllocate: boolean;
  currencyCode: string;
  currencyLocale: string;
  expenseCategories: string[];
}
export const DEFAULT_CURRENCY_CODE = 'JPY';
export const DEFAULT_CURRENCY_LOCALE = 'ja-JP';
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Drinks',
  'Alcohol & Nightlife',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Communication',
  'Healthcare',
  'Shopping',
  'Other',
] as const;
export type NewSavingsGoalInput = Omit<SavingsGoal, 'id' | 'createdAt'>;
export type NewOverflowAllocationInput = Omit<OverflowAllocation, 'id' | 'createdAt'>;
export type NewExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
export type NewIncomeInput = Omit<Income, 'id' | 'createdAt'>;
export type NewDebtInput = Omit<Debt, 'id' | 'createdAt'>;

const LOCAL_KEYS = {
  expenses: 'expenses',
  income: 'income',
  debts: 'debts',
  savingsGoals: 'savingsGoals',
  overflowAllocations: 'overflowAllocations',
  budgetSettings: 'budgetSettings',
} as const;

const isBrowser = () => typeof window !== 'undefined';

const readLocal = <T>(key: string): T[] => {
  if (!isBrowser()) return [];
  try {
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return [];
  }
};

const writeLocal = <T>(key: string, value: T[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage`, error);
  }
};

const getClient = async (): Promise<SupabaseClient | null> => {
  try {
    return await getSupabaseBrowserClient();
  } catch (error) {
    console.warn('Supabase client unavailable, falling back to localStorage.', error);
    return null;
  }
};
const mapSavingsGoalRow = (row: SavingsGoalRow): SavingsGoal => ({
  id: row.id,
  name: row.name,
  targetAmount: Number(row.target_amount),
  currentAmount: Number(row.current_amount),
  priority: row.priority,
  color: row.color,
  icon: row.icon ?? undefined,
  deadline: row.deadline ?? undefined,
  isCompleted: Boolean(row.is_completed),
  createdAt: row.created_at ?? undefined,
});

const mapOverflowAllocationRow = (row: OverflowAllocationRow): OverflowAllocation => ({
  id: row.id,
  amount: Number(row.amount),
  goalId: row.goal_id,
  date: row.date,
  source: row.source as 'manual' | 'auto-overflow',
  note: row.note ?? undefined,
  createdAt: row.created_at ?? undefined,
});

const mapBudgetSettingsRow = (row: BudgetSettingsRow): BudgetSettings => ({
  id: row.id,
  monthlyIncome: Number(row.monthly_income),
  fixedExpenses: Number(row.fixed_expenses),
  savingsTarget: row.savings_target,
  overflowDay: row.overflow_day,
  autoAllocate: Boolean(row.auto_allocate),
  currencyCode: row.currency_code ?? DEFAULT_CURRENCY_CODE,
  currencyLocale: row.currency_locale ?? DEFAULT_CURRENCY_LOCALE,
  expenseCategories: (row.expense_categories && row.expense_categories.length > 0
    ? row.expense_categories
    : Array.from(DEFAULT_EXPENSE_CATEGORIES)) as string[],
});
const mapExpenseRow = (row: ExpenseRow): Expense => ({
  id: row.id,
  amount: Number(row.amount),
  category: row.category,
  description: row.description ?? '',
  date: normalizeToIsoString(row.date ?? row.created_at ?? undefined),
  createdAt: row.created_at ?? undefined,
});

const mapIncomeRow = (row: IncomeRow): Income => ({
  id: row.id,
  amount: Number(row.amount),
  source: row.source,
  month: row.month,
  createdAt: row.created_at ?? undefined,
});

const mapDebtRow = (row: DebtRow): Debt => ({
  id: row.id,
  name: row.name,
  amount: Number(row.amount),
  dueDate: row.due_date,
  isPaid: Boolean(row.is_paid),
  interestRate:
    row.interest_rate === null || row.interest_rate === undefined
      ? null
      : Number(row.interest_rate),
  createdAt: row.created_at ?? undefined,
});

const syncLocalAfterInsert = <T extends { id: string }>(key: string, record: T) => {
  if (!isBrowser()) return;
  const existing = readLocal<T>(key).filter(item => item.id !== record.id);
  writeLocal(key, [record, ...existing]);
};

const removeLocalRecord = (key: string, id: string) => {
  if (!isBrowser()) return;
  const existing = readLocal<{ id: string }>(key).filter(item => item.id !== id);
  writeLocal(key, existing);
};

const updateLocalRecord = <T extends { id: string }>(key: string, id: string, updater: (item: T) => T) => {
  if (!isBrowser()) return;
  const existing = readLocal<T>(key);
  const updated = existing.map(item => (item.id === id ? updater(item) : item));
  writeLocal(key, updated);
};

const generateLocalId = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    const webCrypto = window.crypto as Crypto;
    if (typeof webCrypto.randomUUID === 'function') {
      return webCrypto.randomUUID();
    }
    const array = new Uint8Array(16);
    webCrypto.getRandomValues(array);
    array[6] = (array[6] & 0x0f) | 0x40; // version 4
    array[8] = (array[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const storage = {
  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const client = await getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('expenses')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;

        if (data) {
          const mapped = data.map(mapExpenseRow);
          writeLocal(LOCAL_KEYS.expenses, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to fetch expenses from Supabase, using localStorage data.', error);
      }
    }

    const localExpenses = readLocal<Expense>(LOCAL_KEYS.expenses).map(expense => ({
      ...expense,
      date: normalizeToIsoString(expense.date),
    }));
    writeLocal(LOCAL_KEYS.expenses, localExpenses);
    return localExpenses;
  },

  async saveExpense(payload: NewExpenseInput): Promise<Expense> {
    const client = await getClient();
    const normalizedPayload = {
      ...payload,
      date: normalizeToIsoString(payload.date),
    };

    if (client) {
      try {
        const { data, error } = await client
          .from('expenses')
          .insert([{ ...normalizedPayload, description: normalizedPayload.description || null }])
          .select('*')
          .single();

        if (error) throw error;
        if (data) {
          const mapped = mapExpenseRow(data);
          syncLocalAfterInsert(LOCAL_KEYS.expenses, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to save expense to Supabase, storing locally instead.', error);
      }
    }

    const fallback: Expense = {
      id: generateLocalId(),
      ...normalizedPayload,
      createdAt: new Date().toISOString(),
    };
    syncLocalAfterInsert(LOCAL_KEYS.expenses, fallback);
    return fallback;
  },

  async deleteExpense(id: string): Promise<void> {
    const client = await getClient();
    if (client) {
      try {
        const { error } = await client.from('expenses').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete expense from Supabase, removing local copy only.', error);
      }
    }

    removeLocalRecord(LOCAL_KEYS.expenses, id);
  },

  // Income
  async getIncome(): Promise<Income[]> {
    const client = await getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('income')
          .select('*')
          .order('month', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped = data.map(mapIncomeRow);
          writeLocal(LOCAL_KEYS.income, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to fetch income from Supabase, using localStorage data.', error);
      }
    }

    return readLocal<Income>(LOCAL_KEYS.income);
  },

  async saveIncome(payload: NewIncomeInput): Promise<Income> {
    const client = await getClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('income')
          .insert([payload])
          .select('*')
          .single();

        if (error) throw error;
        if (data) {
          const mapped = mapIncomeRow(data);
          syncLocalAfterInsert(LOCAL_KEYS.income, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to save income to Supabase, storing locally instead.', error);
      }
    }

    const fallback: Income = {
      id: generateLocalId(),
      ...payload,
      createdAt: new Date().toISOString(),
    };
    syncLocalAfterInsert(LOCAL_KEYS.income, fallback);
    return fallback;
  },

  async deleteIncome(id: string): Promise<void> {
    const client = await getClient();
    if (client) {
      try {
        const { error } = await client.from('income').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete income from Supabase, removing local copy only.', error);
      }
    }

    removeLocalRecord(LOCAL_KEYS.income, id);
  },

  // Debts
  async getDebts(): Promise<Debt[]> {
    const client = await getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('debts')
          .select('*')
          .order('due_date', { ascending: true });

        if (error) throw error;

        if (data) {
          const mapped = data.map(mapDebtRow);
          writeLocal(LOCAL_KEYS.debts, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to fetch debts from Supabase, using localStorage data.', error);
      }
    }

    return readLocal<Debt>(LOCAL_KEYS.debts);
  },

  async saveDebt(payload: NewDebtInput): Promise<Debt> {
    const client = await getClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('debts')
          .insert([
            {
              name: payload.name,
              amount: payload.amount,
              due_date: payload.dueDate,
              is_paid: payload.isPaid,
              interest_rate: payload.interestRate ?? null,
            },
          ])
          .select('*')
          .single();

        if (error) throw error;
        if (data) {
          const mapped = mapDebtRow(data);
          syncLocalAfterInsert(LOCAL_KEYS.debts, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to save debt to Supabase, storing locally instead.', error);
      }
    }

    const fallback: Debt = {
      id: generateLocalId(),
      ...payload,
      interestRate: payload.interestRate ?? null,
      createdAt: new Date().toISOString(),
    };
    syncLocalAfterInsert(LOCAL_KEYS.debts, fallback);
    return fallback;
  },

  async updateDebt(id: string, updates: Partial<Debt>): Promise<void> {
    const client = await getClient();
    const supabasePayload: Record<string, unknown> = {};

    if (updates.name !== undefined) supabasePayload.name = updates.name;
    if (updates.amount !== undefined) supabasePayload.amount = updates.amount;
    if (updates.dueDate !== undefined) supabasePayload.due_date = updates.dueDate;
    if (updates.isPaid !== undefined) supabasePayload.is_paid = updates.isPaid;
    if (updates.interestRate !== undefined) {
      supabasePayload.interest_rate = updates.interestRate;
    }

    if (client && Object.keys(supabasePayload).length > 0) {
      try {
        const { error } = await client.from('debts').update(supabasePayload).eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to update debt in Supabase, updating local copy only.', error);
      }
    }

    updateLocalRecord<Debt>(LOCAL_KEYS.debts, id, debt => ({ ...debt, ...updates }));
  },

  async deleteDebt(id: string): Promise<void> {
    const client = await getClient();
    if (client) {
      try {
        const { error } = await client.from('debts').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete debt from Supabase, removing local copy only.', error);
      }
    }

    removeLocalRecord(LOCAL_KEYS.debts, id);
  },

  // In the storage object:

  // Savings Goals
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const client = await getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('savings_goals')
          .select('*')
          .order('priority', { ascending: true });

        if (error) throw error;

        if (data) {
          const mapped = data.map(mapSavingsGoalRow);
          writeLocal(LOCAL_KEYS.savingsGoals, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to fetch savings goals from Supabase, using localStorage data.', error);
      }
    }

    return readLocal<SavingsGoal>(LOCAL_KEYS.savingsGoals);
  },

  async saveSavingsGoal(payload: NewSavingsGoalInput): Promise<SavingsGoal> {
    const client = await getClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('savings_goals')
          .insert([
            {
              name: payload.name,
              target_amount: payload.targetAmount,
              current_amount: payload.currentAmount,
              priority: payload.priority,
              color: payload.color,
              icon: payload.icon ?? null,
              deadline: payload.deadline ?? null,
              is_completed: payload.isCompleted,
            },
          ])
          .select('*')
          .single();

        if (error) throw error;
        if (data) {
          const mapped = mapSavingsGoalRow(data);
          syncLocalAfterInsert(LOCAL_KEYS.savingsGoals, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to save savings goal to Supabase, storing locally instead.', error);
      }
    }

    const fallback: SavingsGoal = {
      id: generateLocalId(),
      ...payload,
      createdAt: new Date().toISOString(),
    };
    syncLocalAfterInsert(LOCAL_KEYS.savingsGoals, fallback);
    return fallback;
  },

  async updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<void> {
    const client = await getClient();
    const supabasePayload: Record<string, unknown> = {};

    if (updates.name !== undefined) supabasePayload.name = updates.name;
    if (updates.targetAmount !== undefined) supabasePayload.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined) supabasePayload.current_amount = updates.currentAmount;
    if (updates.priority !== undefined) supabasePayload.priority = updates.priority;
    if (updates.color !== undefined) supabasePayload.color = updates.color;
    if (updates.icon !== undefined) supabasePayload.icon = updates.icon ?? null;
    if (updates.deadline !== undefined) supabasePayload.deadline = updates.deadline ?? null;
    if (updates.isCompleted !== undefined) supabasePayload.is_completed = updates.isCompleted;

    if (client && Object.keys(supabasePayload).length > 0) {
      try {
        const { error } = await client.from('savings_goals').update(supabasePayload).eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to update savings goal in Supabase, updating local copy only.', error);
      }
    }

    updateLocalRecord<SavingsGoal>(LOCAL_KEYS.savingsGoals, id, goal => ({ ...goal, ...updates }));
  },
  async deleteSavingsGoal(id: string): Promise<void> {
    const client = await getClient();
    if (client) {
      try {
        const { error } = await client.from('savings_goals').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete savings goal from Supabase, removing local copy only.', error);
      }
    }

    removeLocalRecord(LOCAL_KEYS.savingsGoals, id);
  },

  // Overflow Allocations
  async getOverflowAllocations(): Promise<OverflowAllocation[]> {
    const client = await getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('overflow_allocations')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped = data.map(mapOverflowAllocationRow);
          writeLocal(LOCAL_KEYS.overflowAllocations, mapped);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to fetch overflow allocations from Supabase, using localStorage data.', error);
      }
    }

    return readLocal<OverflowAllocation>(LOCAL_KEYS.overflowAllocations);
  },

  async saveOverflowAllocation(payload: NewOverflowAllocationInput): Promise<OverflowAllocation> {
    const client = await getClient();

    // First, save the allocation
    let allocation: OverflowAllocation;

    if (client) {
      try {
        const { data, error } = await client
          .from('overflow_allocations')
          .insert([
            {
              amount: payload.amount,
              goal_id: payload.goalId,
              date: payload.date,
              source: payload.source,
              note: payload.note ?? null,
            },
          ])
          .select('*')
          .single();

        if (error) throw error;
        if (data) {
          allocation = mapOverflowAllocationRow(data);
          syncLocalAfterInsert(LOCAL_KEYS.overflowAllocations, allocation);
        } else {
          throw new Error('No data returned');
        }
      } catch (error) {
        console.error('Failed to save overflow allocation to Supabase, storing locally instead.', error);
        allocation = {
          id: generateLocalId(),
          ...payload,
          createdAt: new Date().toISOString(),
        };
        syncLocalAfterInsert(LOCAL_KEYS.overflowAllocations, allocation);
      }
    } else {
      allocation = {
        id: generateLocalId(),
        ...payload,
        createdAt: new Date().toISOString(),
      };
      syncLocalAfterInsert(LOCAL_KEYS.overflowAllocations, allocation);
    }

    // Update the goal's current amount
    const goals = await this.getSavingsGoals();
    const goal = goals.find(g => g.id === payload.goalId);
    
    if (goal) {
      const newAmount = goal.currentAmount + payload.amount;
      const isCompleted = newAmount >= goal.targetAmount;
      
      await this.updateSavingsGoal(goal.id, {
        currentAmount: newAmount,
        isCompleted,
      });
    }

    return allocation;
  },

  async deleteOverflowAllocation(id: string): Promise<void> {
    const client = await getClient();
    if (client) {
      try {
        const { error } = await client.from('overflow_allocations').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete overflow allocation from Supabase, removing local copy only.', error);
      }
    }

    removeLocalRecord(LOCAL_KEYS.overflowAllocations, id);
  },

  // Budget Settings
  async getBudgetSettings(): Promise<BudgetSettings> {
    const client = await getClient();
    const defaultSettings: BudgetSettings = {
      monthlyIncome: 0,
      fixedExpenses: 0,
      savingsTarget: 20,
      overflowDay: 25,
      autoAllocate: true,
      currencyCode: DEFAULT_CURRENCY_CODE,
      currencyLocale: DEFAULT_CURRENCY_LOCALE,
      expenseCategories: Array.from(DEFAULT_EXPENSE_CATEGORIES),
    };

    if (client) {
      try {
        const { data, error } = await client
          .from('budget_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const mapped = mapBudgetSettingsRow(data);
          writeLocal(LOCAL_KEYS.budgetSettings, [mapped]);
          return mapped;
        }
      } catch (error) {
        console.error('Failed to fetch budget settings from Supabase, using localStorage data.', error);
      }
    }

    const localSettings = readLocal<BudgetSettings>(LOCAL_KEYS.budgetSettings);
    if (localSettings.length > 0) {
      const stored = localSettings[0];
      return {
        ...defaultSettings,
        ...stored,
        expenseCategories:
          stored.expenseCategories && stored.expenseCategories.length > 0
            ? stored.expenseCategories
            : defaultSettings.expenseCategories,
      };
    }
    return defaultSettings;
  },

  async saveBudgetSettings(settings: BudgetSettings): Promise<void> {
    const client = await getClient();

    if (client) {
      try {
        // Check if settings exist
        const { data: existing } = await client
          .from('budget_settings')
          .select('id')
          .limit(1)
          .maybeSingle();

        const payload = {
          monthly_income: settings.monthlyIncome,
          fixed_expenses: settings.fixedExpenses,
          savings_target: settings.savingsTarget,
          overflow_day: settings.overflowDay,
          auto_allocate: settings.autoAllocate,
          currency_code: settings.currencyCode,
          currency_locale: settings.currencyLocale,
          expense_categories: settings.expenseCategories,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing
          const { error } = await client
            .from('budget_settings')
            .update(payload)
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await client.from('budget_settings').insert([payload]);

          if (error) throw error;
        }

        writeLocal(LOCAL_KEYS.budgetSettings, [settings]);
      } catch (error) {
        console.error('Failed to save budget settings to Supabase, storing locally instead.', error);
        writeLocal(LOCAL_KEYS.budgetSettings, [settings]);
      }
    } else {
      writeLocal(LOCAL_KEYS.budgetSettings, [settings]);
    }
  },
};
