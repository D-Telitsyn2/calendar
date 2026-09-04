import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { format, isSameMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCalendarStore } from '../utils/store';
import { isDateInRange, isUpcomingVacationStart, toCalendarDate } from '../utils/dateUtils';
import { VacationPeriod, Employee } from '../types';

interface VacationRow {
  employee: Employee;
  vacation: VacationPeriod;
}

const formatDateRange = (startDate: Date, endDate: Date): string => {
  const start = toCalendarDate(startDate);
  const end = toCalendarDate(endDate);
  const startDay = format(start, 'd', { locale: ru });
  const endDay = format(end, 'd', { locale: ru });

  if (isSameMonth(start, end)) {
    const month = format(end, 'MMM', { locale: ru });
    return `${startDay}–${endDay} ${month}`;
  }

  const startMonth = format(start, 'MMM', { locale: ru });
  const endMonth = format(end, 'MMM', { locale: ru });
  return `${startDay} ${startMonth}–${endDay} ${endMonth}`;
};

const VacationWidgetPaper: React.FC<{
  title: string;
  emptyText: string;
  items: VacationRow[];
}> = ({ title, emptyText, items }) => (
  <Paper
    elevation={2}
    sx={{
      p: 2,
      mb: 2,
      maxWidth: 400,
      width: '100%'
    }}
  >
    <Typography variant="h6" component="h2" sx={{ mb: 1.5, fontWeight: 600 }}>
      {title}
    </Typography>

    {items.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(({ employee, vacation }) => (
          <Box
            key={vacation.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.5
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: employee.color,
                flexShrink: 0
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {employee.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {formatDateRange(vacation.startDate, vacation.endDate)}
            </Typography>
          </Box>
        ))}
      </Box>
    )}
  </Paper>
);

const toRows = (
  vacations: VacationPeriod[],
  employees: Employee[],
  matches: (vacation: VacationPeriod) => boolean
): VacationRow[] => {
  return vacations
    .filter(matches)
    .map(vacation => {
      const employee = employees.find(emp => emp.id === vacation.employeeId);
      return employee ? { employee, vacation } : null;
    })
    .filter((item): item is VacationRow => item !== null);
};

const OnVacationWidget: React.FC = () => {
  const { employees, vacations } = useCalendarStore();
  const todayKey = toCalendarDate(new Date()).getTime();
  const today = useMemo(() => new Date(todayKey), [todayKey]);

  const activeVacations = useMemo(() => {
    return toRows(vacations, employees, vacation =>
      isDateInRange(today, vacation.startDate, vacation.endDate)
    );
  }, [vacations, employees, today]);

  const upcomingVacations = useMemo(() => {
    return toRows(vacations, employees, vacation =>
      isUpcomingVacationStart(today, vacation.startDate)
    ).sort(
      (a, b) =>
        toCalendarDate(a.vacation.startDate).getTime() -
        toCalendarDate(b.vacation.startDate).getTime()
    );
  }, [vacations, employees, today]);

  return (
    <>
      <VacationWidgetPaper
        title="Сейчас в отпуске"
        emptyText="Сегодня все на месте ✅"
        items={activeVacations}
      />
      <VacationWidgetPaper
        title="Скоро уходят в отпуск"
        emptyText="В ближайшие 14 дней никто не уходит"
        items={upcomingVacations}
      />
    </>
  );
};

export default OnVacationWidget;
