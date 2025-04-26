import { create } from 'zustand';
import { getCurrentYear, generateUniqueColor } from './dateUtils';
import { getUsers, addUser, deleteUser } from '../services/userService';
import { getVacations, addVacation, deleteVacation, deleteUserVacations } from '../services/vacationService';
import { preloadHolidaysForYear } from './holidayUtils';
import { User, VacationPeriod } from '../types';
import { resetDatabase } from './resetDatabase';

interface CalendarState {
  users: User[];
  vacations: VacationPeriod[];
  isLoading: boolean;
  selectedUserId: string | null;
  selectionStart: Date | null;
  isAddingUser: boolean;
  newUserName: string;
  isResetting: boolean;
  isDeletingUser: string | null;
  isAddingUserLoading: boolean;
  selectedVacationForDelete: {
    vacation: VacationPeriod;
    user: User
  } | null;
  loadData: () => Promise<void>;
  selectUser: (userId: string) => void;
  addNewUser: () => Promise<void>;
  setNewUserName: (name: string) => void;
  cancelAddingUser: () => void;
  startAddingUser: () => void;
  deleteUserById: (userId: string) => Promise<void>;
  handleDaySelect: (date: Date | null) => Promise<void>;
  cancelSelection: () => void;
  selectVacation: (vacation: VacationPeriod | null, user: User | null) => void;
  deleteVacation: () => Promise<void>;
  deleteAllUserVacations: () => Promise<void>;
  resetDatabaseData: () => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  users: [],
  vacations: [],
  isLoading: true,
  selectedUserId: null,
  selectionStart: null,
  isAddingUser: false,
  newUserName: '',
  isResetting: false,
  isDeletingUser: null,
  isAddingUserLoading: false,
  selectedVacationForDelete: null,

  loadData: async () => {
    try {
      set({ isLoading: true });
      const currentYear = getCurrentYear();

      const [loadedUsers, loadedVacations] = await Promise.all([
        getUsers(),
        getVacations(),
        preloadHolidaysForYear(currentYear)
      ]);

      set({
        users: loadedUsers,
        vacations: loadedVacations,
        isLoading: false
      });
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      set({ isLoading: false });
    }
  },

  selectUser: (userId) => {
    set({
      selectedUserId: userId,
      selectionStart: null
    });
  },

  addNewUser: async () => {
    const { newUserName, users } = get();

    if (!newUserName.trim()) return;

    try {
      set({ isAddingUserLoading: true });

      const existingColors = users.map(user => user.color);
      const newColor = generateUniqueColor(existingColors);

      const newUser: Omit<User, 'id'> = {
        name: newUserName.trim(),
        color: newColor
      };

      const addedUser = await addUser(newUser);

      set(state => ({
        users: [...state.users, addedUser],
        newUserName: '',
        isAddingUser: false,
        isAddingUserLoading: false
      }));
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      set({ isAddingUserLoading: false });
    }
  },

  setNewUserName: (name) => set({ newUserName: name }),

  cancelAddingUser: () => set({ isAddingUser: false, newUserName: '' }),

  startAddingUser: () => set({ isAddingUser: true }),

  deleteUserById: async (userId) => {
    if (!userId) return;

    try {
      set(state => ({
        isDeletingUser: userId,
        users: state.users.filter(user => user.id !== userId),
        vacations: state.vacations.filter(vacation => vacation.userId !== userId),
        selectedUserId: state.selectedUserId === userId ? null : state.selectedUserId,
        selectionStart: state.selectedUserId === userId ? null : state.selectionStart
      }));

      await Promise.all([
        deleteUserVacations(userId),
        deleteUser(userId)
      ]);
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      try {
        const [loadedUsers, loadedVacations] = await Promise.all([
          getUsers(),
          getVacations()
        ]);
        set({ users: loadedUsers, vacations: loadedVacations });
      } catch {
        // Игнорируем ошибку
      }
      alert('Ошибка при удалении пользователя.');
    } finally {
      set({ isDeletingUser: null });
    }
  },

  handleDaySelect: async (date) => {
    const { selectedUserId, selectionStart } = get();

    if (!selectedUserId) return;

    if (date === null) {
      set({ selectionStart: null });
      return;
    }

    if (!selectionStart) {
      set({ selectionStart: date });
      return;
    }

    try {
      const normalizedSelectionStart = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate());
      const normalizedEndDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const newVacation: Omit<VacationPeriod, 'id'> = {
        userId: selectedUserId,
        startDate: new Date(Math.min(normalizedSelectionStart.getTime(), normalizedEndDate.getTime())),
        endDate: new Date(Math.max(normalizedSelectionStart.getTime(), normalizedEndDate.getTime()))
      };

      const savedVacation = await addVacation(newVacation);

      set(state => ({
        vacations: [...state.vacations, savedVacation],
        selectionStart: null
      }));
    } catch (error) {
      console.error('Ошибка при создании отпуска:', error);
    }
  },

  cancelSelection: () => set({ selectionStart: null }),

  selectVacation: (vacation, user) => {
    if (!vacation || !user) {
      set({ selectedVacationForDelete: null });
      return;
    }

    if (get().selectedUserId) {
      return;
    }

    set(() => ({
      selectedVacationForDelete: { vacation, user },
      selectedUserId: null,
      selectionStart: null
    }));
  },

  deleteVacation: async () => {
    const { selectedVacationForDelete } = get();
    if (!selectedVacationForDelete) return;

    try {
      set(state => ({
        vacations: state.vacations.filter(v => v.id !== selectedVacationForDelete.vacation.id)
      }));

      await deleteVacation(selectedVacationForDelete.vacation.id);

      set({ selectedVacationForDelete: null });
    } catch (error) {
      console.error('Ошибка при удалении отпуска:', error);

      try {
        const loadedVacations = await getVacations();
        set({ vacations: loadedVacations });
      } catch {
        // Игнорируем ошибку
      }
      alert('Произошла ошибка при удалении отпуска');
    }
  },

  deleteAllUserVacations: async () => {
    const { selectedUserId, users } = get();
    if (!selectedUserId) return;

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    if (!confirm(`Вы действительно хотите удалить ВСЕ отпуска сотрудника ${user.name}?`)) {
      return;
    }

    try {
      set(state => ({
        vacations: state.vacations.filter(vacation => vacation.userId !== selectedUserId)
      }));

      await deleteUserVacations(selectedUserId);

      set({
        selectedUserId: null,
        selectionStart: null
      });
    } catch (error) {
      console.error('Ошибка при удалении отпусков пользователя:', error);

      try {
        const loadedVacations = await getVacations();
        set({ vacations: loadedVacations });
      } catch {
        // Игнорируем ошибку
      }
      alert('Произошла ошибка при удалении отпусков');
    }
  },

  resetDatabaseData: async () => {
    if (!confirm('Вы действительно хотите удалить ВСЕ данные (пользователей и отпуска)?')) {
      return;
    }

    try {
      set({ isResetting: true });
      await resetDatabase();

      set({
        users: [],
        vacations: [],
        selectedUserId: null,
        selectionStart: null,
      });

      alert('База данных успешно очищена. Приложение будет перезагружено.');
      window.location.reload();
    } catch (error) {
      console.error('Ошибка при сбросе базы данных:', error);
      alert('Произошла ошибка при очистке базы данных. Подробности в консоли.');
    } finally {
      set({ isResetting: false });
    }
  }
}));