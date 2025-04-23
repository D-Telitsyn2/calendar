import { useState, useEffect, KeyboardEvent } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import { User, VacationPeriod } from './types'
import { getCurrentYear, generateUniqueColor } from './utils/dateUtils'
import { getUsers, addUser, deleteUser } from './services/userService'
import { getVacations, addVacation, deleteUserVacations } from './services/vacationService'
import { resetDatabase } from './utils/resetDatabase'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false)
  const [newUserName, setNewUserName] = useState<string>('')
  const [isResetting, setIsResetting] = useState<boolean>(false);
  // Добавляем состояния загрузки для всех асинхронных действий
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null); // ID удаляемого пользователя
  const [isAddingUserLoading, setIsAddingUserLoading] = useState<boolean>(false);
  const currentYear = getCurrentYear()

  // Загрузка данных при первом рендере
  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем пользователей и отпуска из Firebase
        const loadedUsers = await getUsers()
        const loadedVacations = await getVacations()

        // Устанавливаем загруженные данные в состояние
        setUsers(loadedUsers)
        setVacations(loadedVacations)
      } catch (error: unknown) {
        console.error('Ошибка при загрузке данных:', error instanceof Error ? error.message : error)
      }
    }

    loadData()
  }, [])

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    setSelectionStart(null)
  }

  const handleAddUser = async () => {
    if (newUserName.trim()) {
      try {
        setIsAddingUserLoading(true);
        // Генерируем уникальный цвет для нового пользователя
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
      // Обновляем UI сразу для более быстрого отклика
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setVacations(prevVacations => prevVacations.filter(vacation => vacation.userId !== userId));

      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setSelectionStart(null);
      }

      // Выполняем удаление в фоновом режиме
      // Оба запроса выполняются параллельно для ускорения
      await Promise.all([
        deleteUserVacations(userId),
        deleteUser(userId)
      ]);
    } catch (error: unknown) {
      // В случае ошибки перезагружаем данные, чтобы состояние было актуальным
      try {
        const loadedUsers = await getUsers();
        const loadedVacations = await getVacations();
        setUsers(loadedUsers);
        setVacations(loadedVacations);
      } catch {
        // В случае ошибки при перезагрузке просто показываем сообщение
      }
      alert('Ошибка при удалении пользователя.');
    } finally {
      setIsDeletingUser(null);
    }
  }

  const handleDaySelect = async (date: Date) => {
    if (!selectedUserId) return

    if (!selectionStart) {
      setSelectionStart(date)
      return
    }

    try {
      // Нормализуем даты, устанавливая время на начало дня
      const normalizedSelectionStart = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate());
      const normalizedEndDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Создаем новый период отпуска
      const newVacation: Omit<VacationPeriod, 'id'> = {
        userId: selectedUserId,
        startDate: new Date(Math.min(normalizedSelectionStart.getTime(), normalizedEndDate.getTime())),
        endDate: new Date(Math.max(normalizedSelectionStart.getTime(), normalizedEndDate.getTime()))
      }

      // Добавляем отпуск в Firebase и получаем объект с ID
      const savedVacation = await addVacation(newVacation)

      // Обновляем состояние
      setVacations([...vacations, savedVacation])
      setSelectionStart(null)
    } catch (error: unknown) {
      console.error('Ошибка при создании отпуска:', error instanceof Error ? error.message : error)
    } finally {
    }
  }

  // Функция для очистки базы данных
  const handleResetDatabase = async () => {
    if (!confirm('Вы действительно хотите удалить ВСЕ данные (пользователей и отпуска)?')) {
      return;
    }

    try {
      setIsResetting(true);
      await resetDatabase();

      // Обновляем состояние
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

  return (
    <div className="app">
      <header className="app-header">
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
        <div className="users-chips">
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

        {selectionStart && selectedUserId && (
          <div className="selection-info">
            <p>Выбрана начальная дата: {selectionStart.toLocaleDateString()}</p>
            <p>Выберите конечную дату для отпуска</p>
          </div>
        )}

        <main className="main-content">
          <Calendar
            year={currentYear}
            users={users}
            vacations={vacations}
            selectedUserId={selectedUserId}
            onDaySelect={handleDaySelect}
          />
        </main>
      </div>
    </div>
  )
}

export default App
