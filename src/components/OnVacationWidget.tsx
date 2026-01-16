import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCalendarStore } from '../utils/store';
import { VacationPeriod, Employee } from '../types';

interface ActiveVacation {
  employee: Employee;
  vacation: VacationPeriod;
}

const OnVacationWidget: React.FC = () => {
  const { employees, vacations } = useCalendarStore();

  // Get current date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find active vacations (today >= startDate && today <= endDate)
  const activeVacations: ActiveVacation[] = vacations
    .filter(vacation => {
      const startDate = new Date(vacation.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(vacation.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return today >= startDate && today <= endDate;
    })
    .map(vacation => {
      const employee = employees.find(emp => emp.id === vacation.employeeId);
      return employee ? { employee, vacation } : null;
    })
    .filter((item): item is ActiveVacation => item !== null);

  // Format date range: "12–19 янв"
  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const start = format(startDate, 'd', { locale: ru });
    const end = format(endDate, 'd', { locale: ru });
    const month = format(endDate, 'MMM', { locale: ru });
    
    return `${start}–${end} ${month}`;
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
