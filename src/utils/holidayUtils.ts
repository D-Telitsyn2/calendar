// src/utils/holidayUtils.ts
import Holidays from 'date-holidays';

// Кэш для хранения результатов проверки праздничных дней для улучшения производительности
const holidayCache: Record<string, boolean> = {};

/**
 * Проверяет, является ли дата праздничным или выходным днем в России
 * @param date Дата для проверки
 * @returns boolean - true, если дата является праздником или выходным днем
 */
export const isRussianHoliday = (date: Date): boolean => {
  // Форматируем дату в строку для использования в качестве ключа кэша
  const dateKey = date.toISOString().split('T')[0];

  // Если результат уже есть в кэше, возвращаем его
  if (holidayCache[dateKey] !== undefined) {
    return holidayCache[dateKey];
  }

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
 * Предварительно загружает информацию о праздниках для указанного года
 * @param year Год, для которого загружается информация о праздниках
 */
export const preloadHolidaysForYear = (year: number): void => {
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