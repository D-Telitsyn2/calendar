import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { format, isSameMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCalendarStore } from '../utils/store';
import { toCalendarDate } from '../utils/dateUtils';
import { VacationPeriod, Employee } from '../types';

interface ActiveVacation {
  employee: Employee;
  vacation: VacationPeriod;
}

const OnVacationWidget: React.FC = () => {
  const { employees, vacations } = useCalendarStore();

  // Get current date at midnight for comparison (memoized)
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Find active vacations (today >= startDate && today <= endDate)
  const activeVacations: ActiveVacation[] = useMemo(() => {
    return vacations
      .filter(vacation => {
        const startDate = toCalendarDate(vacation.startDate);
        const endDate = toCalendarDate(vacation.endDate);
        
        return today >= startDate && today <= endDate;
      })
      .map(vacation => {
        const employee = employees.find(emp => emp.id === vacation.employeeId);
        return employee ? { employee, vacation } : null;
      })
      .filter((item): item is ActiveVacation => item !== null);
  }, [vacations, employees, today]);

  // Format date range: "12–19 янв" or "28 дек–5 янв" for cross-month ranges
  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const start = format(startDate, 'd', { locale: ru });
    const end = format(endDate, 'd', { locale: ru });
    
    if (isSameMonth(startDate, endDate)) {
      const month = format(endDate, 'MMM', { locale: ru });
      return `${start}–${end} ${month}`;
    } else {
      const startMonth = format(startDate, 'MMM', { locale: ru });
      const endMonth = format(endDate, 'MMM', { locale: ru });
      return `${start} ${startMonth}–${end} ${endMonth}`;
    }
  };

  return (
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
        Сейчас в отпуске
      </Typography>
      
      {activeVacations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Сегодня все на месте ✅
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {activeVacations.map(({ employee, vacation }) => (
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
};

export default OnVacationWidget;
