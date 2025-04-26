import { useState, useEffect, KeyboardEvent, useRef } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import { User, VacationPeriod } from './types'
import { getCurrentYear, generateUniqueColor, formatDate } from './utils/dateUtils'
import { getUsers, addUser, deleteUser } from './services/userService'
import { getVacations, addVacation, deleteUserVacations, deleteVacation } from './services/vacationService'
import { resetDatabase } from './utils/resetDatabase'
import { preloadHolidaysForYear } from './utils/holidayUtils'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false)
  const [newUserName, setNewUserName] = useState<string>('')
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [isAddingUserLoading, setIsAddingUserLoading] = useState<boolean>(false);
  const [selectedVacationForDelete, setSelectedVacationForDelete] = useState<{ vacation: VacationPeriod; user: User } | null>(null);
  const currentYear = getCurrentYear()

  const calendarRef = useRef<HTMLDivElement>(null);
  const userChipsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedUsers = await getUsers()
        const loadedVacations = await getVacations()

        await preloadHolidaysForYear(currentYear);

        setUsers(loadedUsers)
        setVacations(loadedVacations)
      } catch (error: unknown) {
        console.error('Ошибка при загрузке данных:', error instanceof Error ? error.message : error)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (calendarRef.current && userChipsRef.current) {
        const isClickInsideCalendar = calendarRef.current.contains(event.target as Node);
        const isClickInsideUserChips = userChipsRef.current.contains(event.target as Node);
        const buttonsContainerRef = document.querySelector('.header-actions');
        const isClickInsideButtons = buttonsContainerRef && buttonsContainerRef.contains(event.target as Node);

        if (!isClickInsideCalendar && !isClickInsideUserChips && !isClickInsideButtons) {
          if (selectedUserId) {
            setSelectedUserId(null);
            setSelectionStart(null);
          }

          if (selectedVacationForDelete) {
            setSelectedVacationForDelete(null);
          }
        }
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [selectedUserId, selectedVacationForDelete]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    setSelectionStart(null)
  }

  const handleAddUser = async () => {
    if (newUserName.trim()) {
      try {
        setIsAddingUserLoading(true);
        const existingColors = users.map(user => user.color);
        const newColor = generateUniqueColor(existingColors);

        const newUser: Omit<User, 'id'> = {
          name: newUserName.trim(),
          color: newColor
        };

        const addedUser = await addUser(newUser)
        setUsers([...users, addedUser])
        setNewUserName('')
        setIsAddingUser(false)
      } catch (error: unknown) {
        console.error('Ошибка при добавлении пользователя:', error instanceof Error ? error.message : error)
      } finally {
        setIsAddingUserLoading(false);
      }
    }
  }

  const handleUserDelete = async (userId: string) => {
    if (!userId) {
      return;
    }

    try {
      setIsDeletingUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setVacations(prevVacations => prevVacations.filter(vacation => vacation.userId !== userId));

      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setSelectionStart(null);
      }

      await Promise.all([
        deleteUserVacations(userId),
        deleteUser(userId)
      ]);
    } catch (error: unknown) {
      try {
        const loadedUsers = await getUsers();
        const loadedVacations = await getVacations();
        setUsers(loadedUsers);
        setVacations(loadedVacations);
      // eslint-disable-next-line no-empty
      } catch {
      }
      alert('Ошибка при удалении пользователя.');
    } finally {
      setIsDeletingUser(null);
    }
  }

  const handleDaySelect = async (date: Date | null) => {
    if (!selectedUserId) return

    if (date === null) {
      setSelectionStart(null)
      return
    }

    if (!selectionStart) {
      setSelectionStart(date)
      return
    }

    try {
      const normalizedSelectionStart = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate());
      const normalizedEndDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const newVacation: Omit<VacationPeriod, 'id'> = {
        userId: selectedUserId,
        startDate: new Date(Math.min(normalizedSelectionStart.getTime(), normalizedEndDate.getTime())),
        endDate: new Date(Math.max(normalizedSelectionStart.getTime(), normalizedEndDate.getTime()))
      }

      const savedVacation = await addVacation(newVacation)

      setVacations([...vacations, savedVacation])
      setSelectionStart(null)
    } catch (error: unknown) {
      console.error('Ошибка при создании отпуска:', error instanceof Error ? error.message : error)
    }
  }

  const handleVacationSelect = (vacation: VacationPeriod | null, user: User | null) => {
    if (!vacation || !user) {
      setSelectedVacationForDelete(null);
      return;
    }

    if (selectedUserId) {
      return;
    }

    setSelectedVacationForDelete({ vacation, user });

    if (selectedUserId) {
      setSelectedUserId(null);
      setSelectionStart(null);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Вы действительно хотите удалить ВСЕ данные (пользователей и отпуска)?')) {
      return;
    }

    try {
      setIsResetting(true);
      await resetDatabase();

      setUsers([]);
      setVacations([]);
      setSelectedUserId(null);
      setSelectionStart(null);

      alert('База данных успешно очищена. Приложение будет перезагружено.');
      window.location.reload();
    } catch (error: unknown) {
      console.error('Ошибка при сбросе базы данных:', error instanceof Error ? error.message : error);
      alert('Произошла ошибка при очистке базы данных. Подробности в консоли.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddUser();
    }
  };

  const handleCancelSelection = () => {
    setSelectionStart(null);
  };

  const handleVacationDelete = async () => {
    if (!selectedVacationForDelete) return;

    try {
      setVacations(prevVacations =>
        prevVacations.filter(v => v.id !== selectedVacationForDelete.vacation.id)
      );

      await deleteVacation(selectedVacationForDelete.vacation.id);

      setSelectedVacationForDelete(null);
    } catch (error) {
      console.error('Ошибка при удалении отпуска:', error);

      try {
        const loadedVacations = await getVacations();
        setVacations(loadedVacations);
      // eslint-disable-next-line no-empty
      } catch {
      }
      alert('Произошла ошибка при удалении отпуска');
    }
  };

  const handleDeleteAllUserVacations = async () => {
    if (!selectedUserId) return;

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    if (!confirm(`Вы действительно хотите удалить ВСЕ отпуска сотрудника ${user.name}?`)) {
      return;
    }

    try {
      setVacations(prevVacations =>
        prevVacations.filter(vacation => vacation.userId !== selectedUserId)
      );

      await deleteUserVacations(selectedUserId);

      setSelectedUserId(null);
      setSelectionStart(null);
    } catch (error) {
      console.error('Ошибка при удалении отпусков пользователя:', error);

      try {
        const loadedVacations = await getVacations();
        setVacations(loadedVacations);
        // eslint-disable-next-line no-empty
      } catch {
      }
      alert('Произошла ошибка при удалении отпусков');
    }
  };

  return (
    <div className="app">
      <header className="app-header" ref={headerRef}>
        <h1>Календарь отпусков {currentYear}</h1>

        <div className="header-actions">
          {!isAddingUser ? (
            <>
              <button
                className="add-user-button"
                onClick={() => setIsAddingUser(true)}
              >
                + Добавить сотрудника
              </button>

              {selectionStart && selectedUserId && (
                <button
                  className="cancel-selection-button"
                  onClick={handleCancelSelection}
                >
                  Отменить выбор даты ({formatDate(selectionStart)})
                </button>
              )}

              {selectedUserId && !selectionStart && (
                <button
                  className="delete-all-vacations-button"
                  onClick={handleDeleteAllUserVacations}
                >
                  Удалить все отпуска {users.find(u => u.id === selectedUserId)?.name}
                </button>
              )}

              {selectedVacationForDelete && (
                <button
                  className="delete-vacation-button"
                  onClick={handleVacationDelete}
                >
                  Удалить отпуск для {selectedVacationForDelete.user.name}
                </button>
              )}

              <button
                className="reset-database-button"
                onClick={handleResetDatabase}
                disabled={isResetting}
              >
                {isResetting ? 'Очистка...' : 'Очистить базу данных'}
              </button>
            </>
          ) : (
            <div className="user-form-inline">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Имя сотрудника"
                autoFocus
              />
              <div className="user-form-actions">
                <button onClick={handleAddUser} disabled={isAddingUserLoading}>
                  {isAddingUserLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setIsAddingUser(false);
                    setNewUserName('');
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="app-container">
        <div className="users-chips" ref={userChipsRef}>
          {users.map((user) => (
            <div
              key={user.id}
              className={`user-chip ${selectedUserId === user.id ? 'selected' : ''}`}
              onClick={() => handleUserSelect(user.id)}
            >
              <span className="user-color" style={{ backgroundColor: user.color }}></span>
              <span className="user-name">{user.name}</span>
              <button className="delete-button" onClick={(e) => {
                e.stopPropagation();
                handleUserDelete(user.id);
              }} disabled={isDeletingUser === user.id}>
                {isDeletingUser === user.id ? 'Удаление...' : '✕'}
              </button>
            </div>
          ))}
        </div>

        <main className="main-content" ref={calendarRef}>
          <Calendar
            year={currentYear}
            users={users}
            vacations={vacations}
            selectedUserId={selectedUserId}
            onDaySelect={handleDaySelect}
            externalSelectionStart={selectionStart}
            onVacationSelect={handleVacationSelect}
            selectedVacationForDelete={selectedVacationForDelete}
          />
        </main>
      </div>
    </div>
  )
}

export default App
