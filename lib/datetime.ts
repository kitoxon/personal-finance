import { format, parseISO } from 'date-fns';

export const DATE_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";
export const DISPLAY_DATETIME_FORMAT = 'MMM d, yyyy · h:mm a';
export const DAY_KEY_FORMAT = 'yyyy-MM-dd';

export const formatDateForInput = (date: Date): string => format(date, DATE_INPUT_FORMAT);

export const parseAppDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

export const normalizeToIsoString = (value: string | null | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const trimmed = value.trim();
  const candidate = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`;
  const date = new Date(candidate);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

export const formatDateForDisplay = (
  value: string | Date | null | undefined,
  pattern = DISPLAY_DATETIME_FORMAT,
): string => {
  const date =
    typeof value === 'string'
      ? parseAppDate(value)
      : value instanceof Date
      ? value
      : null;

  if (!date) {
    return 'Unknown date';
  }

  return format(date, pattern);
};
