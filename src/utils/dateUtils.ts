import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, eachDayOfInterval, getYear, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

/** Календарный день без времени: полночь в поясе пользователя. */
export const toCalendarDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Timestamp для Firestore: полдень UTC выбранного календарного дня.
 * Так день не съезжает у людей в другом поясе (полночь в Москве — ещё предыдущий день в UTC,
 * а в Грузии та же полночь на час раньше и не попадает в интервал).
 */
export const toStoredTimestamp = (date: Date): Date => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
};

/** Timestamp из Firestore → календарный день в поясе зрителя. */
export const fromStoredTimestamp = (date: Date): Date => {
  // Полдень UTC — день, который записали; иначе старые полночи в локальном поясе.
  if (date.getUTCHours() === 12) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  return toCalendarDate(date);
};

/** Начало отпуска в ближайшие `withinDays` дней, но ещё не сегодня. */
export const isUpcomingVacationStart = (today: Date, startDate: Date, withinDays = 14): boolean => {
  const day = toCalendarDate(today);
  const start = toCalendarDate(startDate);
  if (start.getTime() <= day.getTime()) {
    return false;
  }
  const until = new Date(day.getFullYear(), day.getMonth(), day.getDate() + withinDays);
  return start.getTime() <= until.getTime();
};

export const formatDate = (date: Date): string => {
  return format(date, 'dd.MM.yyyy', { locale: ru });
};

export const getMonthName = (date: Date): string => {
  return format(date, 'LLLL', { locale: ru });
};

export const getDaysInMonth = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
};

export const getMonthsInYear = (year: number): Date[] => {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  return eachMonthOfInterval({ start, end });
};

export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  const day = toCalendarDate(date).getTime();
  return day >= toCalendarDate(startDate).getTime() && day <= toCalendarDate(endDate).getTime();
};

export const generateCalendarForYear = (year: number): Date[][] => {
  const months = getMonthsInYear(year);
  return months.map(month => getDaysInMonth(month));
};

export const getCurrentYear = (): number => {
  return getYear(new Date());
};

// Calculate number of days between two dates (inclusive)
export const getDaysCount = (startDate: Date, endDate: Date): number => {
  return differenceInDays(toCalendarDate(endDate), toCalendarDate(startDate)) + 1;
};

// Check if a vacation period is in a specific year
export const isVacationInYear = (startDate: Date, endDate: Date, year: number): boolean => {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  return startYear === year || endYear === year;
};

export const generateUniqueColor = (existingColors: string[]): string => {
  const predefinedColors = [
    '#aed6f1',
    '#fadbd8',
    '#d5f5e3',
    '#fdebd0',
    '#ebdef0',
    '#d0ece7',
    '#f9e79f',
    '#f5cba7',
    '#d6eaf8',
    '#d2b4de',
    '#fcf3cf',
    '#fadbd8',
    '#e8daef',
    '#a9dfbf',
    '#a3e4d7',
    '#f7dc6f',
    '#f5b7b1',
    '#d7bde2',
    '#a9cce3',
    '#fad7a0',
  ];

  for (const color of predefinedColors) {
    if (!existingColors.includes(color)) {
      return color;
    }
  }

  let newColor;
  let attempts = 0;

  do {
    const r = Math.floor(Math.random() * 55 + 200).toString(16).padStart(2, '0');
    const g = Math.floor(Math.random() * 55 + 200).toString(16).padStart(2, '0');
    const b = Math.floor(Math.random() * 55 + 200).toString(16).padStart(2, '0');
    newColor = `#${r}${g}${b}`;
    attempts++;
  } while (existingColors.includes(newColor) && attempts < 50);

  return newColor;
};