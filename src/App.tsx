import { useState, useEffect } from 'react'
import './App.css'
import UserList from './components/UserList'
import Calendar from './components/Calendar'
import { User, VacationPeriod } from './types'
import { getCurrentYear } from './utils/dateUtils'
import { getUsers, addUser, deleteUser } from './services/userService'
import { getVacations, addVacation, deleteUserVacations } from './services/vacationService'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const currentYear = getCurrentYear()

  // Загрузка данных при первом рендере
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // Загружаем пользователей и отпуска из Firebase
        const loadedUsers = await getUsers()
        const loadedVacations = await getVacations()

        // Если пользователей нет, создаем начальные демо-данные
        if (loadedUsers.length === 0) {
          const defaultUsers: Omit<User, 'id'>[] = [
            { name: 'Иван Иванов', color: '#3498db' },
            { name: 'Анна Смирнова', color: '#e74c3c' },
            { name: 'Петр Петров', color: '#2ecc71' }
          ]

          // Добавляем пользователей в Firebase и получаем их с ID
          const createdUsers = await Promise.all(defaultUsers.map(user => addUser(user)))
          setUsers(createdUsers)
        } else {
          setUsers(loadedUsers)
          setVacations(loadedVacations)
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    setSelectionStart(null)
  }

  const handleUserAdd = async (user: Omit<User, 'id'>) => {
    try {
      const newUser = await addUser(user)
      setUsers([...users, newUser])
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error)
    }
  }

  const handleUserDelete = async (userId: string) => {
    try {
      // Удаляем пользователя и все его отпуска
      await deleteUser(userId)
      await deleteUserVacations(userId)

      // Обновляем состояние
      setUsers(users.filter(user => user.id !== userId))
      setVacations(vacations.filter(vacation => vacation.userId !== userId))

      if (selectedUserId === userId) {
        setSelectedUserId(null)
        setSelectionStart(null)
      }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error)
    }
  }

  const handleDaySelect = async (date: Date) => {
    if (!selectedUserId) return

    if (!selectionStart) {
      setSelectionStart(date)
      return
    }

    try {
      // Создаем новый период отпуска
      const newVacation: Omit<VacationPeriod, 'id'> = {
        userId: selectedUserId,
        startDate: new Date(Math.min(selectionStart.getTime(), date.getTime())),
        endDate: new Date(Math.max(selectionStart.getTime(), date.getTime()))
      }

      // Добавляем отпуск в Firebase и получаем объект с ID
      const savedVacation = await addVacation(newVacation)

      // Обновляем состояние
      setVacations([...vacations, savedVacation])
      setSelectionStart(null)
    } catch (error) {
      console.error('Ошибка при создании отпуска:', error)
    }
  }

  return (
    <div className="app">
      <h1>Календарь отпусков {currentYear}</h1>

      {loading ? (
        <div className="loading">Загрузка данных...</div>
      ) : (
        <div className="app-container">
          <aside className="sidebar">
            <UserList
              users={users}
              selectedUserId={selectedUserId}
              onUserSelect={handleUserSelect}
              onUserAdd={handleUserAdd}
              onUserDelete={handleUserDelete}
            />
            {selectionStart && selectedUserId && (
              <div className="selection-info">
                <p>Выбрана начальная дата: {selectionStart.toLocaleDateString()}</p>
                <p>Выберите конечную дату для отпуска</p>
              </div>
            )}
          </aside>
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
      )}
    </div>
  )
}

export default App
