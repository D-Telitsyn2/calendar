export interface User {
  id: string;
  name: string;
  color: string;
}

export interface VacationPeriod {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}