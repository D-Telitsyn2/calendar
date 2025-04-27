import { create } from 'zustand';
import { getCurrentYear, generateUniqueColor } from './dateUtils';
import { getEmployees, addEmployee, deleteEmployee, deleteAllEmployees, updateEmployee } from '../services/employeeService';
import { getVacations, addVacation, deleteVacation, deleteEmployeeVacations, deleteAllAccountVacations } from '../services/vacationService';
import { preloadHolidaysForYear } from './holidayUtils';
import { Employee, VacationPeriod } from '../types';
import { getCurrentUser } from '../services/authService';

interface CalendarState {
  employees: Employee[];
  vacations: VacationPeriod[];
  isLoading: boolean;
  selectedEmployeeId: string | null;
  selectionStart: Date | null;
  isAddingEmployee: boolean;
  newEmployeeName: string;
  isResetting: boolean;
  isDeletingEmployee: string | null;
  isAddingEmployeeLoading: boolean;
  selectedVacationForDelete: {
    vacation: VacationPeriod;
    employee: Employee
  } | null;
  isUpdatingEmployee: boolean;
  loadData: () => Promise<void>;
  selectEmployee: (employeeId: string) => void;
  addNewEmployee: () => Promise<void>;
  setNewEmployeeName: (name: string) => void;
  cancelAddingEmployee: () => void;
  startAddingEmployee: () => void;
  deleteEmployeeById: (employeeId: string) => Promise<void>;
  handleDaySelect: (date: Date | null) => Promise<void>;
  cancelSelection: () => void;
  selectVacation: (vacation: VacationPeriod | null, employee: Employee | null) => void;
  deleteVacation: () => Promise<void>;
  deleteAllEmployeeVacations: () => Promise<void>;
  resetDatabaseData: () => Promise<void>;
  updateEmployeeColor: (employeeId: string, color: string) => Promise<void>;
  updateEmployeeName: (employeeId: string, name: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  employees: [],
  vacations: [],
  isLoading: true,
  selectedEmployeeId: null,
  selectionStart: null,
  isAddingEmployee: false,
  newEmployeeName: '',
  isResetting: false,
  isDeletingEmployee: null,
  isAddingEmployeeLoading: false,
  selectedVacationForDelete: null,
  isUpdatingEmployee: false,

  loadData: async () => {
    try {
      set({ isLoading: true });
      const currentUser = getCurrentUser();
      if (!currentUser) {
        set({ employees: [], vacations: [], isLoading: false });
        return;
      }
      const accountId = currentUser.uid;
      const currentYear = getCurrentYear();

      try {
        const [loadedEmployees, loadedVacations] = await Promise.all([
          getEmployees(accountId),
          getVacations(accountId),
          preloadHolidaysForYear(currentYear)
        ]);

        set({
          employees: loadedEmployees || [],
          vacations: loadedVacations,
          isLoading: false
        });
      } catch (dataError) {
        console.error('Ошибка при загрузке данных:', dataError);
        set({
          employees: [],
          vacations: [],
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      set({ isLoading: false });
    }
  },

  selectEmployee: (employeeId) => {
    set({
      selectedEmployeeId: employeeId,
      selectionStart: null
    });
  },

  addNewEmployee: async () => {
    const { newEmployeeName, employees } = get();
    const currentUser = getCurrentUser();
    if (!currentUser || !newEmployeeName.trim()) return;

    try {
      set({ isAddingEmployeeLoading: true });
      const accountId = currentUser.uid;
      const existingColors = employees.map(employee => employee.color);
      const newColor = generateUniqueColor(existingColors);

      const newEmployee: Omit<Employee, 'id'> = {
        name: newEmployeeName.trim(),
        color: newColor,
        accountId
      };

      const createdEmployee = await addEmployee(newEmployee);

      set(state => ({
        employees: [...state.employees, createdEmployee],
        newEmployeeName: '',
        isAddingEmployee: false,
        isAddingEmployeeLoading: false
      }));
    } catch (error) {
      console.error('Ошибка при добавлении сотрудника:', error);
      set({ isAddingEmployeeLoading: false });
    }
  },

  setNewEmployeeName: (name) => set({ newEmployeeName: name }),

  cancelAddingEmployee: () => set({ isAddingEmployee: false, newEmployeeName: '' }),

  startAddingEmployee: () => set({ isAddingEmployee: true }),

  deleteEmployeeById: async (employeeId) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      set({ isDeletingEmployee: employeeId });
      const accountId = currentUser.uid;

      // Сначала удаляем все отпуска сотрудника
      await deleteEmployeeVacations(employeeId, accountId);

      // Затем удаляем самого сотрудника
      await deleteEmployee(employeeId);

      // Обновляем состояние
      set(state => ({
        employees: state.employees.filter(e => e.id !== employeeId),
        vacations: state.vacations.filter(v => v.employeeId !== employeeId),
        selectedEmployeeId: null,
        selectionStart: null,
        isDeletingEmployee: null
      }));
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error);
      alert('Ошибка при удалении сотрудника.');
      set({ isDeletingEmployee: null });
    }
  },

  handleDaySelect: async (date) => {
    const { selectedEmployeeId, selectionStart } = get();
    const currentUser = getCurrentUser();
    if (!currentUser || !selectedEmployeeId) return;

    if (date === null) {
      set({ selectionStart: null });
      return;
    }

    if (!selectionStart) {
      set({ selectionStart: date });
      return;
    }

    try {
      const accountId = currentUser.uid;
      const normalizedSelectionStart = new Date(selectionStart.getFullYear(), selectionStart.getMonth(), selectionStart.getDate());
      const normalizedEndDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const newVacation: Omit<VacationPeriod, 'id'> = {
        employeeId: selectedEmployeeId,
        accountId,
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

  selectVacation: (vacation, employee) => {
    if (!vacation || !employee) {
      set({ selectedVacationForDelete: null });
      return;
    }

    if (get().selectedEmployeeId) {
      return;
    }

    set({
      selectedVacationForDelete: { vacation, employee },
      selectedEmployeeId: null,
      selectionStart: null
    });
  },

  deleteVacation: async () => {
    const { selectedVacationForDelete } = get();
    const currentUser = getCurrentUser();
    if (!currentUser || !selectedVacationForDelete) return;

    try {
      await deleteVacation(selectedVacationForDelete.vacation.id);

      set(state => ({
        vacations: state.vacations.filter(v => v.id !== selectedVacationForDelete.vacation.id),
        selectedVacationForDelete: null
      }));
    } catch (error) {
      console.error('Ошибка при удалении отпуска:', error);
      alert('Произошла ошибка при удалении отпуска');
    }
  },

  deleteAllEmployeeVacations: async () => {
    const { selectedEmployeeId } = get();
    const currentUser = getCurrentUser();
    if (!currentUser || !selectedEmployeeId) return;

    if (!confirm('Вы действительно хотите удалить ВСЕ отпуска этого сотрудника?')) {
      return;
    }

    try {
      const accountId = currentUser.uid;
      await deleteEmployeeVacations(selectedEmployeeId, accountId);

      set(state => ({
        vacations: state.vacations.filter(v => v.employeeId !== selectedEmployeeId),
        selectedEmployeeId: null,
        selectionStart: null
      }));
    } catch (error) {
      console.error('Ошибка при удалении отпусков сотрудника:', error);
      alert('Произошла ошибка при удалении отпусков');
    }
  },

  resetDatabaseData: async () => {
    if (!confirm('Вы действительно хотите удалить ВСЕ данные (сотрудников и отпуска)?')) {
      return;
    }

    try {
      set({ isResetting: true });
      const currentUser = getCurrentUser();
      if (currentUser) {
        const accountId = currentUser.uid;
        await deleteAllAccountVacations(accountId);
        await deleteAllEmployees(accountId);
      }

      set({
        employees: [],
        vacations: [],
        selectedEmployeeId: null,
        selectionStart: null,
      });

      alert('База данных успешно очищена.');
    } catch (error) {
      console.error('Ошибка при сбросе базы данных:', error);
      alert('Произошла ошибка при очистке базы данных.');
    } finally {
      set({ isResetting: false });
    }
  },

  // Новые функции для обновления данных сотрудника
  updateEmployeeColor: async (employeeId: string, color: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      set({ isUpdatingEmployee: true });
      await updateEmployee(employeeId, { color });

      set(state => ({
        employees: state.employees.map(emp =>
          emp.id === employeeId ? { ...emp, color } : emp
        ),
        isUpdatingEmployee: false
      }));
    } catch (error) {
      console.error('Ошибка при обновлении цвета сотрудника:', error);
      set({ isUpdatingEmployee: false });
    }
  },

  updateEmployeeName: async (employeeId: string, name: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !name.trim()) return;

    try {
      set({ isUpdatingEmployee: true });
      await updateEmployee(employeeId, { name: name.trim() });

      set(state => ({
        employees: state.employees.map(emp =>
          emp.id === employeeId ? { ...emp, name: name.trim() } : emp
        ),
        isUpdatingEmployee: false
      }));
    } catch (error) {
      console.error('Ошибка при обновлении имени сотрудника:', error);
      set({ isUpdatingEmployee: false });
    }
  }
}));