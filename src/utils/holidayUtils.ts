// src/utils/holidayUtils.ts
import Holidays from 'date-holidays';
import { format } from 'date-fns';

// Типы для результатов API
type DayType = 0 | 1 | 2; // 0 - рабочий день, 1 - выходной, 2 - сокращенный день

// Кэш для хранения результатов проверки праздничных дней для улучшения производительности
const holidayCache: Record<string, boolean> = {};
const shortDayCache: Record<string, boolean> = {};

/**
 * Проверяет, является ли дата праздничным или выходным днем в России
 * Использует сначала кэш, затем API isdayoff.ru, а если API недоступен - fallback на date-holidays
 * @param date Дата для проверки
 * @returns boolean - true, если дата является праздником или выходным днем
 */
export const isRussianHoliday = async (date: Date): Promise<boolean> => {
  // Форматируем дату в строку для использования в качестве ключа кэша
  const dateKey = date.toISOString().split('T')[0];

  // Если результат уже есть в кэше, возвращаем его
  if (holidayCache[dateKey] !== undefined) {
    return holidayCache[dateKey];
  }

  try {
    // Формируем запрос к API в формате YYYYMMDD
    const formattedDate = format(date, 'yyyyMMdd');
    const response = await fetch(`https://isdayoff.ru/${formattedDate}?cc=ru`);

    if (response.ok) {
      const result = await response.text();
      const dayType = parseInt(result.trim()) as DayType;

      // 1 - выходной день
      const isHoliday = dayType === 1;

      // 2 - сокращенный рабочий день
      const isShortDay = dayType === 2;

      // Сохраняем результаты в кэш
      holidayCache[dateKey] = isHoliday;
      shortDayCache[dateKey] = isShortDay;

      return isHoliday;
    }
  } catch (error) {
    console.error('Ошибка при запросе к API isdayoff.ru:', error);
  }

  // Fallback: если API недоступен, используем библиотеку date-holidays
  // Проверяем выходные дни (суббота и воскресенье)
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Проверяем, является ли день праздником по данным библиотеки date-holidays
  // Инициализируем для каждого года отдельно
  const holidays = new Holidays('RU');
  const holiday = holidays.isHoliday(date);

  // Праздничный день, если это выходной или официальный праздник
  const isHoliday = isWeekend || !!holiday;

  // Сохраняем результат в кэш
  holidayCache[dateKey] = isHoliday;

  return isHoliday;
};

/**
 * Проверяет, является ли дата сокращенным рабочим днем в России
 * @param date Дата для проверки
 * @returns boolean - true, если дата является сокращенным рабочим днем
 */
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

  // Fallback: в случае ошибки считаем, что день не является сокращенным
  shortDayCache[dateKey] = false;
  return false;
};

/**
 * Предварительно загружает информацию о праздниках для указанного года
 * @param year Год, для которого загружается информация о праздниках
 */
export const preloadHolidaysForYear = async (year: number): Promise<void> => {
  try {
    // Запрашиваем данные за весь год у API isdayoff.ru
    const response = await fetch(`https://isdayoff.ru/api/getdata?year=${year}&cc=ru`);

    if (response.ok) {
      const result = await response.text();

      // Обрабатываем результат - строка со статусом для каждого дня года
      // 0 - рабочий день, 1 - выходной, 2 - сокращенный день
      for (let day = 0; day < result.length; day++) {
        const dayType = parseInt(result[day]) as DayType;

        // Создаем дату для текущего дня года
        const date = new Date(year, 0, day + 1);
        const dateKey = date.toISOString().split('T')[0];

        // Сохраняем информацию в кэш
        holidayCache[dateKey] = dayType === 1;
        shortDayCache[dateKey] = dayType === 2;
      }

      return;
    }
  } catch (error) {
    console.error('Ошибка при загрузке праздников за год:', error);
  }

  // Fallback: если API недоступен, используем библиотеку date-holidays и выходные дни
  // Инициализируем библиотеку с указанным годом
  const holidays = new Holidays('RU');

  // Получаем все праздники для указанного года
  const yearHolidays = holidays.getHolidays().filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.getFullYear() === year;
  });

  // Обходим все праздники и кэшируем их
  for (const holiday of yearHolidays) {
    const date = new Date(holiday.date);
    const dateKey = date.toISOString().split('T')[0];
    holidayCache[dateKey] = true;
  }

  // Кэшируем все выходные дни (суббота и воскресенье) для указанного года
  const startDate = new Date(year, 0, 1); // 1 января указанного года
  const endDate = new Date(year, 11, 31); // 31 декабря указанного года

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Воскресенье или суббота
      const dateKey = new Date(d).toISOString().split('T')[0];
      holidayCache[dateKey] = true;
    }
  }
};

/**
 * Синхронная версия проверки праздничного дня - используется только если данные уже в кэше
 * @param date Дата для проверки
 * @returns boolean - true, если дата является праздником или выходным днем
 */
export const isRussianHolidaySync = (date: Date): boolean => {
  const dateKey = date.toISOString().split('T')[0];

  // Если результат уже есть в кэше, возвращаем его
  if (holidayCache[dateKey] !== undefined) {
    return holidayCache[dateKey];
  }

  // Если данных в кэше нет, используем простую проверку на выходные дни
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Воскресенье или суббота
};

/**
 * Синхронная версия проверки сокращенного рабочего дня - используется только если данные уже в кэше
 * @param date Дата для проверки
 * @returns boolean - true, если дата является сокращенным рабочим днем
 */
export const isShortWorkDaySync = (date: Date): boolean => {
  const dateKey = date.toISOString().split('T')[0];

  // Если результат уже есть в кэше, возвращаем его
  if (shortDayCache[dateKey] !== undefined) {
    return shortDayCache[dateKey];
  }

  return false; // Если нет в кэше, предполагаем что это не сокращенный день
};