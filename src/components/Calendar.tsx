import React, { useState } from 'react';
import { getDate } from 'date-fns';
import { User, VacationPeriod } from '../types';
import { generateCalendarForYear, getMonthName, isDateInRange } from '../utils/dateUtils';

interface CalendarProps {
  year: number;
  users: User[];
  vacations: VacationPeriod[];
  selectedUserId: string | null;
  onDaySelect: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  year,
  users,
  vacations,
  selectedUserId,
  onDaySelect
}) => {
  const calendar = generateCalendarForYear(year);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);

  const handleDayClick = (date: Date) => {
    // Save the selection start to track it in this component
    if (!selectionStart) {
      setSelectionStart(date);
    } else {
      setSelectionStart(null);
    }
    onDaySelect(date);
  };

  const handleMouseEnter = (date: Date) => {
    setHoverDate(date);
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
    const vacationsForDate = getVacationsForDate(date);
    const hasVacations = vacationsForDate.length > 0;
    const isPreviewRange = isInPreviewRange(date);
    const isStart = isStartDate(date);

    let classNames = `calendar-day ${hasVacations ? 'vacation' : ''} ${isWeekend ? 'weekend' : ''}`;
    if (isStart) classNames += ' start-date';
    else if (isPreviewRange) classNames += ' preview-range';

    return (
      <td
        key={date.toISOString()}
        className={classNames}
        onClick={() => handleDayClick(date)}
        onMouseEnter={() => handleMouseEnter(date)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="calendar-day-content">
          {day}

          {/* Рендерим сегменты для отпусков */}
          {hasVacations && (
            <>
              {vacationsForDate.map(({ vacation, user }, index) => {
                if (!user) return null;

                const segmentWidth = 100 / vacationsForDate.length;
                const leftPosition = segmentWidth * index;

                return (
                  <div
                    key={vacation.id}
                    className="vacation-segment"
                    style={{
                      left: `${leftPosition}%`,
                      width: `${segmentWidth}%`,
                      backgroundColor: user.color
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Удалена кнопка удаления отпуска */}
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