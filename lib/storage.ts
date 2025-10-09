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
  createdAt?: string;
}

export type NewExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
export type NewIncomeInput = Omit<Income, 'id' | 'createdAt'>;
export type NewDebtInput = Omit<Debt, 'id' | 'createdAt'>;

const LOCAL_KEYS = {
  expenses: 'expenses',
  income: 'income',
  debts: 'debts',
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
};
