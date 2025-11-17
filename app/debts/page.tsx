'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SyncStatus from '@/components/SyncStatus';
import { storage, Debt } from '@/lib/storage';
import {
  PlusCircle,
  Trash2,
  CreditCard,
  CheckCircle,
  Circle,
  AlertCircle,
  Search,
  RefreshCw,
  SlidersHorizontal,
  LayoutList,
  List,
  Printer,
  CheckSquare,
  Square,
  X,
  LineChart,
  Pencil,
} from 'lucide-react';
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
} from 'date-fns';
import { formatDateForDisplay, parseAppDate } from '@/lib/datetime';
import { DebtPlanModal } from '@/components/DebtPlanModal';
import { DebtStrategyComparison } from '@/components/DebtStrategyComparison';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const quickAmounts = [5000, 10000, 25000, 50000] as const;
const formSteps = ['amount', 'details', 'schedule'] as const;
type FormStep = (typeof formSteps)[number];
const formStepLabels: Record<FormStep, string> = {
  amount: 'Amount',
  details: 'Details',
  schedule: 'Schedule',
};

const formatInterestLabel = (rate?: number | null) => {
  if (rate === null || rate === undefined) {
    return null;
  }
  const percent = Number((rate * 100).toFixed(2));
  return `${percent}% APR`;
};

export default function DebtsPage() {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [planDebt, setPlanDebt] = useState<Debt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaid, setShowPaid] = useState(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('amount');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const currentFormStepIndex = formSteps.indexOf(formStep);
  const isFirstFormStep = currentFormStepIndex === 0;
  const isLastFormStep = currentFormStepIndex === formSteps.length - 1;

  const queryClient = useQueryClient();

  const {
    data: debtsData = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['debts'],
    queryFn: () => storage.getDebts(),
  });

  const debts = useMemo<Debt[]>(() => {
    return [...debtsData].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }, [debtsData]);

  useEffect(() => {
    if (!planDebt) return;
    const next = debts.find(debt => debt.id === planDebt.id);
    if (!next) {
      setPlanDebt(null);
    } else if (next !== planDebt) {
      setPlanDebt(next);
    }
  }, [debts, planDebt]);

  const filteredDebts = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return debts.filter(debt => {
      if (!showPaid && debt.isPaid) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = `${debt.name} ${debt.dueDate}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [debts, showPaid, searchTerm]);

  const unpaidDebts = useMemo(
    () => filteredDebts.filter(debt => !debt.isPaid),
    [filteredDebts],
  );
  const paidDebts = useMemo(
    () => filteredDebts.filter(debt => debt.isPaid),
    [filteredDebts],
  );

  const filteredTotal = useMemo(
    () => filteredDebts.reduce((total, debt) => total + debt.amount, 0),
    [filteredDebts],
  );

  const totalUnpaid = useMemo(
    () => debts.filter(debt => !debt.isPaid).reduce((sum, debt) => sum + debt.amount, 0),
    [debts],
  );

  const today = startOfDay(new Date());
  const upcomingThreshold = addDays(today, 7);

  const overdueDebts = useMemo(
    () =>
      debts.filter(debt => {
        const parsed = parseAppDate(debt.dueDate);
        return !debt.isPaid && parsed !== null && parsed < today;
      }),
    [debts, today],
  );

  const dueSoonDebts = useMemo(
    () =>
      debts.filter(debt => {
        const parsed = parseAppDate(debt.dueDate);
        if (!parsed || debt.isPaid) return false;
        return parsed >= today && parsed <= upcomingThreshold;
      }),
    [debts, today, upcomingThreshold],
  );

  const upcomingTimeline = useMemo(() => {
    return debts
      .filter(debt => !debt.isPaid)
      .map(debt => ({
        debt,
        parsed: parseAppDate(debt.dueDate),
      }))
      .filter(item => item.parsed)
      .sort((a, b) => (a.parsed!.getTime() ?? 0) - (b.parsed!.getTime() ?? 0))
      .slice(0, 6);
  }, [debts]);

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const saveDebtMutation = useMutation({
    mutationFn: storage.saveDebt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      resetFormState();
      setListError(null);
      if (isFormSheetOpen) {
        setIsFormSheetOpen(false);
      }
    },
  });

  const updateDebtMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Debt> }) =>
      storage.updateDebt(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      setListError(null);
    },
  });

  const updateDebtDetailsMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Debt> }) =>
      storage.updateDebt(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      setListError(null);
    },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: storage.deleteDebt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      setListError(null);
    },
  });

  const isDebtFormSubmitting = editingDebt
    ? updateDebtDetailsMutation.isPending
    : saveDebtMutation.isPending;

  const resetFormState = () => {
    setAmount('');
    setName('');
    setDueDate('');
    setInterestRate('');
    setFormError(null);
    setFormStep('amount');
    setEditingDebt(null);
  };

  const closeFormSheet = () => {
    setIsFormSheetOpen(false);
    resetFormState();
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditingDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setAmount(String(debt.amount));
    setName(debt.name);
    const parsedDue = parseAppDate(debt.dueDate);
    const normalizedDueDate = parsedDue ? format(parsedDue, 'yyyy-MM-dd') : debt.dueDate;
    setDueDate(normalizedDueDate);
    setInterestRate(
      debt.interestRate !== null && debt.interestRate !== undefined
        ? String(Number((debt.interestRate * 100).toFixed(2)))
        : '',
    );
    setFormError(null);
    setFormStep('amount');
    setIsFormSheetOpen(true);
  };

  const cancelEditing = () => {
    resetFormState();
    setIsFormSheetOpen(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const ensureAmountValid = () => {
    if (!amount || Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return false;
    }
    return true;
  };

  const ensureNameValid = () => {
    if (!name.trim()) {
      setFormError('Please enter a debt name.');
      return false;
    }
    return true;
  };

  const ensureDueDateValid = () => {
    if (!dueDate) {
      setFormError('Please enter a due date.');
      return false;
    }
    if (!parseAppDate(dueDate)) {
      setFormError('Please provide a valid due date.');
      return false;
    }
    return true;
  };

  const ensureInterestRateValid = () => {
    if (!interestRate.trim()) {
      return true;
    }
    const parsed = parseFloat(interestRate);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setFormError('Enter an interest rate between 0% and 100%.');
      return false;
    }
    return true;
  };

  const parseInterestRateInput = () => {
    if (!interestRate.trim()) return null;
    const parsed = parseFloat(interestRate);
    if (Number.isNaN(parsed)) return null;
    return parsed / 100;
  };

  const goToNextFormStep = () => {
    setFormError(null);
    if (formStep === 'amount' && !ensureAmountValid()) return;
    if (formStep === 'details' && !ensureNameValid()) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (
      !ensureAmountValid() ||
      !ensureNameValid() ||
      !ensureDueDateValid() ||
      !ensureInterestRateValid()
    ) {
      return;
    }

    const normalizedInterestRate = parseInterestRateInput();

    const parsedAmount = parseFloat(amount);

    if (editingDebt) {
      const existingDueDateParsed = parseAppDate(editingDebt.dueDate);
      const existingDueDateNormalized = existingDueDateParsed
        ? format(existingDueDateParsed, 'yyyy-MM-dd')
        : editingDebt.dueDate;
      const existingInterestRate = editingDebt.interestRate ?? null;
      const hasChanges =
        name.trim() !== editingDebt.name ||
        parsedAmount !== editingDebt.amount ||
        normalizedInterestRate !== existingInterestRate ||
        dueDate !== existingDueDateNormalized;

      if (!hasChanges) {
        setFormError('Make a change before saving.');
        return;
      }

      try {
        await updateDebtDetailsMutation.mutateAsync({
          id: editingDebt.id,
          updates: {
            name: name.trim(),
            amount: parsedAmount,
            dueDate,
            interestRate: normalizedInterestRate,
          },
        });
        resetFormState();
        setIsFormSheetOpen(false);
      } catch {
        setFormError('We could not update that debt. Please try again.');
      }
      return;
    }

    try {
      await saveDebtMutation.mutateAsync({
        name: name.trim(),
        amount: parsedAmount,
        dueDate,
        isPaid: false,
        interestRate: normalizedInterestRate,
      });
    } catch {
      setFormError('We could not save that debt. Please try again.');
    }
  };

  const handleSavePlanInterest = async (targetDebt: Debt, updatedRate: number | null) => {
    try {
      await updateDebtDetailsMutation.mutateAsync({
        id: targetDebt.id,
        updates: { interestRate: updatedRate },
      });
    } catch (error) {
      setListError('Failed to update interest rate. Please refresh.');
      throw error;
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    try {
      await updateDebtMutation.mutateAsync({ id, updates: { isPaid: !currentStatus } });
    } catch {
      setListError('Failed to update debt status. Please refresh.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this debt?')) return;
    try {
      await deleteDebtMutation.mutateAsync(id);
    } catch {
      setListError('Failed to delete debt. Please refresh.');
    }
  };

  const handleBatchMark = async (isPaid: boolean) => {
    if (!selectedIds.size) return;
    setIsBatchUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds, id =>
          updateDebtMutation.mutateAsync({ id, updates: { isPaid } }),
        ),
      );
      clearSelection();
    } catch {
      setListError('Failed to update selected debts. Please refresh.');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} selected debts?`)) return;
    setIsBatchUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds, id => deleteDebtMutation.mutateAsync(id)),
      );
      clearSelection();
    } catch {
      setListError('Failed to delete selected debts. Please refresh.');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const upcomingSummaryLabel = (() => {
    if (dueSoonDebts.length === 0) {
      return 'No bills due in the next 7 days';
    }
    return `${dueSoonDebts.length} due within 7 days`;
  })();

  const filterPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-200">
          <SlidersHorizontal size={16} />
          <span className="text-sm font-semibold uppercase tracking-wide">Filters</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setShowPaid(true);
          }}
          className="rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 transition hover:border-rose-500 hover:text-rose-100"
        >
          Reset
        </button>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 focus-within:border-rose-500">
        <Search size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search name or due date"
          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </label>

      <label className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-slate-200">
        <span>Show paid debts</span>
        <input
          type="checkbox"
          checked={showPaid}
          onChange={(event) => setShowPaid(event.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-rose-400 focus:ring-rose-500"
        />
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-slate-100 pb-14 sm:pb-18">
      <div className="bg-gradient-to-br from-slate-950 via-rose-950 to-red-950 text-white px-4 sm:px-6 lg:px-12 pt-8 pb-10 lg:pt-10 lg:pb-12 rounded-b-[3rem] shadow-2xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Debts & Bills</h1>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <p className="text-rose-200 text-sm">Total unpaid:</p>
            <p className="text-xl font-bold text-rose-100">{currencyFormatter.format(totalUnpaid)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 -mt-6 lg:-mt-10 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8 grid gap-4 lg:gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Outstanding total</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">
              {currencyFormatter.format(totalUnpaid)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Overdue items</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">{overdueDebts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 lg:p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Total records</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">{debts.length}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SyncStatus
            isLoading={isLoading}
            isFetching={isFetching}
            lastUpdated={dataUpdatedAt}
            className="justify-start"
          />
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 self-start rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-500/20 sm:self-auto"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing' : 'Refresh data'}
          </button>
        </div>

        {(isError || listError) && (
          <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {listError || 'Unable to refresh debts. Showing any cached items.'}
            {isError && error instanceof Error ? ` (${error.message})` : null}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Filtered total</p>
              <p className="text-xl font-semibold text-rose-200">
                {currencyFormatter.format(filteredTotal)}
              </p>
              <p className="text-xs text-slate-400">
                {filteredDebts.length === debts.length
                  ? 'Showing every debt'
                  : `Showing ${filteredDebts.length} of ${debts.length}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                type="button"
                onClick={() => openFormSheet()}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-400/30 lg:hidden"
              >
                <PlusCircle size={16} />
                Add debt
              </button> */}
              
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-rose-400 hover:text-rose-100 lg:hidden"
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
                      ? 'border border-rose-500/40 bg-rose-500/20 text-rose-100 shadow-inner'
                      : 'text-slate-300 hover:text-rose-100'
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
                      ? 'border border-rose-500/40 bg-rose-500/20 text-rose-100 shadow-inner'
                      : 'text-slate-300 hover:text-rose-100'
                  }`}
                  aria-pressed={viewMode === 'compact'}
                >
                  <List size={16} />
                  Compact
                </button>
              </div>
            </div>
          </div>

          {hasSelection && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              <span>{selectedCount} selected</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchMark(true)}
                  disabled={isBatchUpdating}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300 hover:text-emerald-50 disabled:opacity-60"
                >
                  <CheckCircle size={14} />
                  Mark paid
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMark(false)}
                  disabled={isBatchUpdating}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-3 py-1 font-semibold uppercase tracking-wide text-slate-200 transition hover:border-rose-400 hover:text-rose-100 disabled:opacity-60"
                >
                  <Circle size={14} />
                  Mark unpaid
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={isBatchUpdating}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-500/60 px-3 py-1 font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400 hover:text-rose-100 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-3 py-1 font-semibold uppercase tracking-wide text-slate-300 transition hover:border-rose-400 hover:text-rose-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-rose-400 hover:text-rose-100"
            >
              <Printer size={16} />
              Print view
            </button>
          </div>
        </div>

        <div className="mb-8">
          <DebtStrategyComparison debts={debts} currencyFormatter={currencyFormatter} />
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Upcoming obligations</h3>
                <p className="text-sm text-slate-400">{upcomingSummaryLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Overdue</p>
                <p className="text-sm font-semibold text-rose-200">{overdueDebts.length}</p>
                <p className="text-xs text-slate-400">
                  {dueSoonDebts.length} due this week
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingTimeline.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Log your upcoming bills to see them plotted here.
                </p>
              ) : (
                upcomingTimeline.map(({ debt, parsed }) => {
                  const daysRemaining =
                    parsed !== null ? differenceInCalendarDays(parsed, today) : null;
                  return (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard size={16} className="text-rose-200" />
                        <div>
                          <p className="font-semibold text-slate-200">{debt.name}</p>
                          <p className="text-xs text-slate-500">
                            Due {parsed ? format(parsed, 'MMM d') : 'Unknown'} ·{' '}
                            {currencyFormatter.format(debt.amount)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          daysRemaining !== null && daysRemaining < 0
                            ? 'text-rose-200'
                            : 'text-emerald-200'
                        }`}
                      >
                        {daysRemaining === null
                          ? 'No date'
                          : daysRemaining < 0
                          ? `${Math.abs(daysRemaining)}d overdue`
                          : daysRemaining === 0
                          ? 'Due today'
                          : `Due in ${daysRemaining}d`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Quick add
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Use presets to add recurring bills faster.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickAmounts.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setAmount(String(value));
                    setFormStep('details');
                    setIsFormSheetOpen(true);
                  }}
                  className="rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-400/30"
                >
                  +{currencyFormatter.format(value)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                resetFormState();
                setIsFormSheetOpen(true);
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-400/30"
            >
              <PlusCircle size={16} />
              New debt
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 sm:p-7 shadow-xl lg:block"
        >
          <h2 className="mb-5 flex items-center gap-3 text-lg font-bold text-slate-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/30 text-rose-200 shadow-md">
              {editingDebt ? <Pencil size={18} className="text-rose-100" /> : <PlusCircle size={18} className="text-rose-100" />}
            </span>
            <span>{editingDebt ? 'Edit Debt' : 'Add New Debt'}</span>
          </h2>
          {editingDebt && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <span>Editing {editingDebt.name}</span>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-full border border-amber-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-300 hover:text-amber-50"
              >
                Cancel edit
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Debt name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Credit card, utilities, etc."
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-rose-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Amount (¥)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-rose-500 transition-all shadow-sm"
                inputMode="numeric"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {quickAmounts.map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-rose-500/60 hover:text-rose-100"
                  >
                    +{currencyFormatter.format(value)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 font-medium text-slate-100 focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Interest rate (APR %)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="18"
                className="w-full rounded-xl border-2 border-slate-800 bg-slate-950/60 px-4 py-3 font-medium text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-rose-500 transition-all shadow-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                Annual interest rate, enter 18 for 18%.
              </p>
            </div>

            <button
              type="submit"
              disabled={isDebtFormSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 py-4 font-bold text-slate-950 shadow-lg transition-all hover:from-rose-400 hover:to-amber-400 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingDebt ? <Pencil size={20} className="text-slate-950" /> : <PlusCircle size={20} className="text-slate-950" />}
              {isDebtFormSubmitting
                ? 'Saving...'
                : editingDebt
                ? 'Update Debt'
                : 'Add Debt'}
            </button>
            {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}
          </div>
        </form>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
              <AlertCircle size={20} className="text-rose-200" />
              Unpaid ({unpaidDebts.length})
            </h2>

            {isLoading ? (
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-12 text-center text-slate-300">
                Loading your debts...
              </div>
            ) : unpaidDebts.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-10 text-center shadow-md">
                <div className="mb-4 text-6xl">🎉</div>
                <p className="font-medium text-slate-300">No unpaid debts!</p>
                <p className="mt-2 text-sm text-slate-500">Add upcoming bills to stay ahead.</p>
              </div>
            ) : (
              unpaidDebts.map(debt => {
                const parsedDue = parseAppDate(debt.dueDate);
                const daysRemaining =
                  parsedDue !== null ? differenceInCalendarDays(parsedDue, today) : null;
                const isOverdue = daysRemaining !== null && daysRemaining < 0;
                const isDueSoon =
                  daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
                const dueLabel = parsedDue ? format(parsedDue, 'MMM d, yyyy') : 'No due date';

                if (viewMode === 'compact') {
                  return (
                    <div
                      key={debt.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                        isOverdue
                          ? 'border-rose-500/50 bg-rose-500/10 text-rose-100'
                          : 'border-slate-800/80 bg-slate-950/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelected(debt.id)}
                          className="text-rose-200"
                          aria-label={selectedIds.has(debt.id) ? 'Deselect debt' : 'Select debt'}
                        >
                          {selectedIds.has(debt.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100">{debt.name}</span>
                          <span className="text-xs text-slate-400">{dueLabel}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatInterestLabel(debt.interestRate) ?? 'No rate set'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-rose-200">
                          {currencyFormatter.format(debt.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPlanDebt(debt)}
                          className="rounded-lg p-1 text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100"
                          aria-label="View payoff plan"
                        >
                          <LineChart size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingDebt(debt)}
                          className="rounded-lg p-1 text-slate-200 transition hover:bg-slate-500/10 hover:text-slate-50"
                          aria-label="Edit debt"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                          className="rounded-lg p-1 text-emerald-200 transition hover:bg-emerald-500/10 hover:text-emerald-100"
                          aria-label="Mark as paid"
                        >
                          <CheckCircle size={18} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={debt.id}
                    className={`rounded-2xl border p-5 shadow-md transition-all hover:shadow-lg sm:p-6 ${
                      isOverdue
                        ? 'border-rose-500/50 bg-rose-500/10 text-rose-100'
                        : 'border-slate-800/80 bg-slate-900/70 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelected(debt.id)}
                          className="mt-1 text-rose-200 transition hover:text-rose-100"
                          aria-label={selectedIds.has(debt.id) ? 'Deselect debt' : 'Select debt'}
                        >
                          {selectedIds.has(debt.id) ? (
                            <CheckSquare size={20} />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                              {debt.name}
                            </span>
                            {isOverdue && (
                              <span className="rounded-full border border-rose-400/80 bg-rose-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-100">
                                Overdue
                              </span>
                            )}
                            {isDueSoon && !isOverdue && (
                              <span className="rounded-full border border-amber-400/80 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                                Due soon
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            Due {dueLabel} ·{' '}
                            {daysRemaining === null
                              ? 'Unknown timeline'
                              : daysRemaining < 0
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : daysRemaining === 0
                              ? 'Due today'
                              : `Due in ${daysRemaining} days`}
                          </p>
                          <p className="mt-3 text-2xl font-bold text-rose-200">
                            {currencyFormatter.format(debt.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatInterestLabel(debt.interestRate)
                              ? `Interest: ${formatInterestLabel(debt.interestRate)}`
                              : 'Interest rate not set yet'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(debt.id)}
                        className="rounded-lg p-2 text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-60"
                        disabled={deleteDebtMutation.isPending}
                        aria-label="Delete debt"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-400/30 disabled:opacity-60"
                        disabled={updateDebtMutation.isPending}
                      >
                        <CheckCircle size={18} />
                        {updateDebtMutation.isPending ? 'Updating...' : 'Mark as paid'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditingDebt(debt)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-rose-400 hover:text-rose-100"
                      >
                        <Pencil size={18} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanDebt(debt)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-500/25"
                      >
                        <LineChart size={18} />
                        View payoff plan
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {showPaid && paidDebts.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
                <CheckCircle size={20} className="text-emerald-200" />
                Paid ({paidDebts.length})
              </h2>
              <div className="space-y-3">
                {paidDebts.map(debt => (
                  <div
                    key={debt.id}
                    className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-slate-200 shadow-md transition hover:shadow-lg sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelected(debt.id)}
                          className="mt-1 text-emerald-200 transition hover:text-emerald-100"
                          aria-label={selectedIds.has(debt.id) ? 'Deselect debt' : 'Select debt'}
                        >
                          {selectedIds.has(debt.id) ? (
                            <CheckSquare size={20} />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold uppercase tracking-wide text-slate-200 line-through">
                              {debt.name}
                            </span>
                            <span className="rounded-full border border-emerald-400/80 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                              Paid
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            Cleared on {formatDateForDisplay(debt.dueDate, 'MMM d, yyyy')}
                          </p>
                          <p className="mt-3 text-xl font-bold text-slate-200 line-through">
                            {currencyFormatter.format(debt.amount)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(debt.id)}
                        className="rounded-lg p-2 text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-60"
                        disabled={deleteDebtMutation.isPending}
                        aria-label="Delete debt"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-rose-400 hover:text-rose-100 disabled:opacity-60"
                        disabled={updateDebtMutation.isPending}
                      >
                        <Circle size={18} />
                        {updateDebtMutation.isPending ? 'Updating...' : 'Mark as unpaid'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                className="rounded-full border border-slate-800/80 p-2 text-slate-300 transition hover:border-rose-500 hover:text-rose-100"
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
            aria-label="Close debt form"
            onClick={closeFormSheet}
          />
          <div className="relative w-full max-h-[82vh] overflow-y-auto rounded-t-3xl border border-rose-500/20 bg-slate-950 p-5 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-rose-200">
                    Step {currentFormStepIndex + 1} of {formSteps.length}
                  </p>
                  <h2 className="text-lg font-semibold text-slate-100">
                    {editingDebt ? 'Edit debt' : 'New debt'} · {formStepLabels[formStep]}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeFormSheet}
                  className="rounded-full border border-rose-500/30 p-2 text-rose-100 transition hover:bg-rose-500/20"
                  aria-label="Close debt form"
                >
                  <X size={16} />
                </button>
              </div>
              {editingDebt && (
                <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100">
                  <span>Editing {editingDebt.name}</span>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="rounded-full border border-amber-400/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-300 hover:text-amber-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {formSteps.map((step, index) => (
                  <span
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      index <= currentFormStepIndex ? 'bg-rose-400' : 'bg-slate-800/80'
                    }`}
                  />
                ))}
              </div>

              <div className="rounded-2xl border border-rose-500/30 bg-slate-950/60 p-4 space-y-4">
                {formStep === 'amount' && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-rose-100">
                        Amount (¥)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="50000"
                        className="w-full rounded-xl border-2 border-rose-500/40 bg-slate-950/80 px-4 py-3 text-lg font-semibold text-slate-100 placeholder:text-rose-200/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400 transition-all shadow-sm"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAmount(String(value))}
                          className="rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-400/25"
                        >
                          +{currencyFormatter.format(value)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formStep === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-rose-100">
                        Debt name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Credit card, utilities, etc."
                        className="w-full rounded-xl border-2 border-rose-500/40 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-rose-200/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400 transition-all shadow-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Rent', 'Utilities', 'Loan', 'Credit Card'].map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setName(option)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-400 hover:bg-rose-400/25"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formStep === 'schedule' && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-rose-100">
                        Due date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-xl	border-2 border-rose-500/40 bg-slate-950/80 px-4 py-3 font-medium text-slate-100 focus:border-rose-400 focus:ring-2 focus:ring-rose-400 transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-rose-100">
                        Interest rate (APR %)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="18"
                        className="w-full rounded-xl border-2 border-rose-500/40 bg-slate-950/80 px-4 py-3 font-medium text-slate-100 placeholder:text-rose-200/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400 transition-all shadow-sm"
                      />
                      <p className="mt-2 text-xs text-rose-200/70">
                        Leave blank for 0% or enter 18 for 18% APR.
                      </p>
                    </div>
                    <p className="text-xs text-rose-200/80">
                      We’ll highlight this payment in your upcoming timeline and alert you when it’s close.
                    </p>
                  </div>
                )}
              </div>

              {formError && <p className="text-sm font-medium text-rose-300">{formError}</p>}

              <div className="flex items-center justify-between gap-3">
                {!isFirstFormStep ? (
                  <button
                    type="button"
                    onClick={goToPreviousFormStep}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:text-rose-50"
                  >
                    Back
                  </button>
                ) : (
                  <span className="text-xs uppercase tracking-wide text-rose-200/70">
                    Step {currentFormStepIndex + 1} of {formSteps.length}
                  </span>
                )}
                {isLastFormStep ? (
                  <button
                    type="submit"
                    disabled={isDebtFormSubmitting}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-md transition hover:from-rose-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editingDebt ? <Pencil size={16} /> : <PlusCircle size={16} />}
                    {isDebtFormSubmitting
                      ? 'Saving...'
                      : editingDebt
                      ? 'Update debt'
                      : 'Save debt'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToNextFormStep}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:text-rose-50"
                  >
                    Next
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {planDebt && (
        <DebtPlanModal
          debt={planDebt}
          onClose={() => setPlanDebt(null)}
          onSaveInterest={(rate) => handleSavePlanInterest(planDebt, rate)}
          isSavingInterest={updateDebtDetailsMutation.isPending}
          currencyFormatter={currencyFormatter}
        />
      )}
    </div>
  );
}
