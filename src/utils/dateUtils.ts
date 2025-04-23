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

// Функция для генерации уникального цвета, который будет отличаться от существующих
export const generateUniqueColor = (existingColors: string[]): string => {
  // Используем более светлые цвета с хорошим контрастом для черного текста
  const predefinedColors = [
    '#aed6f1', // светло-голубой
    '#fadbd8', // светло-розовый
    '#d5f5e3', // светло-зеленый
    '#fdebd0', // светло-оранжевый
    '#ebdef0', // светло-фиолетовый
    '#d0ece7', // светло-бирюзовый
    '#f9e79f', // светло-желтый
    '#f5cba7', // светло-коричневый
    '#d6eaf8', // светло-синий
    '#d2b4de', // лавандовый
    '#fcf3cf', // светло-желтый
    '#fadbd8', // светло-красный
    '#e8daef', // светло-пурпурный
    '#a9dfbf', // светло-зеленый
    '#a3e4d7', // мятный
    '#f7dc6f', // горчичный
    '#f5b7b1', // персиковый
    '#d7bde2', // светло-сиреневый
    '#a9cce3', // нежно-голубой
    '#fad7a0', // светло-оранжевый
  ];

  // Сначала пробуем использовать цвета из предопределенного набора
  for (const color of predefinedColors) {
    if (!existingColors.includes(color)) {
      return color;
    }
  }

  // Если все предопределенные цвета уже используются, генерируем случайный светлый цвет
  let newColor;
  let attempts = 0;

  do {
    // Создаем случайный светлый цвет (высокие значения RGB для светлых тонов)
    const r = Math.floor(Math.random() * 55 + 200).toString(16).padStart(2, '0'); // 200-255
    const g = Math.floor(Math.random() * 55 + 200).toString(16).padStart(2, '0'); // 200-255
    const b = Math.floor(Math.random() * 55 + 200).toString(16).padStart(2, '0'); // 200-255
    newColor = `#${r}${g}${b}`;
    attempts++;
  } while (existingColors.includes(newColor) && attempts < 50);

  return newColor;
};