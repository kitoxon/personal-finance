export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  month: string;
}

export interface Debt {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

export const storage = {
  // Expenses
  getExpenses(): Expense[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('expenses');
    return data ? JSON.parse(data) : [];
  },
  
  saveExpense(expense: Expense) {
    const expenses = this.getExpenses();
    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
  },
  
  deleteExpense(id: string) {
    const expenses = this.getExpenses().filter(e => e.id !== id);
    localStorage.setItem('expenses', JSON.stringify(expenses));
  },

  // Income
  getIncome(): Income[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('income');
    return data ? JSON.parse(data) : [];
  },
  
  saveIncome(income: Income) {
    const incomes = this.getIncome();
    incomes.push(income);
    localStorage.setItem('income', JSON.stringify(incomes));
  },
  
  deleteIncome(id: string) {
    const incomes = this.getIncome().filter(i => i.id !== id);
    localStorage.setItem('income', JSON.stringify(incomes));
  },

  // Debts
  getDebts(): Debt[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('debts');
    return data ? JSON.parse(data) : [];
  },
  
  saveDebt(debt: Debt) {
    const debts = this.getDebts();
    debts.push(debt);
    localStorage.setItem('debts', JSON.stringify(debts));
  },
  
  updateDebt(id: string, updates: Partial<Debt>) {
    const debts = this.getDebts();
    const index = debts.findIndex(d => d.id === id);
    if (index !== -1) {
      debts[index] = { ...debts[index], ...updates };
      localStorage.setItem('debts', JSON.stringify(debts));
    }
  },
  
  deleteDebt(id: string) {
    const debts = this.getDebts().filter(d => d.id !== id);
    localStorage.setItem('debts', JSON.stringify(debts));
  }
};