import { format, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, eachDayOfInterval, getYear } from 'date-fns';
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