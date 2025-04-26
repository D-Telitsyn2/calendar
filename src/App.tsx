import { useRef, useEffect, KeyboardEvent, useState } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import Loader from './components/Loader'
import { Auth } from './components/Auth'
import { useCalendarStore } from './utils/store'
import { getCurrentYear, formatDate } from './utils/dateUtils'
import { onUserChanged, logout } from './services/authService';
import type { User as FirebaseUser } from 'firebase/auth';

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
    isResetting,
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
    deleteAllEmployeeVacations,
    resetDatabaseData
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
      if (calendarRef.current && employeeChipsRef.current) {
        const isClickInsideCalendar = calendarRef.current.contains(event.target as Node);
        const isClickInsideEmployeeChips = employeeChipsRef.current.contains(event.target as Node);
        const buttonsContainerRef = document.querySelector('.header-actions');
        const isClickInsideButtons = buttonsContainerRef && buttonsContainerRef.contains(event.target as Node);

        if (!isClickInsideCalendar && !isClickInsideEmployeeChips && !isClickInsideButtons) {
          if (selectedEmployeeId) {
            useCalendarStore.setState({ selectedEmployeeId: null, selectionStart: null });
          }

          if (selectedVacationForDelete) {
            useCalendarStore.setState({ selectedVacationForDelete: null });
          }
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
    <div className="app">
      <header className="app-header" ref={headerRef}>
        <div className="header-container">
          <h1>Календарь отпусков {currentYear}</h1>
        </div>

        <div className="app-header-actions">
          <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button onClick={logout} className="logout-button">Выйти</button>
            </div>
          <div className="header-actions">
            {!isAddingEmployee ? (
              <>
                <button
                  className="add-user-button"
                  onClick={startAddingEmployee}
                >
                  + Добавить сотрудника
                </button>

                {selectionStart && selectedEmployeeId && (
                  <button
                    className="cancel-selection-button"
                    onClick={cancelSelection}
                  >
                    Отменить выбор даты ({formatDate(selectionStart)})
                  </button>
                )}

                {selectedEmployeeId && !selectionStart && (
                  <button
                    className="delete-all-vacations-button"
                    onClick={deleteAllEmployeeVacations}
                  >
                    Удалить все отпуска {employees.find(e => e.id === selectedEmployeeId)?.name}
                  </button>
                )}

                {selectedVacationForDelete && (
                  <button
                    className="delete-vacation-button"
                    onClick={deleteVacation}
                  >
                    Удалить отпуск для {selectedVacationForDelete.employee.name}
                  </button>
                )}

                <button
                  className="reset-database-button"
                  onClick={resetDatabaseData}
                  disabled={isResetting}
                >
                  {isResetting ? <span className="button-spinner"></span> : 'Очистить базу данных'}
                </button>
              </>
            ) : (
              <div className="user-form-inline">
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Имя сотрудника"
                  autoFocus
                />
                <div className="user-form-actions">
                  <button onClick={addNewEmployee} disabled={isAddingEmployeeLoading}>
                    {isAddingEmployeeLoading ? <span className="button-spinner"></span> : 'Сохранить'}
                  </button>
                  <button
                    className="cancel-button"
                    onClick={cancelAddingEmployee}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-container">
        <div className="users-chips" ref={employeeChipsRef}>
          {employees.map((employee) => (
            <div
              key={employee.id}
              className={`user-chip ${selectedEmployeeId === employee.id ? 'selected' : ''}`}
              onClick={() => selectEmployee(employee.id)}
            >
              <span className="user-color" style={{ backgroundColor: employee.color }}></span>
              <span className="user-name">{employee.name}</span>
              <button className="delete-button" onClick={(e) => {
                e.stopPropagation();
                deleteEmployeeById(employee.id);
              }} disabled={isDeletingEmployee === employee.id}>
                {isDeletingEmployee === employee.id ? (
                  <span className="mini-spinner"></span>
                ) : '✕'}
              </button>
            </div>
          ))}
        </div>

        <main className="main-content" ref={calendarRef}>
          <Calendar
            year={currentYear}
            onVacationSelect={selectVacation}
          />
        </main>
      </div>
    </div>
  )
}

export default App
