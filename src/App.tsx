import { useRef, useEffect, KeyboardEvent } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import Loader from './components/Loader'
import { useCalendarStore } from './utils/store'
import { getCurrentYear, formatDate } from './utils/dateUtils'

function App() {
  const {
    users,
    isLoading,
    selectedUserId,
    selectionStart,
    isAddingUser,
    newUserName,
    isResetting,
    isDeletingUser,
    isAddingUserLoading,
    selectedVacationForDelete,

    loadData,
    selectUser,
    addNewUser,
    setNewUserName,
    cancelAddingUser,
    startAddingUser,
    deleteUserById,
    cancelSelection,
    selectVacation,
    deleteVacation,
    deleteAllUserVacations,
    resetDatabaseData
  } = useCalendarStore();

  const currentYear = getCurrentYear();
  const calendarRef = useRef<HTMLDivElement>(null);
  const userChipsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Обработчик нажатия клавиш для добавления пользователя
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addNewUser();
    }
  };

  // Обработчик клика вне области выбора
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (calendarRef.current && userChipsRef.current) {
        const isClickInsideCalendar = calendarRef.current.contains(event.target as Node);
        const isClickInsideUserChips = userChipsRef.current.contains(event.target as Node);
        const buttonsContainerRef = document.querySelector('.header-actions');
        const isClickInsideButtons = buttonsContainerRef && buttonsContainerRef.contains(event.target as Node);

        if (!isClickInsideCalendar && !isClickInsideUserChips && !isClickInsideButtons) {
          if (selectedUserId) {
            useCalendarStore.setState({ selectedUserId: null, selectionStart: null });
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
  }, [selectedUserId, selectedVacationForDelete]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="app">
      <header className="app-header" ref={headerRef}>
        <h1>Календарь отпусков {currentYear}</h1>

        <div className="header-actions">
          {!isAddingUser ? (
            <>
              <button
                className="add-user-button"
                onClick={startAddingUser}
              >
                + Добавить сотрудника
              </button>

              {selectionStart && selectedUserId && (
                <button
                  className="cancel-selection-button"
                  onClick={cancelSelection}
                >
                  Отменить выбор даты ({formatDate(selectionStart)})
                </button>
              )}

              {selectedUserId && !selectionStart && (
                <button
                  className="delete-all-vacations-button"
                  onClick={deleteAllUserVacations}
                >
                  Удалить все отпуска {users.find(u => u.id === selectedUserId)?.name}
                </button>
              )}

              {selectedVacationForDelete && (
                <button
                  className="delete-vacation-button"
                  onClick={deleteVacation}
                >
                  Удалить отпуск для {selectedVacationForDelete.user.name}
                </button>
              )}

              <button
                className="reset-database-button"
                onClick={resetDatabaseData}
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
                <button onClick={addNewUser} disabled={isAddingUserLoading}>
                  {isAddingUserLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  className="cancel-button"
                  onClick={cancelAddingUser}
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
              onClick={() => selectUser(user.id)}
            >
              <span className="user-color" style={{ backgroundColor: user.color }}></span>
              <span className="user-name">{user.name}</span>
              <button className="delete-button" onClick={(e) => {
                e.stopPropagation();
                deleteUserById(user.id);
              }} disabled={isDeletingUser === user.id}>
                {isDeletingUser === user.id ? 'Удаление...' : '✕'}
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
