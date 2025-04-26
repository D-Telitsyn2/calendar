// Переименовываем User в Employee для большей ясности
export interface Employee {
  id: string;
  name: string;
  color: string;
  // Добавляем поле, указывающее на аккаунт, к которому принадлежит сотрудник
  accountId: string;
}

export interface VacationPeriod {
  id: string;
  employeeId: string;  // Переименовываем userId в employeeId для ясности
  startDate: Date;
  endDate: Date;
  accountId: string;   // Добавляем поле, указывающее на аккаунт
}