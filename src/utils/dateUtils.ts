import { format, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, eachDayOfInterval, getYear, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  return isWithinInterval(date, { start: startDate, end: endDate });
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
  // Add 1 to include both start and end dates in count
  return differenceInDays(endDate, startDate) + 1;
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