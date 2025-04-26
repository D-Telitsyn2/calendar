import Holidays from 'date-holidays';
import { format } from 'date-fns';

type DayType = 0 | 1 | 2;

const holidayCache: Record<string, boolean> = {};
const shortDayCache: Record<string, boolean> = {};

export const isRussianHoliday = async (date: Date): Promise<boolean> => {
  const dateKey = date.toISOString().split('T')[0];

  if (holidayCache[dateKey] !== undefined) {
    return holidayCache[dateKey];
  }

  try {
    const formattedDate = format(date, 'yyyyMMdd');
    const response = await fetch(`https://isdayoff.ru/${formattedDate}?cc=ru`);

    if (response.ok) {
      const result = await response.text();
      const dayType = parseInt(result.trim()) as DayType;

      const isHoliday = dayType === 1;

      const isShortDay = dayType === 2;

      holidayCache[dateKey] = isHoliday;
      shortDayCache[dateKey] = isShortDay;

      return isHoliday;
    }
  } catch (error) {
    console.error('Ошибка при запросе к API isdayoff.ru:', error);
  }

  const holidays = new Holidays('RU');
  const holiday = holidays.isHoliday(date);

  const isHoliday = !!holiday;

  holidayCache[dateKey] = isHoliday;

  return isHoliday;
};

export const isShortWorkDay = async (date: Date): Promise<boolean> => {
  const dateKey = date.toISOString().split('T')[0];

  if (shortDayCache[dateKey] !== undefined) {
    return shortDayCache[dateKey];
  }

  try {
    const formattedDate = format(date, 'yyyyMMdd');
    const response = await fetch(`https://isdayoff.ru/${formattedDate}?cc=ru`);

    if (response.ok) {
      const result = await response.text();
      const dayType = parseInt(result.trim()) as DayType;

      const isShortDay = dayType === 2;
      shortDayCache[dateKey] = isShortDay;

      return isShortDay;
    }
  } catch (error) {
    console.error('Ошибка при запросе к API isdayoff.ru:', error);
  }

  shortDayCache[dateKey] = false;
  return false;
};

export const preloadHolidaysForYear = async (year: number): Promise<void> => {
  try {
    const response = await fetch(`https://isdayoff.ru/api/getdata?year=${year}&cc=ru`);

    if (response.ok) {
      const result = await response.text();

      for (let day = 0; day < result.length; day++) {
        const dayType = parseInt(result[day]) as DayType;

        const date = new Date(year, 0, day + 1);
        const dateKey = date.toISOString().split('T')[0];

        holidayCache[dateKey] = dayType === 1;
        shortDayCache[dateKey] = dayType === 2;
      }

      return;
    }
  } catch (error) {
    console.error('Ошибка при загрузке праздников за год:', error);
  }

  const holidays = new Holidays('RU');

  const yearHolidays = holidays.getHolidays().filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.getFullYear() === year;
  });

  for (const holiday of yearHolidays) {
    const date = new Date(holiday.date);
    const dateKey = date.toISOString().split('T')[0];
    holidayCache[dateKey] = true;
  }
};

export const isRussianHolidaySync = (date: Date): boolean => {
  const dateKey = date.toISOString().split('T')[0];

  if (holidayCache[dateKey] !== undefined) {
    return holidayCache[dateKey];
  }

  return false;
};

export const isShortWorkDaySync = (date: Date): boolean => {
  const dateKey = date.toISOString().split('T')[0];

  if (shortDayCache[dateKey] !== undefined) {
    return shortDayCache[dateKey];
  }

  return false;
};