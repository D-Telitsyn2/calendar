import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { VacationPeriod } from '../types';

const VACATIONS_COLLECTION = 'vacations';

// Преобразование между типами Date и Timestamp для Firebase
const toFirebaseVacation = (vacation: Omit<VacationPeriod, 'id'>): Record<string, any> => {
  return {
    userId: vacation.userId,
    startDate: Timestamp.fromDate(vacation.startDate),
    endDate: Timestamp.fromDate(vacation.endDate)
  };
};

const fromFirebaseVacation = (id: string, data: any): VacationPeriod => {
  return {
    id,
    userId: data.userId,
    startDate: data.startDate.toDate(),
    endDate: data.endDate.toDate()
  };
};

// Получение всех отпусков
export const getVacations = async (): Promise<VacationPeriod[]> => {
  const querySnapshot = await getDocs(collection(db, VACATIONS_COLLECTION));
  return querySnapshot.docs.map(doc => fromFirebaseVacation(doc.id, doc.data()));
};

// Получение отпусков пользователя
export const getUserVacations = async (userId: string): Promise<VacationPeriod[]> => {
  const q = query(collection(db, VACATIONS_COLLECTION), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirebaseVacation(doc.id, doc.data()));
};

// Добавление нового отпуска
export const addVacation = async (vacation: Omit<VacationPeriod, 'id'>): Promise<VacationPeriod> => {
  const firebaseVacation = toFirebaseVacation(vacation);
  const docRef = await addDoc(collection(db, VACATIONS_COLLECTION), firebaseVacation);
  return {
    id: docRef.id,
    ...vacation
  };
};

// Обновление периода отпуска
export const updateVacation = async (id: string, vacationData: Partial<Omit<VacationPeriod, 'id'>>): Promise<void> => {
  const vacationRef = doc(db, VACATIONS_COLLECTION, id);
  const updates: Record<string, any> = {};

  if (vacationData.startDate) {
    updates.startDate = Timestamp.fromDate(vacationData.startDate);
  }

  if (vacationData.endDate) {
    updates.endDate = Timestamp.fromDate(vacationData.endDate);
  }

  if (vacationData.userId) {
    updates.userId = vacationData.userId;
  }

  await updateDoc(vacationRef, updates);
};

// Удаление отпуска
export const deleteVacation = async (id: string): Promise<void> => {
  const vacationRef = doc(db, VACATIONS_COLLECTION, id);
  await deleteDoc(vacationRef);
};

// Удаление всех отпусков пользователя
export const deleteUserVacations = async (userId: string): Promise<void> => {
  const vacations = await getUserVacations(userId);

  // Используем Promise.all для параллельного удаления
  await Promise.all(
    vacations.map(vacation => deleteVacation(vacation.id))
  );
};