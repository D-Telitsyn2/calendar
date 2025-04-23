import React from 'react';
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
  onDaySelect
}) => {
  const calendar = generateCalendarForYear(year);

  const handleDayClick = (date: Date) => {
    onDaySelect(date);
  };

  const getVacationColor = (date: Date): string | null => {
    for (const vacation of vacations) {
      if (isDateInRange(date, vacation.startDate, vacation.endDate)) {
        const user = users.find(u => u.id === vacation.userId);
        return user ? user.color : null;
      }
    }
    return null;
  };

  const renderDayCell = (date: Date) => {
    const day = getDate(date);
    const vacationColor = getVacationColor(date);

    return (
      <td
        key={date.toISOString()}
        className={`calendar-day ${vacationColor ? 'vacation' : ''}`}
        style={{ backgroundColor: vacationColor || 'transparent' }}
        onClick={() => handleDayClick(date)}
      >
        {day}
      </td>
    );
  };

  return (
    <div className="calendar">
      <h2>Календарь отпусков {year}</h2>
      <div className="calendar-grid">
        {calendar.map((month, monthIndex) => (
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
    </div>
  );
};

export default Calendar;