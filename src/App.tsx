import { useRef, useEffect, KeyboardEvent, useState } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import Loader from './components/Loader'
import { Auth } from './components/Auth'
import { useCalendarStore } from './utils/store'
import { getCurrentYear, formatDate } from './utils/dateUtils'
import { onUserChanged, logout } from './services/authService';
import type { User as FirebaseUser } from 'firebase/auth';
// Импорт компонентов Material UI
import {
  Typography,
  Button,
  TextField,
  AppBar,
  Toolbar,
  Box,
  Chip,
  Avatar,
  Stack,
  Paper,
  Container
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  DeleteForever as DeleteForeverIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const {
    employees,
    isLoading,
    selectedEmployeeId,
    selectionStart,
    isAddingEmployee,
    newEmployeeName,
    isDeletingEmployee,
    isAddingEmployeeLoading,
    selectedVacationForDelete,

    loadData,
    selectEmployee,
    addNewEmployee,
    setNewEmployeeName,
    cancelAddingEmployee,
    startAddingEmployee,
    deleteEmployeeById,
    cancelSelection,
    selectVacation,
    deleteVacation,
    deleteAllEmployeeVacations
  } = useCalendarStore();

  const currentYear = getCurrentYear();
  const calendarRef = useRef<HTMLDivElement>(null);
  const employeeChipsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Check authentication status on component mount
  useEffect(() => {
    const unsubscribe = onUserChanged((currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Загружаем данные при монтировании компонента или изменении пользователя
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Обработчик клика вне области выбора
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      // Проверяем, был ли клик на ячейке календаря с датой
      const clickedElement = event.target as HTMLElement;
      const calendarDayCell = clickedElement.closest('.calendar-day');
      const isClickInsideCalendarDay = calendarDayCell !== null;

      // Проверяем клик в области кнопок действий (должен сохранить выбор)
      const isClickInsideActionButtons = headerRef.current && headerRef.current.contains(event.target as Node);

      // Проверяем клик в списке сотрудников (чипсы) - тоже сохраняет выбор
      const isClickInsideEmployeeChips = employeeChipsRef.current && employeeChipsRef.current.contains(event.target as Node);

      // Если клик был не на ячейке с датой, не в кнопках и не в списке сотрудников - снимаем выбор
      if (!isClickInsideCalendarDay && !isClickInsideActionButtons && !isClickInsideEmployeeChips) {
        if (selectedEmployeeId) {
          useCalendarStore.setState({ selectedEmployeeId: null, selectionStart: null });
        }

        if (selectedVacationForDelete) {
          useCalendarStore.setState({ selectedVacationForDelete: null });
        }
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [selectedEmployeeId, selectedVacationForDelete]);

  // Обработчик нажатия клавиш для добавления сотрудника
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addNewEmployee();
    }
  };

  if (authChecking) {
    return <Loader />;
  }

  if (!user) {
    return <Auth />;
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box className="app">
      <AppBar position='static' elevation={0} color="transparent" ref={headerRef}>
        <Toolbar>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
              Календарь отпусков {currentYear}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ justifyContent: "flex-end", flexGrow: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {!isAddingEmployee ? (
                <>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AddIcon />}
                    onClick={startAddingEmployee}
                    size="small"
                  >
                    Добавить
                  </Button>

                  {selectionStart && selectedEmployeeId && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<CancelIcon />}
                      onClick={cancelSelection}
                      size="small"
                    >
                      Отмена ({formatDate(selectionStart)})
                    </Button>
                  )}

                  {selectedEmployeeId && !selectionStart && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={deleteAllEmployeeVacations}
                      size="small"
                    >
                      Удалить отпуска
                    </Button>
                  )}

                  {selectedVacationForDelete && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={deleteVacation}
                      size="small"
                    >
                      Удалить
                    </Button>
                  )}
                </>
              ) : (
                <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Имя сотрудника"
                    autoFocus
                    variant="outlined"
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={addNewEmployee}
                    disabled={isAddingEmployeeLoading}
                    size="small"
                  >
                    {isAddingEmployeeLoading ? "..." : "Сохранить"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={cancelAddingEmployee}
                    size="small"
                  >
                    Отмена
                  </Button>
                </Paper>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{user.email}</Typography>
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={logout}
              >
                Выйти
              </Button>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ my: 'auto'}}>
        <Box ref={employeeChipsRef} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {employees.map((employee) => (
            <Chip
              key={employee.id}
              label={employee.name}
              onClick={() => selectEmployee(employee.id)}
              onDelete={(e) => {
                e.stopPropagation();
                deleteEmployeeById(employee.id);
              }}
              deleteIcon={
                isDeletingEmployee === employee.id ?
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
                  <Box sx={{ width: 16, height: 16 }} className="mini-spinner" />
                </Box> :
                <CloseIcon />
              }
              avatar={<Avatar sx={{ bgcolor: employee.color }}></Avatar>}
              variant="outlined"
              color={selectedEmployeeId === employee.id ? "primary" : "default"}
              sx={{
                fontWeight: selectedEmployeeId === employee.id ? 'bold' : 'normal',
                borderWidth: selectedEmployeeId === employee.id ? 2 : 1,
              }}
            />
          ))}
        </Box>

        <Box className="main-content" ref={calendarRef} sx={{ mt: 2, mb: 3 }}>
          <Calendar
            year={currentYear}
            onVacationSelect={selectVacation}
          />
        </Box>
      </Container>
    </Box>
  )
}

export default App
