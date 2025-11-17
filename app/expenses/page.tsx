'use client';

import Link from 'next/link';
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SyncStatus from '@/components/SyncStatus';
import {
  storage,
  Expense,
  Debt,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_LOCALE,
} from '@/lib/storage';
import {
  PlusCircle,
  Trash2,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  SlidersHorizontal,
  LayoutList,
  List,
  Download,
  Printer,
  X,
} from 'lucide-react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import {
  DAY_KEY_FORMAT,
  formatDateForDisplay,
  formatDateForInput,
  parseAppDate,
} from '@/lib/datetime';
import { notifications } from '@/lib/notifications';
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'year';
type AmountPreset = 'all' | 'gte1000' | 'gte5000' | 'gte10000';

type ActiveChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

const datePresetOptions: ReadonlyArray<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
] as const;

const amountPresetOptions: ReadonlyArray<{ id: AmountPreset; label?: string; threshold?: number }> = [
  { id: 'all', label: 'Any amount' },
  { id: 'gte1000', threshold: 1000 },
  { id: 'gte5000', threshold: 5000 },
  { id: 'gte10000', threshold: 10000 },
] as const;

const pageSizeOptions = [25, 50, 100] as const;

const FILTER_STORAGE_KEY = 'expensesFilters';
const DEFAULT_FILTER_STATE = {
  categoryFilter: 'all',
  searchTerm: '',
  datePreset: 'month' as DatePreset,
  amountPreset: 'all' as AmountPreset,
  viewMode: 'detailed' as 'detailed' | 'compact',
};
type FilterSnapshot = typeof DEFAULT_FILTER_STATE;

const isDatePreset = (value: string | null): value is DatePreset =>
  value !== null && ['all', 'today', 'week', 'month', 'year'].includes(value);

const isAmountPreset = (value: string | null): value is AmountPreset =>
  value !== null && ['all', 'gte1000', 'gte5000', 'gte10000'].includes(value);

const isViewMode = (value: string | null): value is 'detailed' | 'compact' =>
  value === 'detailed' || value === 'compact';

const parseFiltersFromParams = (
  params: ReadonlyURLSearchParams,
  categories: string[],
): FilterSnapshot | null => {
  const next: FilterSnapshot = { ...DEFAULT_FILTER_STATE };
  let hasValue = false;

  const date = params.get('date');
  if (isDatePreset(date)) {
    next.datePreset = date;
    hasValue = true;
  }

  const amount = params.get('amount');
  if (isAmountPreset(amount)) {
    next.amountPreset = amount;
    hasValue = true;
  }

  const category = params.get('category');
  if (category && (category === 'all' || categories.includes(category))) {
    next.categoryFilter = category;
    hasValue = true;
  }

  const search = params.get('search');
  if (search !== null) {
    next.searchTerm = search;
    hasValue = true;
  }

  const view = params.get('view');
  if (isViewMode(view)) {
    next.viewMode = view;
    hasValue = true;
  }

  return hasValue ? next : null;
};

const readStoredFilters = (categories: string[]): FilterSnapshot | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FilterSnapshot>;
    const next: FilterSnapshot = { ...DEFAULT_FILTER_STATE };

    if (parsed.datePreset && isDatePreset(parsed.datePreset)) {
      next.datePreset = parsed.datePreset;
    }
    if (parsed.amountPreset && isAmountPreset(parsed.amountPreset)) {
      next.amountPreset = parsed.amountPreset;
    }
    if (
      typeof parsed.categoryFilter === 'string' &&
      (parsed.categoryFilter === 'all' || categories.includes(parsed.categoryFilter))
    ) {
      next.categoryFilter = parsed.categoryFilter;
    }
    if (typeof parsed.searchTerm === 'string') {
      next.searchTerm = parsed.searchTerm;
    }
    if (parsed.viewMode && isViewMode(parsed.viewMode)) {
      next.viewMode = parsed.viewMode;
    }

    return next;
  } catch {
    return null;
  }
};

const formSteps = ['amount', 'category', 'details'] as const;
type FormStep = (typeof formSteps)[number];
const formStepLabels: Record<FormStep, string> = {
  amount: 'Amount',
  category: 'Category',
  details: 'Details',
};

function ExpensesPageInner() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [amountPreset, setAmountPreset] = useState<AmountPreset>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('amount');
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(pageSizeOptions[0]);
  const [pageIndex, setPageIndex] = useState(0);

  const currentFormStepIndex = formSteps.indexOf(formStep);
  const isFirstFormStep = currentFormStepIndex === 0;
  const isLastFormStep = currentFormStepIndex === formSteps.length - 1;

  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSyncedQueryRef = useRef<string>('');

  const {
    data: expensesData = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => storage.getExpenses(),
  });

  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: () => storage.getDebts(),
  });

  const budgetSettingsQuery = useQuery({
    queryKey: ['budgetSettings'],
    queryFn: () => storage.getBudgetSettings(),
  });

  const budgetSettings = budgetSettingsQuery.data;
  const currencyLocale = budgetSettings?.currencyLocale ?? DEFAULT_CURRENCY_LOCALE;
  const currencyCode = budgetSettings?.currencyCode ?? DEFAULT_CURRENCY_CODE;
  const expenseCategories = useMemo(
    () =>
      budgetSettings?.expenseCategories && budgetSettings.expenseCategories.length > 0
        ? budgetSettings.expenseCategories
        : Array.from(DEFAULT_EXPENSE_CATEGORIES),
    [budgetSettings],
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyLocale, currencyCode],
  );

  const formatCurrency = useCallback((value: number) => currencyFormatter.format(value), [currencyFormatter]);

  const formatAmountPresetLabel = useCallback((preset: AmountPreset) => {
    const option = amountPresetOptions.find(option => option.id === preset);
    if (!option) {
      return 'Any amount';
    }
    if (option.label) {
      return option.label;
    }
    if (typeof option.threshold === 'number') {
      return `≥ ${formatCurrency(option.threshold)}`;
    }
    return 'Any amount';
  }, [formatCurrency]);

  useEffect(() => {
    if (expenseCategories.length === 0) {
      setCategory('');
      return;
    }
    setCategory(current => (expenseCategories.includes(current) ? current : expenseCategories[0]));
  }, [expenseCategories]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !expenseCategories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, expenseCategories]);

  useEffect(() => {
    if (filtersHydrated || expenseCategories.length === 0) return;

    const queryFilters = parseFiltersFromParams(searchParams, expenseCategories);
    const storedFilters = queryFilters ? null : readStoredFilters(expenseCategories);
    const applied = queryFilters ?? storedFilters;

    if (applied) {
      setCategoryFilter(applied.categoryFilter);
      setSearchTerm(applied.searchTerm);
      setDatePreset(applied.datePreset);
      setAmountPreset(applied.amountPreset);
      setViewMode(applied.viewMode);
    }

    const initialQuery = searchParams.toString();
    lastSyncedQueryRef.current = initialQuery ? `${pathname}?${initialQuery}` : pathname;
    setFiltersHydrated(true);
  }, [filtersHydrated, expenseCategories, searchParams, pathname]);

  useEffect(() => {
    if (!filtersHydrated) return;

    const params = new URLSearchParams(searchParams.toString());
    const setParam = (key: string, value: string, defaultValue: string) => {
      if (value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    };

    setParam('date', datePreset, DEFAULT_FILTER_STATE.datePreset);
    setParam('amount', amountPreset, DEFAULT_FILTER_STATE.amountPreset);
    setParam('category', categoryFilter, DEFAULT_FILTER_STATE.categoryFilter);
    setParam('view', viewMode, DEFAULT_FILTER_STATE.viewMode);

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    } else {
      params.delete('search');
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    if (nextUrl === lastSyncedQueryRef.current) {
      return;
    }

    lastSyncedQueryRef.current = nextUrl;
    router.replace(nextUrl, { scroll: false });
  }, [
    datePreset,
    amountPreset,
    categoryFilter,
    searchTerm,
    viewMode,
    filtersHydrated,
    router,
    pathname,
    searchParams,
  ]);

  useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined') return;
    const snapshot: FilterSnapshot = {
      categoryFilter,
      searchTerm,
      datePreset,
      amountPreset,
      viewMode,
    };
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(snapshot));
  }, [categoryFilter, searchTerm, datePreset, amountPreset, viewMode, filtersHydrated]);

  const expenses = useMemo<Expense[]>(() => {
    return [...expensesData].sort((a, b) => {
      const aTime = parseAppDate(a.date)?.getTime() ?? 0;
      const bTime = parseAppDate(b.date)?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [expensesData]);
  const formRef = useRef<HTMLFormElement>(null);
  const saveExpenseMutation = useMutation({
    mutationFn: storage.saveExpense,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setAmount('');
      setDescription('');
      setDate(formatDateForInput(new Date()));
      setFormError(null);
      setListError(null);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: storage.deleteExpense,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setListError(null);
    },
  });

  const openFormSheet = (step: FormStep = 'amount') => {
    setFormError(null);
    setFormStep(step);
    setIsFormSheetOpen(true);
  };

  const closeFormSheet = () => {
    setIsFormSheetOpen(false);
    setFormStep('amount');
    setFormError(null);
  };

  const ensureAmountValid = () => {
    if (!amount || Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return false;
    }
    return true;
  };

  const ensureDateValid = () => {
    if (!date) {
      setFormError('Select a date and time for the expense.');
      return false;
    }

    if (!parseAppDate(date)) {
      setFormError('Enter a valid date and time.');
      return false;
    }
    return true;
  };

  const goToNextFormStep = () => {
    setFormError(null);
    if (formStep === 'amount' && !ensureAmountValid()) {
      return;
    }

    if (!isLastFormStep) {
      setFormStep(formSteps[currentFormStepIndex + 1]);
    }
  };

  const goToPreviousFormStep = () => {
    setFormError(null);
    if (!isFirstFormStep) {
      setFormStep(formSteps[currentFormStepIndex - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isFormSheetOpen && !isLastFormStep) return;
    setFormError(null);
    if (!ensureAmountValid()) {
      return;
    }

    if (!ensureDateValid()) {
      return;
    }

    try {
      // Save the values before clearing the form
      const savedAmount = parseFloat(amount);
      const savedCategory = category;
      
      await saveExpenseMutation.mutateAsync({
        amount: savedAmount,
        category: savedCategory,
        description,
        date,
      });
      
      // Close form first
      if (isFormSheetOpen) {
        closeFormSheet();
      }
      
      // Then send notification with saved values
      const notifSettings = JSON.parse(
        localStorage.getItem('notificationSettings') || '{"expenseAdded":true}'
      );
      if (notifSettings.expenseAdded) {
        // Use setTimeout to ensure it happens after state updates
        setTimeout(() => {
          notifications.notifyExpenseAdded(savedAmount, savedCategory);
        }, 100);
      }
    } catch {
      setFormError('We could not save that expense. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Delete this expense?');
    if (!confirmed) return;

    try {
      await deleteExpenseMutation.mutateAsync(id);
    } catch {
      setListError('Failed to delete expense. Please refresh.');
    }
  };

  const todayTotal = useMemo(() => {
    const today = new Date();
    return expenses.reduce((sum, expense) => {
      const parsed = parseAppDate(expense.date);
      if (!parsed || !isSameDay(parsed, today)) {
        return sum;
      }
      return sum + expense.amount;
    }, 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const selectedWeek = {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
    const selectedMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const selectedYear = { start: startOfYear(now), end: endOfYear(now) };

    return expenses.filter(expense => {
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const matchesSearch = searchTerm.trim().length === 0
        || expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
        || expense.category.toLowerCase().includes(searchTerm.toLowerCase());

      const parsedDate = parseAppDate(expense.date);
      let matchesDate = true;
      if (datePreset !== 'all') {
        if (!parsedDate) {
          matchesDate = false;
        } else {
          switch (datePreset) {
            case 'today':
              matchesDate = isSameDay(parsedDate, now);
              break;
            case 'week':
              matchesDate = isWithinInterval(parsedDate, selectedWeek);
              break;
            case 'month':
              matchesDate = isWithinInterval(parsedDate, selectedMonth);
              break;
            case 'year':
              matchesDate = isWithinInterval(parsedDate, selectedYear);
              break;
            default:
              matchesDate = true;
          }
        }
      }

      let matchesAmount = true;
      if (amountPreset !== 'all') {
        const threshold = amountPresetOptions.find(option => option.id === amountPreset)?.threshold ?? 0;
        matchesAmount = expense.amount >= threshold;
      }

      return matchesCategory && matchesSearch && matchesDate && matchesAmount;
    });
  }, [expenses, categoryFilter, searchTerm, datePreset, amountPreset]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  useEffect(() => {
    setPageIndex(prev => {
      const maxPage = Math.max(0, Math.ceil(filteredExpenses.length / pageSize) - 1);
      return Math.min(prev, maxPage);
    });
  }, [filteredExpenses.length, pageSize]);

  const paginatedExpenses = useMemo(() => {
    const maxPage = Math.max(0, Math.ceil(filteredExpenses.length / pageSize) - 1);
    const safePage = Math.min(pageIndex, maxPage);
    const start = safePage * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, pageIndex, pageSize]);

  const maxFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((max, expense) => Math.max(max, expense.amount), 0);
  }, [filteredExpenses]);

  const hasActiveFilters = useMemo(() => {
    return (
      categoryFilter !== 'all' ||
      datePreset !== 'all' ||
      amountPreset !== 'all' ||
      searchTerm.trim().length > 0
    );
  }, [categoryFilter, datePreset, amountPreset, searchTerm]);

  const filteredCount = filteredExpenses.length;
  const totalCount = expenses.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(filteredCount, 1) / pageSize));
  const clampedPageIndex = Math.min(pageIndex, totalPages - 1);
  const pageStart = filteredCount === 0 ? 0 : clampedPageIndex * pageSize + 1;
  const pageEnd = filteredCount === 0 ? 0 : Math.min(filteredCount, (clampedPageIndex + 1) * pageSize);

  const activeFilterChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    if (categoryFilter !== 'all') {
      chips.push({
        key: 'category',
        label: `Category: ${categoryFilter}`,
        onRemove: () => setCategoryFilter('all'),
      });
    }
    if (datePreset !== 'all') {
      const label = datePresetOptions.find(option => option.id === datePreset)?.label ?? 'Custom range';
      chips.push({
        key: 'date',
        label: label,
        onRemove: () => setDatePreset('all'),
      });
    }
    if (amountPreset !== 'all') {
      chips.push({
        key: 'amount',
        label: formatAmountPresetLabel(amountPreset),
        onRemove: () => setAmountPreset('all'),
      });
    }
    if (searchTerm.trim().length > 0) {
      chips.push({
        key: 'search',
        label: `Search: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm(''),
      });
    }
    return chips;
  }, [categoryFilter, datePreset, amountPreset, searchTerm, formatAmountPresetLabel]);

  const upcomingDebts = useMemo(() => {
    const debts = debtsQuery.data ?? [];
    const todayStart = startOfDay(new Date());
    return debts
      .filter((debt: Debt) => !debt.isPaid)
      .filter((debt: Debt) => {
        const due = parseAppDate(debt.dueDate);
        return due ? due >= todayStart : false;
      })
      .sort((a, b) => {
        const aDate = parseAppDate(a.dueDate)?.getTime() ?? 0;
        const bDate = parseAppDate(b.dueDate)?.getTime() ?? 0;
        return aDate - bDate;
      })
      .slice(0, 3);
  }, [debtsQuery.data]);

  const resetFilters = () => {
    setCategoryFilter('all');
    setSearchTerm('');
    setDatePreset('all');
    setAmountPreset('all');
  };

  const handleExportFiltered = () => {
    if (filteredExpenses.length === 0 || typeof window === 'undefined') return;
    try {
      setIsExporting(true);
      const header = ['Date', 'Category', 'Amount', 'Description'];
      const rows = filteredExpenses.map(expense => {
        const parsed = parseAppDate(expense.date);
        const formatted = parsed ? format(parsed, "yyyy-MM-dd'T'HH:mm") : expense.date;
        const description = expense.description?.replace(/"/g, '""') ?? '';
        return [`"${formatted}"`, `"${expense.category}"`, `${expense.amount}`, `"${description}"`].join(',');
      });
      const csvContent = [header.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses-filtered-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const weekdayBuckets = useMemo(() => {
    const base: Record<number, { total: number; count: number }> = {
      0: { total: 0, count: 0 },
      1: { total: 0, count: 0 },
      2: { total: 0, count: 0 },
      3: { total: 0, count: 0 },
      4: { total: 0, count: 0 },
      5: { total: 0, count: 0 },
      6: { total: 0, count: 0 },
    };

    filteredExpenses.forEach(expense => {
      const parsed = parseAppDate(expense.date);
      if (!parsed) return;
      const weekdayIndex = getDay(parsed);
      base[weekdayIndex].total += expense.amount;
      base[weekdayIndex].count += 1;
    });

    const entries = (Object.entries(base) as Array<[string, { total: number; count: number }]>).map(
      ([key, value]) => {
        const index = Number(key);
        const average = value.count > 0 ? value.total / value.count : 0;
        return {
          index,
          label: format(
            subDays(startOfDay(new Date()), (startOfDay(new Date()).getDay() - index + 7) % 7),
            'EEE',
          ),
          total: value.total,
          count: value.count,
          average,
        };
      },
    );

    const maxAverage = entries.reduce((max, entry) => Math.max(max, entry.average), 0);
    return { entries, maxAverage };
  }, [filteredExpenses]);

  const topWeekday = useMemo(() => {
    if (weekdayBuckets.entries.length === 0) {
      return null;
    }
    return weekdayBuckets.entries.reduce<(typeof weekdayBuckets.entries)[number] | null>(
      (acc, entry) => {
        if (!acc || entry.average > acc.average) {
          return entry;
        }
        return acc;
      },
      null,
    );
  }, [weekdayBuckets]);

  const recentTrail = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return { points: [] as Array<{ key: string; date: Date; total: number; bucket: number }> };
    }

    const latestParsed = parseAppDate(filteredExpenses[0].date) ?? new Date();
    const end = startOfDay(latestParsed);
    const start = subDays(end, 27);

    const range = eachDayOfInterval({ start, end });
    const totalsByDay = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      const parsed = parseAppDate(expense.date);
      if (!parsed) return acc;
      const key = format(parsed, DAY_KEY_FORMAT);
      acc[key] = (acc[key] ?? 0) + expense.amount;
      return acc;
    }, {});

    const maxTotal = Object.values(totalsByDay).reduce((max, value) => Math.max(max, value), 0);

    const points = range.map(dateObj => {
      const key = format(dateObj, DAY_KEY_FORMAT);
      const total = totalsByDay[key] ?? 0;
      const bucket = maxTotal > 0 ? Math.ceil((total / maxTotal) * 4) : 0;
      return {
        key,
        date: dateObj,
        total,
        bucket,
      };
    });

    return { points };
  }, [filteredExpenses]);

  const monthTotal = useMemo(() => {
    const currentMonthReference = new Date();
    return expenses.reduce((sum, expense) => {
      const parsed = parseAppDate(expense.date);
      if (!parsed || !isSameMonth(parsed, currentMonthReference)) {
        return sum;
      }
      return sum + expense.amount;
    }, 0);
  }, [expenses]);

  const averageSpend = useMemo(() => {
    if (expenses.length === 0) return 0;

    let total = 0;
    const days = new Set<string>();

    expenses.forEach(expense => {
      const parsed = parseAppDate(expense.date);
      if (!parsed) return;
      days.add(format(parsed, DAY_KEY_FORMAT));
      total += expense.amount;
    });

    return days.size === 0 ? 0 : total / days.size;
  }, [expenses]);

  const expensesByMonth = useMemo(() => {
    const buckets = new Map<string, number>();
    expenses.forEach(expense => {
      const parsed = parseAppDate(expense.date);
      if (!parsed) return;
      const key = format(parsed, 'yyyy-MM');
      buckets.set(key, (buckets.get(key) ?? 0) + expense.amount);
    });
    return buckets;
  }, [expenses]);

  const expenseTrendMonths = useMemo(() => {
    const base = startOfMonth(new Date());
    return Array.from({ length: 6 }, (_, index) => subMonths(base, 5 - index));
  }, []);

  const monthlySpendingTrend = useMemo(() => {
    return expenseTrendMonths.map(referenceDate => {
      const monthKey = format(referenceDate, 'yyyy-MM');
      return {
        monthKey,
        label: format(referenceDate, 'MMM'),
        total: expensesByMonth.get(monthKey) ?? 0,
      };
    });
  }, [expenseTrendMonths, expensesByMonth]);

  const spendingTrendMax = useMemo(
    () => monthlySpendingTrend.reduce((max, point) => Math.max(max, point.total), 0),
    [monthlySpendingTrend],
  );

  const currentSpendingLabel = monthlySpendingTrend.at(-1)?.label ?? format(new Date(), 'MMM');
  const latestSpendingTotal = monthlySpendingTrend.at(-1)?.total ?? 0;
  const previousSpendingTotal = monthlySpendingTrend.at(-2)?.total ?? 0;
  const spendingDelta = latestSpendingTotal - previousSpendingTotal;
  const spendingDeltaPercent =
    previousSpendingTotal > 0 ? (spendingDelta / previousSpendingTotal) * 100 : null;
  const spendingDeltaLabel = useMemo(() => {
    if (spendingDelta === 0) {
      return 'No change from last month';
    }
    const direction = spendingDelta > 0 ? 'Up' : 'Down';
    const percentText =
      spendingDeltaPercent !== null ? ` (${Math.abs(spendingDeltaPercent).toFixed(1)}%)` : '';
    return `${direction} ${formatCurrency(Math.abs(spendingDelta))}${percentText}`;
  }, [formatCurrency, spendingDelta, spendingDeltaPercent]);

  const quickAmounts = [1000, 2500, 5000, 10000];

  const trailPalette = [
    'bg-slate-800/80',
    'bg-amber-900/70',
    'bg-amber-700/70',
    'bg-amber-500/80',
    'bg-rose-500/80',
  ] as const;

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      'Transportation': 'bg-sky-500/15 text-sky-200 border-sky-500/30',
      'Entertainment': 'bg-purple-500/15 text-purple-200 border-purple-500/30',
      'Utilities': 'bg-lime-500/15 text-lime-200 border-lime-500/30',
      'Communication': 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
      'Healthcare': 'bg-rose-500/15 text-rose-200 border-rose-500/30',
      'Shopping': 'bg-pink-500/15 text-pink-200 border-pink-500/30',
      'Other': 'bg-slate-500/15 text-slate-200 border-slate-500/30'
    };
    return colors[cat] || colors['Other'];
  };

  const filterPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Filter size={16} />
          <span className="text-sm font-semibold uppercase tracking-wide">Filters</span>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 transition hover:border-amber-500 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus-within:border-amber-500">
        <Search size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search description or category"
          className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </label>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-500">Timeframe</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {datePresetOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDatePreset(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                datePreset === option.id
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-100'
                  : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-amber-500/40 hover:text-amber-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-500">Amount</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {amountPresetOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAmountPreset(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                amountPreset === option.id
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100'
                  : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-100'
              }`}
            >
              {formatAmountPresetLabel(option.id)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">Category</p>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
        >
          <option className="bg-slate-950/75 backdrop-blur" value="all">All categories</option>
          {expenseCategories.map(cat => (
            <option className="bg-slate-950/75 backdrop-blur" key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-slate-100 pb-14 sm:pb-18">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-amber-950 to-rose-950 text-white px-4 sm:px-6 lg:px-12 pt-8 pb-10 lg:pt-10 lg:pb-12 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Expenses</h1>
          <div className="flex items-center gap-2">
            <p className="text-amber-200 text-sm">Today&apos;s total:</p>
            <p className="text-xl font-bold text-amber-100">{formatCurrency(todayTotal)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 -mt-6 lg:-mt-10 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8 grid gap-4 lg:gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Today&apos;s spend</p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">{formatCurrency(todayTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">This month</p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">{formatCurrency(monthTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Daily average</p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">{formatCurrency(Math.round(averageSpend))}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Monthly spending trend</h3>
              <p className="text-sm text-slate-400">Track the last six months at a glance.</p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                This month ({currentSpendingLabel})
              </p>
              <p className="text-lg font-semibold text-amber-200">
                {formatCurrency(latestSpendingTotal)}
              </p>
              <p className="text-xs text-slate-400">{spendingDeltaLabel}</p>
            </div>
          </div>
          <div className="mt-5 flex h-40 items-end gap-2 sm:gap-3">
            {monthlySpendingTrend.map(point => {
              const height =
                spendingTrendMax > 0 ? Math.max(12, (point.total / spendingTrendMax) * 100) : 0;
              return (
                <div key={point.monthKey} className="flex flex-1 h-full flex-col items-center gap-2">
                  <div className="flex h-full w-full max-w-[40px] items-end rounded-2xl border border-amber-500/40 bg-slate-950/40 p-0.5">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-amber-600 via-amber-400 to-rose-400 transition-[height]"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${formatCurrency(point.total)}`}
                    />
                  </div>
                  <div className="flex flex-col items-center text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>{point.label}</span>
                    <span className="text-[10px] text-amber-200">{formatCurrency(point.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Use this trend to spot rising categories before they impact your budget.
          </p>
        </div>

        <SyncStatus
          isLoading={isLoading}
          isFetching={isFetching}
          lastUpdated={dataUpdatedAt}
          className="mb-6 justify-end"
        />

        {(isError || listError) && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {listError || 'Unable to refresh expenses from Supabase. Showing any cached records.'}
            {isError && error instanceof Error ? ` (${error.message})` : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-200/80">
              <span>Try refreshing or resetting filters if this persists.</span>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-amber-400/50 px-2 py-0.5 text-[10px] uppercase tracking-wide hover:bg-amber-500/20"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:block h-full">
            <div className="sticky top-32 space-y-4">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-lg">
                {filterPanel}
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-5 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-emerald-300">Upcoming due dates</p>
                  <h3 className="text-lg font-semibold text-slate-100">Stay ahead of bills</h3>
                </div>
                <Link
                  href="/debts"
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-500/60 hover:bg-emerald-500/20"
                >
                  Manage debts
                </Link>
              </div>
              {debtsQuery.isLoading ? (
                <div className="mt-4 space-y-3">
                  {[0, 1, 2].map(key => (
                    <div key={key} className="animate-pulse rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                      <div className="h-3 w-24 rounded bg-slate-800/60" />
                      <div className="mt-2 h-4 w-36 rounded bg-slate-800/50" />
                    </div>
                  ))}
                </div>
              ) : upcomingDebts.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {upcomingDebts.map(debt => {
                    const dueDate = formatDateForDisplay(debt.dueDate, 'MMM d');
                    const parsedDue = parseAppDate(debt.dueDate);
                    const isUrgent =
                      parsedDue &&
                      isWithinInterval(parsedDue, {
                        start: startOfDay(new Date()),
                        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
                      });
                    return (
                      <li
                        key={debt.id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                          isUrgent
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                            : 'border-slate-800/80 bg-slate-950/40 text-slate-200'
                        }`}
                      >
                        <div>
                          <p className="text-xs uppercase tracking-wider">{dueDate}</p>
                          <p className="text-sm font-semibold text-slate-100">{debt.name}</p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-200">{formatCurrency(debt.amount)}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-5 text-sm text-slate-300">
                  All caught up—no unpaid debts due soon. Keep logging bills so nothing sneaks up on you.
                </div>
              )}
            </div>
            </div>
          </aside>

          <div className="flex flex-col gap-8">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Filtered total</p>
                  <p className="text-xl font-semibold text-amber-200">
                    {formatCurrency(filteredTotal)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {filteredCount === totalCount
                      ? 'Showing every expense'
                      : `Showing ${filteredCount} of ${totalCount} expenses`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {filteredCount === 0
                      ? 'No entries to paginate'
                      : `Rows ${pageStart}-${pageEnd} · Page ${clampedPageIndex + 1} of ${totalPages}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterSheetOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-amber-500/60 hover:text-amber-100 lg:hidden"
                  >
                    <SlidersHorizontal size={16} />
                    Filters
                  </button>
                  <div className="inline-flex rounded-xl border border-slate-800/70 bg-slate-950/50 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('detailed')}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        viewMode === 'detailed'
                          ? 'border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-inner'
                          : 'text-slate-300 hover:text-amber-100'
                      }`}
                      aria-pressed={viewMode === 'detailed'}
                    >
                      <LayoutList size={16} />
                      Detailed
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('compact')}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        viewMode === 'compact'
                          ? 'border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-inner'
                          : 'text-slate-300 hover:text-amber-100'
                      }`}
                      aria-pressed={viewMode === 'compact'}
                    >
                      <List size={16} />
                      Compact
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <label className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number]);
                      setPageIndex(0);
                    }}
                    className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-slate-100 focus:border-amber-500"
                  >
                    {pageSizeOptions.map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPageIndex(prev => Math.max(prev - 1, 0))}
                    disabled={clampedPageIndex === 0 || filteredCount === 0}
                    className="rounded-full border border-slate-700/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-amber-500 hover:text-amber-100 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-slate-500">
                    {filteredCount === 0 ? '0 of 0' : `${pageStart}-${pageEnd} of ${filteredCount}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPageIndex(prev => Math.min(prev + 1, totalPages - 1))}
                    disabled={clampedPageIndex >= totalPages - 1 || filteredCount === 0}
                    className="rounded-full border border-slate-700/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-amber-500 hover:text-amber-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilterChips.map(chip => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 transition hover:border-amber-500/60 hover:text-amber-100"
                    >
                      {chip.label}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-amber-500 hover:text-amber-100"
                >
                  <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                  {isFetching ? 'Refreshing' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={handleExportFiltered}
                  disabled={isExporting || filteredCount === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-500/80 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-amber-100"
                >
                  <Printer size={16} />
                  Print View
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-amber-500/40 hover:text-amber-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 shadow-lg lg:hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-amber-200">Quick add</p>
                  <h3 className="text-lg font-semibold text-slate-100">Log an expense in a few taps</h3>
                  <p className="mt-1 text-sm text-amber-100/80">
                    Pick an amount or open the guided sheet to finish the details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openFormSheet('amount')}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-md transition hover:bg-amber-400"
                >
                  <PlusCircle size={16} />
                  Add
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickAmounts.map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAmount(String(value));
                      openFormSheet('category');
                    }}
                    className="rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/30"
                  >
                    +{currencyFormatter.format(value)}
                  </button>
                ))}
              </div>
            </div>

            {filteredCount > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-slate-900/70 p-5 sm:p-6 shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-amber-200">Spending patterns</p>
                    <h3 className="text-lg font-semibold text-slate-100">Where your money clusters</h3>
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-right text-xs text-slate-400">
                    <p>
                      {topWeekday
                        ? `Top day: ${topWeekday.label} · ${currencyFormatter.format(topWeekday.average)} avg`
                        : 'Top day: —'}
                    </p>
                    <p>Total filtered: {currencyFormatter.format(filteredTotal)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <div className="space-y-3">
                    <div className="flex h-36 items-end gap-3 sm:gap-4">
                      {weekdayBuckets.entries.map(entry => {
                        const relativeHeight =
                          weekdayBuckets.maxAverage > 0
                            ? Math.max(14, (entry.average / weekdayBuckets.maxAverage) * 100)
                            : 0;
                        return (
                          <div key={entry.index} className="flex flex-1 h-full flex-col items-center gap-2">
                            <div className="flex h-full w-full max-w-[40px] items-end rounded-2xl border border-amber-500/30 bg-slate-950/50 p-0.5">
                              <div
                                className="w-full rounded-xl bg-gradient-to-t from-amber-500 via-amber-400 to-rose-500 transition-[height]"
                                style={{ height: `${relativeHeight}%` }}
                                title={`${entry.label}: ${currencyFormatter.format(entry.average)} average spend (${entry.count} entries)`}
                              />
                            </div>
                            <div className="flex flex-col items-center text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              <span>{entry.label}</span>
                              <span className="text-[9px] text-amber-200/80">
                                {entry.count}× · {currencyFormatter.format(entry.total)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Bars scale by average spend per weekday for the current filters. Taller bars highlight costlier
                      days.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <p>Last 28 days</p>
                      <span>
                        {recentTrail.points.length > 0
                          ? `${format(recentTrail.points[0].date, 'MMM d')} – ${format(
                              recentTrail.points.at(-1)!.date,
                              'MMM d',
                            )}`
                          : '—'}
                      </span>
                    </div>
                    {recentTrail.points.length > 0 ? (
                      <div className="mt-3 grid grid-cols-7 gap-1">
                        {recentTrail.points.map(point => {
                          const colorClass = trailPalette[point.bucket] ?? trailPalette[0];
                          return (
                            <span
                              key={point.key}
                              className={`h-6 w-full rounded-lg transition ${colorClass}`}
                              title={`${format(point.date, 'MMM d')}: ${currencyFormatter.format(point.total)}`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                        Log a few expenses to reveal a four-week activity trail.
                      </p>
                    )}
                    <p className="mt-3 text-[11px] text-slate-500">
                      Darker squares represent larger daily totals. Use filters to compare different timeframes or
                      categories.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-7 shadow-xl lg:block"
            >
              <h2 className="mb-5 flex items-center gap-3 text-lg font-bold text-slate-100">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/30 text-amber-200 shadow-md">
                  <PlusCircle size={18} className="text-amber-100" />
                </span>
                <span>Add New Expense</span>
              </h2>

              <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Amount ({currencyCode})
                    </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                    inputMode="numeric"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickAmounts.map(value => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setAmount(String(value))}
                        className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-500/60 hover:text-amber-100"
                      >
                        +{formatCurrency(value)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 font-medium text-slate-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Lunch, groceries, etc."
                    className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Date &amp; time
                  </label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 font-medium text-slate-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveExpenseMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 py-4 font-bold text-slate-950 shadow-lg transition-all hover:from-amber-400 hover:to-rose-500 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PlusCircle size={20} className="text-slate-950" />
                  {saveExpenseMutation.isPending ? 'Saving...' : 'Add Expense'}
                </button>
                {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}
              </div>
            </form>

            

            <div className="space-y-4 sm:space-y-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                <Calendar size={20} className="text-amber-200" />
                Recent Expenses
              </h2>

              {isLoading ? (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-8 text-center text-slate-300 sm:p-10">
                  Fetching your expenses...
                </div>
              ) : filteredExpenses.length === 0 ? (
                hasActiveFilters ? (
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-10 text-center shadow-md">
                    <div className="mb-4 text-6xl">🔍</div>
                    <p className="font-medium text-slate-300">Nothing matches these filters</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try widening the timeframe, lowering the minimum amount, or searching a different keyword.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-500/80 hover:bg-amber-500/20"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-10 text-center shadow-md">
                    <div className="mb-4 text-6xl">📝</div>
                    <p className="font-medium text-slate-300">No expenses recorded yet</p>
                    <p className="mt-2 text-sm text-slate-500">Add your first expense above to start tracking.</p>
                  </div>
                )
              ) : (
                paginatedExpenses.map(expense => {
                  const formattedDate = formatDateForDisplay(expense.date);
                  const isHighSpender = expense.amount > averageSpend * 1.2;
                  const progress =
                    maxFilteredAmount > 0 ? Math.round((expense.amount / maxFilteredAmount) * 100) : 0;

                  if (viewMode === 'compact') {
                    return (
                      <div
                        key={expense.id}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-amber-200">{expense.category}</span>
                            <span className="text-[11px] text-slate-500">{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-amber-100">
                              {formatCurrency(expense.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(expense.id)}
                              className="rounded-lg p-1 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-60"
                              disabled={deleteExpenseMutation.isPending}
                              aria-label="Delete expense"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="flex-1 truncate text-xs text-slate-400">
                            {expense.description || 'No note added'}
                          </p>
                          {isHighSpender && (
                            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200">
                              High
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={expense.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-md transition-all hover:shadow-lg sm:p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                              {expense.category}
                            </span>
                            {isHighSpender && (
                              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose-200">
                                Above average
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar size={12} className="text-slate-500" />
                              {formattedDate}
                            </span>
                          </div>
                          {expense.description && (
                            <p className="mb-2 text-sm font-medium text-slate-300">{expense.description}</p>
                          )}
                          <p className="text-2xl font-bold text-slate-100">
                            {formatCurrency(expense.amount)}
                          </p>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-60"
                          disabled={deleteExpenseMutation.isPending}
                          aria-label="Delete expense"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close filters"
            onClick={() => setIsFilterSheetOpen(false)}
          />
          <div className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-3xl border border-slate-800/80 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-100">Filters</h2>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="rounded-full border border-slate-800/80 p-2 text-slate-300 transition hover:border-amber-500 hover:text-amber-100"
                aria-label="Close filters"
              >
                <X size={16} />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}

      {isFormSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close expense form"
            onClick={closeFormSheet}
          />
          <div className="relative w-full max-h-[82vh] overflow-y-auto rounded-t-3xl border border-amber-500/20 bg-slate-950 p-5 shadow-2xl">
            <form onSubmit={handleSubmit} ref={formRef} noValidate className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-amber-200">Step {currentFormStepIndex + 1} of {formSteps.length}</p>
                  <h2 className="text-lg font-semibold text-slate-100">New Expense · {formStepLabels[formStep]}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeFormSheet}
                  className="rounded-full border border-amber-500/30 p-2 text-amber-100 transition hover:bg-amber-500/20"
                  aria-label="Close expense form"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {formSteps.map((step, index) => (
                  <span
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      index <= currentFormStepIndex ? 'bg-amber-400' : 'bg-slate-800/80'
                    }`}
                  />
                ))}
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-slate-950/60 p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-100/80">
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {currencyFormatter.format(parseFloat(amount || '0'))}
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {category}
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {date ? formatDateForDisplay(date) : 'Date pending'}
                  </span>
                </div>

                {formStep === 'amount' && (
                  <div className="space-y-4">
                    <div>
                    <label className="mb-2 block text-sm font-semibold text-amber-100">
                      Amount ({currencyCode})
                    </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1000"
                        className="w-full rounded-xl border-2 border-amber-500/40 bg-slate-950/80 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-amber-200/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAmount(String(value))}
                          className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-400 hover:bg-amber-400/30"
                        >
                          +{currencyFormatter.format(value)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formStep === 'category' && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-amber-100">Select a category</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {expenseCategories.map(option => {
                        const isActive = category === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setCategory(option)}
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                              isActive
                                ? 'border-amber-500 bg-amber-500/20 text-amber-100'
                                : 'border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-amber-500/40 hover:text-amber-100'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formStep === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-amber-100">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Lunch, groceries, etc."
                        className="w-full rounded-xl border-2 border-amber-500/40 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-amber-200/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-amber-100">
                        Date &amp; time
                      </label>
                      <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border-2 border-amber-500/40 bg-slate-950/80 px-4 py-3 font-medium text-slate-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-sm font-medium text-rose-300">{formError}</p>
              )}

              <div className="flex items-center justify-between gap-3">
                {!isFirstFormStep ? (
                  <button
                    type="button"
                    onClick={goToPreviousFormStep}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-400 hover:text-amber-50"
                  >
                    Back
                  </button>
                ) : (
                  <span className="text-xs uppercase tracking-wide text-amber-200/70">
                    Step {currentFormStepIndex + 1} of {formSteps.length}
                  </span>
                )}
                {isLastFormStep ? (
                  <button
                    type="button"
                    disabled={saveExpenseMutation.isPending}
                    onClick={() => formRef.current?.requestSubmit()}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-md transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlusCircle size={16} />
                    {saveExpenseMutation.isPending ? 'Saving...' : 'Save expense'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToNextFormStep}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-400 hover:text-amber-50"
                  >
                    Next
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] w-full px-4 py-10 text-center text-sm text-slate-400">
          Loading expenses…
        </div>
      }
    >
      <ExpensesPageInner />
    </Suspense>
  );
}
