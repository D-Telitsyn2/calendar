import React, { useState, useEffect } from 'react';
import { getDate } from 'date-fns';
import { User, VacationPeriod } from '../types';
import { generateCalendarForYear, getMonthName, isDateInRange } from '../utils/dateUtils';
import { isRussianHolidaySync, isShortWorkDaySync } from '../utils/holidayUtils';

interface CalendarProps {
  year: number;
  users: User[];
  vacations: VacationPeriod[];
  selectedUserId: string | null;
  onDaySelect: (date: Date) => void;
  externalSelectionStart: Date | null; // Новое свойство для синхронизации с родительским компонентом
  onVacationSelect?: (vacation: VacationPeriod, user: User) => void; // Добавляем новый callback
  selectedVacationForDelete: { vacation: VacationPeriod; user: User } | null; // Добавляем новый проп
}

const Calendar: React.FC<CalendarProps> = ({
  year,
  users,
  vacations,
  selectedUserId,
  onDaySelect,
  externalSelectionStart, // Добавляем новый проп
  onVacationSelect,
  selectedVacationForDelete // Добавляем новый проп
}) => {
  const calendar = generateCalendarForYear(year);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  // Добавляем новое состояние для хранения выбранного отпуска
  const [selectedVacation, setSelectedVacation] = useState<VacationPeriod | null>(null);

  // Находим выбранного пользователя, чтобы использовать его цвет
  const selectedUser = selectedUserId ? users.find(user => user.id === selectedUserId) : null;

  // Синхронизируем внутреннее состояние с внешним
  useEffect(() => {
    setSelectionStart(externalSelectionStart);
  }, [externalSelectionStart]);

  // Синхронизируем состояние выбранного отпуска с родительским компонентом
  useEffect(() => {
    // Если в родительском компоненте есть выбранный отпуск, используем его
    if (selectedVacationForDelete) {
      setSelectedVacation(selectedVacationForDelete.vacation);
    } else {
      // Если в родительском компоненте нет выбранного отпуска, очищаем и наше состояние
      setSelectedVacation(null);
    }
  }, [selectedVacationForDelete]);

  // Очищаем hoverDate когда selectionStart === null
  useEffect(() => {
    if (!selectionStart) {
      setHoverDate(null);
    }
  }, [selectionStart]);

  // Сбрасываем выбранный отпуск при выборе пользователя (переключение в режим добавления)
  useEffect(() => {
    if (selectedUserId) {
      setSelectedVacation(null);
    }
  }, [selectedUserId]);

  const handleDayClick = (date: Date) => {
    // Если выбран пользователь, значит мы в режиме добавления отпуска
    if (selectedUserId) {
      // Всегда разрешаем выбор даты для отпуска, даже если дата занята другим пользователем
      if (!selectionStart) {
        setSelectionStart(date);
      } else {
        setSelectionStart(null);
      }
      onDaySelect(date);
      return;
    }

    // Если мы здесь, значит не выбран активный пользователь (режим просмотра/удаления)
    // Проверяем, была ли нажата ячейка с отпуском
    const vacationsForDate = getVacationsForDate(date);
    if (vacationsForDate.length === 0 && selectedVacation) {
      // Клик по пустой ячейке - сбрасываем выделение
      setSelectedVacation(null);
      // Сообщаем родительскому компоненту о сбросе выбора
      if (onVacationSelect) {
        onVacationSelect(null as unknown as VacationPeriod, null as unknown as User);
      }
    }
  };

  const handleVacationSegmentClick = (vacation: VacationPeriod, user: User) => {
    // Если выбран пользователь, мы в режиме добавления отпуска
    if (selectedUserId) {
      // В режиме добавления отпуска клик по сегменту должен работать как клик по ячейке
      if (!selectionStart) {
        setSelectionStart(vacation.startDate); // Используем начальную дату сегмента
      } else {
        setSelectionStart(null);
      }
      onDaySelect(vacation.startDate);
      return;
    }

    // Выделяем отпуск и передаем его наверх для возможного удаления
    setSelectedVacation(vacation);
    if (onVacationSelect) {
      onVacationSelect(vacation, user);
    }
  };

  const handleMouseEnter = (date: Date) => {
    // Активируем hover только если есть начало выбора
    if (selectionStart) {
      setHoverDate(date);
    }
  };

  const handleMouseLeave = () => {
    setHoverDate(null);
  };

  // Получаем все отпуска для конкретной даты
  const getVacationsForDate = (date: Date): { vacation: VacationPeriod; user: User | undefined }[] => {
    const result = [];

    for (const vacation of vacations) {
      if (isDateInRange(date, vacation.startDate, vacation.endDate)) {
        const user = users.find(u => u.id === vacation.userId);
        result.push({ vacation, user });
      }
    }

    return result;
  };

  // Check if the date is in the preview range (between start date and hover date)
  const isInPreviewRange = (date: Date): boolean => {
    if (!selectedUserId || !selectionStart || !hoverDate) return false;

    // Устанавливаем время на начало дня, чтобы корректно сравнивать даты
    const startTimestamp = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate()).getTime();
    const hoverTimestamp = new Date(hoverDate.getFullYear(), hoverDate.getMonth(), hoverDate.getDate()).getTime();
    const currentTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    // Включаем текущий день в диапазон (inclusive range)
    return (currentTimestamp >= Math.min(startTimestamp, hoverTimestamp) &&
            currentTimestamp <= Math.max(startTimestamp, hoverTimestamp));
  };

  // Check if the date is the selection start date
  const isStartDate = (date: Date): boolean => {
    if (!selectionStart) return false;

    // Устанавливаем время на начало дня, чтобы корректно сравнивать даты
    const startTimestamp = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate()).getTime();
    const dateTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    return startTimestamp === dateTimestamp;
  };

  const renderDayCell = (date: Date) => {
    const day = getDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = isRussianHolidaySync(date);
    const isShortDay = isShortWorkDaySync(date);
    const vacationsForDate = getVacationsForDate(date);
    const hasVacations = vacationsForDate.length > 0;
    const isPreviewRange = isInPreviewRange(date);
    const isStart = isStartDate(date);

    // Определяем стили для ячейки
    let classNames = `calendar-day`;

    // Добавляем класс weekend для выходных дней
    if (isWeekend) {
      classNames += ' weekend';
    }

    // Если это праздник, добавляем дополнительный класс holiday
    if (isHoliday) {
      classNames += ' holiday';
    }

    // Если это сокращенный рабочий день, добавляем соответствующий класс
    if (isShortDay) {
      classNames += ' short-day';
    }

    // Добавляем класс vacation только если есть отпуска
    if (hasVacations) {
      classNames += ' vacation';
    }

    // Добавляем классы для режима выбора дат (только если выбран пользователь)
    if (selectedUserId) {
      if (isStart) classNames += ' start-date';
      else if (isPreviewRange) classNames += ' preview-range';

      // Добавляем класс для изменения курсора, если выбран пользователь
      classNames += ' pointer-cursor';
    }

    // Определяем стиль для ячейки с preview-range, используя цвет выбранного пользователя
    const cellStyle: React.CSSProperties = {};
    if (selectedUser && isPreviewRange) {
      // Используем цвет выбранного пользователя с прозрачностью для preview-range
      cellStyle.backgroundColor = `${selectedUser.color}80`; // 80 - это 50% прозрачность в hex
    }

    if (selectedUser && isStart) {
      // Для start-date используем более насыщенный цвет (меньшая прозрачность)
      cellStyle.backgroundColor = `${selectedUser.color}B3`; // B3 - это 70% прозрачность в hex
    }

    return (
      <td
        key={date.toISOString()}
        className={classNames}
        style={cellStyle}
        onClick={() => handleDayClick(date)}
        onMouseEnter={() => handleMouseEnter(date)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="calendar-day-content">
          {day}
          {/* Маркер для сокращенного дня */}
          {isShortDay && <div className="short-day-marker" title="Сокращенный рабочий день"></div>}

          {/* Рендерим сегменты для отпусков */}
          {hasVacations && (
            <>
              {vacationsForDate.map(({ vacation, user }, index) => {
                if (!user) return null;

                const segmentWidth = 100 / vacationsForDate.length;
                const leftPosition = segmentWidth * index;
                const isThisVacationSelected = selectedVacation && selectedVacation.id === vacation.id;

                // Добавляем класс для выделения выбранного отпуска
                let segmentClass = "vacation-segment";
                if (isThisVacationSelected) {
                  segmentClass += " selected-vacation-segment";
                }

                return (
                  <div
                    key={vacation.id}
                    className={segmentClass}
                    style={{
                      left: `${leftPosition}%`,
                      width: `${segmentWidth}%`,
                      backgroundColor: user.color
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Останавливаем всплытие, чтобы не срабатывал handleDayClick
                      handleVacationSegmentClick(vacation, user);
                    }}
                  >
                  </div>
                );
              })}

              {/* Тултип с именами сотрудников */}
              <div className="vacation-tooltip">
                {vacationsForDate.map(({ user }, index) => (
                  <div key={index}>
                    {user ? user.name : 'Неизвестный сотрудник'}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </td>
    );
  };

  // Разделяем месяцы на две строки по 6 месяцев в каждой
  const firstHalfMonths = calendar.slice(0, 6);
  const secondHalfMonths = calendar.slice(6, 12);

  // Sync our internal selection state with the parent component
  React.useEffect(() => {
    // Reset our internal selection start if selectedUserId changes
    if (!selectedUserId) {
      setSelectionStart(null);
    }
  }, [selectedUserId]);

  return (
    <div className="calendar">
      <div className="calendar-grid">
        {/* Первая строка из 6 месяцев */}
        {firstHalfMonths.map((month, monthIndex) => (
          <div key={monthIndex} className="calendar-month">
            <h3>{getMonthName(month[0])}</h3>
            <table>
              <thead>
                <tr>
                  <th>Пн</th>
                  <th>Вт</th>
                  <th>Ср</th>
                  <th>Чт</th>
                  <th>Пт</th>
                  <th>Сб</th>
                  <th>Вс</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  const firstDay = month[0].getDay();
                  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to 6, shift all others by 1

                  let dayIndex = 0;

                  // Generate all the rows needed for this month
                  for (let rowIndex = 0; dayIndex < month.length; rowIndex++) {
                    const row = [];

                    // Fill in empty cells for the first week
                    if (rowIndex === 0) {
                      for (let i = 0; i < adjustedFirstDay; i++) {
                        row.push(<td key={`empty-${i}`} className="empty-day"></td>);
                      }
                    }

                    // Fill in days for this week
                    for (let colIndex = rowIndex === 0 ? adjustedFirstDay : 0; colIndex < 7 && dayIndex < month.length; colIndex++) {
                      row.push(renderDayCell(month[dayIndex]));
                      dayIndex++;
                    }

                    // Fill in remaining empty cells for the last week
                    if (dayIndex >= month.length && row.length < 7) {
                      const remainingCells = 7 - row.length;
                      for (let i = 0; i < remainingCells; i++) {
                        row.push(<td key={`empty-end-${i}`} className="empty-day"></td>);
                      }
                    }

                    rows.push(<tr key={rowIndex}>{row}</tr>);
                  }

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {/* Вторая строка из 6 месяцев */}
        {secondHalfMonths.map((month, monthIndex) => (
          <div key={monthIndex + 6} className="calendar-month">
            <h3>{getMonthName(month[0])}</h3>
            <table>
              <thead>
                <tr>
                  <th>Пн</th>
                  <th>Вт</th>
                  <th>Ср</th>
                  <th>Чт</th>
                  <th>Пт</th>
                  <th>Сб</th>
                  <th>Вс</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  const firstDay = month[0].getDay();
                  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to 6, shift all others by 1

                  let dayIndex = 0;

                  // Generate all the rows needed for this month
                  for (let rowIndex = 0; dayIndex < month.length; rowIndex++) {
                    const row = [];

                    // Fill in empty cells for the first week
                    if (rowIndex === 0) {
                      for (let i = 0; i < adjustedFirstDay; i++) {
                        row.push(<td key={`empty-${i}`} className="empty-day"></td>);
                      }
                    }

                    // Fill in days for this week
                    for (let colIndex = rowIndex === 0 ? adjustedFirstDay : 0; colIndex < 7 && dayIndex < month.length; colIndex++) {
                      row.push(renderDayCell(month[dayIndex]));
                      dayIndex++;
                    }

                    // Fill in remaining empty cells for the last week
                    if (dayIndex >= month.length && row.length < 7) {
                      const remainingCells = 7 - row.length;
                      for (let i = 0; i < remainingCells; i++) {
                        row.push(<td key={`empty-end-${i}`} className="empty-day"></td>);
                      }
                    }

                    rows.push(<tr key={rowIndex}>{row}</tr>);
                  }

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;