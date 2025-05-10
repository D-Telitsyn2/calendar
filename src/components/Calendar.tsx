import React, { useState, useEffect } from 'react';
import { getDate, isSameDay } from 'date-fns';
import { Employee, VacationPeriod } from '../types';
import { generateCalendarForYear, getMonthName, isDateInRange } from '../utils/dateUtils';
import { isRussianHolidaySync, isShortWorkDaySync } from '../utils/holidayUtils';
import { useCalendarStore } from '../utils/store';

interface CalendarProps {
  year: number;
  onVacationSelect?: (vacation: VacationPeriod | null, employee: Employee | null) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  year,
  onVacationSelect
}) => {
  const {
    employees,
    vacations,
    selectedEmployeeId,
    selectionStart: externalSelectionStart,
    selectedVacationForDelete,
    handleDaySelect: onDaySelect
  } = useCalendarStore();

  const calendar = generateCalendarForYear(year);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectedVacation, setSelectedVacation] = useState<VacationPeriod | null>(null);

  const selectedEmployee = selectedEmployeeId ? employees.find(employee => employee.id === selectedEmployeeId) : null;

  // Синхронизация локального состояния выбора с глобальным состоянием
  useEffect(() => {
    setSelectionStart(externalSelectionStart);
  }, [externalSelectionStart]);

  // Синхронизация выбранного отпуска с глобальным состоянием
  useEffect(() => {
    if (selectedVacationForDelete) {
      setSelectedVacation(selectedVacationForDelete.vacation);
    } else {
      setSelectedVacation(null);
    }
  }, [selectedVacationForDelete]);

  // Сбрасываем дату наведения, когда сбрасывается начальная дата выбора
  useEffect(() => {
    if (!selectionStart) {
      setHoverDate(null);
    }
  }, [selectionStart]);

  // Сбрасываем выбранный отпуск при выборе сотрудника
  useEffect(() => {
    if (selectedEmployeeId) {
      setSelectedVacation(null);
    }
  }, [selectedEmployeeId]);

  const handleDayClick = (date: Date, event?: React.MouseEvent) => {
    if (event && event.defaultPrevented) {
      return;
    }

    // Получаем отпуска для выбранной даты
    const vacationsForDate = getVacationsForDate(date);

    if (selectedEmployeeId) {
      // Проверяем, есть ли уже отпуск этого сотрудника на эту дату
      const employeeHasVacationOnDate = vacationsForDate.some(
        ({ vacation }) => vacation.employeeId === selectedEmployeeId
      );

      if (employeeHasVacationOnDate) {
        // Если у сотрудника уже есть отпуск на эту дату, ничего не делаем
        return;
      }

      // Если нет начального выбора, устанавливаем его
      if (!selectionStart) {
        setSelectionStart(date);
        onDaySelect(date);
      } else {
        // Если начальный выбор уже есть, создаем отпуск
        setSelectionStart(null);
        onDaySelect(date);
      }
      return;
    }

    // Снимаем выделение отпуска при клике на пустое место
    if (vacationsForDate.length === 0 && selectedVacation) {
      setSelectedVacation(null);
      if (onVacationSelect) {
        onVacationSelect(null, null);
      }
    }
  };

  const handleVacationSegmentClick = (vacation: VacationPeriod, employee: Employee, date: Date) => {
    if (selectedEmployeeId) {
      // Проверяем, этот ли отпуск принадлежит выбранному сотруднику
      if (vacation.employeeId === selectedEmployeeId) {
        return; // Не позволяем создавать отпуск поверх существующего у того же сотрудника
      }

      // Здесь позволяем выбрать дату даже если на нее уже есть отпуск другого сотрудника
      if (!selectionStart) {
        setSelectionStart(date);
        onDaySelect(date); // Передаем дату для первого выбора
      } else {
        // Создаем отпуск при повторном клике
        onDaySelect(date); // Передаем дату для завершения создания отпуска
        setSelectionStart(null);
      }
      return;
    }

    // Если сотрудник не выбран - выбираем отпуск для просмотра/удаления
    setSelectedVacation(vacation);
    if (onVacationSelect) {
      onVacationSelect(vacation, employee);
    }
  };

  const handleMouseEnter = (date: Date) => {
    // Устанавливаем дату наведения всегда, когда есть начальная дата выбора
    // и выбран сотрудник (режим создания отпуска)
    if (selectionStart && selectedEmployeeId) {
      setHoverDate(date);
      // Дебаг
      console.log('Hover date set:', date.toDateString());
    }
  };

  const handleMouseLeave = () => {
    // Сбрасываем дату наведения при выходе курсора из ячейки
    if (hoverDate) {
      setHoverDate(null);
    }
  };

  const getVacationsForDate = (date: Date): { vacation: VacationPeriod; employee: Employee | undefined }[] => {
    const result = [];

    for (const vacation of vacations) {
      if (isDateInRange(date, vacation.startDate, vacation.endDate)) {
        const employee = employees.find(emp => emp.id === vacation.employeeId);
        result.push({ vacation, employee });
      }
    }

    return result;
  };

  const isInPreviewRange = (date: Date): boolean => {
    // Проверяем необходимые условия для отображения предварительного диапазона
    if (!selectedEmployeeId || !selectionStart || !hoverDate) {
      return false;
    }

    // Нормализуем временные метки дат (без времени) для корректного сравнения
    const startTimestamp = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate()).setHours(0, 0, 0, 0);
    const hoverTimestamp = new Date(hoverDate.getFullYear(), hoverDate.getMonth(), hoverDate.getDate()).setHours(0, 0, 0, 0);
    const currentTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).setHours(0, 0, 0, 0);

    // Если эта дата совпадает с начальной датой выбора, не считаем ее частью диапазона
    if (currentTimestamp === startTimestamp) {
      return false;
    }

    // Проверяем, находится ли текущая дата в диапазоне между началом выбора и датой под курсором
    return (currentTimestamp >= Math.min(startTimestamp, hoverTimestamp) &&
            currentTimestamp <= Math.max(startTimestamp, hoverTimestamp));
  };

  const isStartDate = (date: Date): boolean => {
    if (!selectionStart) return false;

    const startTimestamp = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate()).getTime();
    const dateTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    return startTimestamp === dateTimestamp;
  };

  // Function to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return isSameDay(today, date);
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
    const isTodayDate = isToday(date);

    let classNames = `calendar-day`;

    if (isWeekend) {
      classNames += ' weekend';
    }

    if (isHoliday) {
      classNames += ' holiday';
    }

    if (isShortDay) {
      classNames += ' short-day';
    }

    if (hasVacations) {
      classNames += ' vacation';
    }

    if (isTodayDate) {
      classNames += ' today';
    }

    // Добавляем классы для отображения выбора и предпросмотра при выборе сотрудника
    if (selectedEmployeeId) {
      // Всегда добавляем курсор-указатель для всех ячеек при выбранном сотруднике
      classNames += ' pointer-cursor';

      // Отмечаем начальную дату выбора
      if (isStart) {
        classNames += ' start-date';
      }
      // Отмечаем диапазон предпросмотра при наведении
      else if (isPreviewRange) {
        classNames += ' preview-range';
      }
    }

    const cellStyle: React.CSSProperties = {};

    // Применяем стили для всех ячеек, если выбран сотрудник и есть дата начала выбора
    if (selectedEmployee && selectionStart) {
      // Применяем стили для диапазона предпросмотра при наведении
      if (isPreviewRange) {
        cellStyle.backgroundColor = `${selectedEmployee.color}80`; // 50% прозрачность
        cellStyle.position = 'relative';
        cellStyle.zIndex = 1; // Убедимся, что элемент находится над другими
      }

      // Применяем стили для начальной даты выбора
      if (isStart) {
        cellStyle.backgroundColor = `${selectedEmployee.color}B3`; // 70% прозрачность
        cellStyle.position = 'relative';
        cellStyle.zIndex = 2; // Начальная дата должна быть выше диапазона предпросмотра
      }
    }

    return (
      <td
        key={date.toISOString()}
        className={classNames}
        style={cellStyle}
        onClick={(event) => handleDayClick(date, event)}
        onMouseEnter={() => handleMouseEnter(date)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="calendar-day-content">
          <span className='calendar-day-value'>{day}</span>
          {isShortDay && <div className="short-day-marker" title="Сокращенный рабочий день"></div>}

          {hasVacations && (
            <>
              {vacationsForDate.map(({ vacation, employee }, index) => {
                if (!employee) return null;

                const segmentWidth = 100 / vacationsForDate.length;
                const leftPosition = segmentWidth * index;

                const isThisVacationSelected = selectedVacation && selectedVacation.id === vacation.id;

                const isSelectedEmployeeVacation = selectedEmployeeId && vacation.employeeId === selectedEmployeeId;

                let segmentClass = "vacation-segment";
                if (isThisVacationSelected || isSelectedEmployeeVacation) {
                  segmentClass += " selected-vacation-segment";
                }

                const isDisabled = selectedEmployeeId && vacation.employeeId === selectedEmployeeId;

                return (
                  <div
                    key={vacation.id}
                    className={segmentClass}
                    style={{
                      left: `${leftPosition}%`,
                      width: `${segmentWidth}%`,
                      backgroundColor: employee.color
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDisabled) {
                        handleVacationSegmentClick(vacation, employee, date);
                      }
                    }}
                  >
                  </div>
                );
              })}

              <div className="vacation-tooltip">
                {vacationsForDate.map(({ employee }, index) => (
                  <div key={index}>
                    {employee ? employee.name : 'Неизвестный сотрудник'}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </td>
    );
  };

  const firstHalfMonths = calendar.slice(0, 6);
  const secondHalfMonths = calendar.slice(6, 12);

  React.useEffect(() => {
    if (!selectedEmployeeId) {
      setSelectionStart(null);
    }
  }, [selectedEmployeeId]);

  return (
    <div className="calendar">
      <div className="calendar-grid">
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
                  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

                  let dayIndex = 0;

                  for (let rowIndex = 0; dayIndex < month.length; rowIndex++) {
                    const row = [];

                    if (rowIndex === 0) {
                      for (let i = 0; i < adjustedFirstDay; i++) {
                        row.push(<td key={`empty-${i}`} className="empty-day"></td>);
                      }
                    }

                    for (let colIndex = rowIndex === 0 ? adjustedFirstDay : 0; colIndex < 7 && dayIndex < month.length; colIndex++) {
                      row.push(renderDayCell(month[dayIndex]));
                      dayIndex++;
                    }

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
                  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

                  let dayIndex = 0;

                  for (let rowIndex = 0; dayIndex < month.length; rowIndex++) {
                    const row = [];

                    if (rowIndex === 0) {
                      for (let i = 0; i < adjustedFirstDay; i++) {
                        row.push(<td key={`empty-${i}`} className="empty-day"></td>);
                      }
                    }

                    for (let colIndex = rowIndex === 0 ? adjustedFirstDay : 0; colIndex < 7 && dayIndex < month.length; colIndex++) {
                      row.push(renderDayCell(month[dayIndex]));
                      dayIndex++;
                    }

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