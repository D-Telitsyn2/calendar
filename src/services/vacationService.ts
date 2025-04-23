import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { VacationPeriod } from '../types';

const VACATIONS_COLLECTION = 'vacations';

// Определяем типы для данных в Firestore
interface FirebaseVacationData {
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
}

// Преобразование между типами Date и Timestamp для Firebase
const toFirebaseVacation = (vacation: Omit<VacationPeriod, 'id'>): FirebaseVacationData => {
  return {
    userId: vacation.userId,
    startDate: Timestamp.fromDate(vacation.startDate),
    endDate: Timestamp.fromDate(vacation.endDate)
  };
};

const fromFirebaseVacation = (id: string, data: FirebaseVacationData): VacationPeriod => {
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
  return querySnapshot.docs.map(doc => fromFirebaseVacation(doc.id, doc.data() as FirebaseVacationData));
};

// Получение отпусков пользователя
export const getUserVacations = async (userId: string): Promise<VacationPeriod[]> => {
  const q = query(collection(db, VACATIONS_COLLECTION), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirebaseVacation(doc.id, doc.data() as FirebaseVacationData));
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
  const updates: Record<string, Timestamp | string> = {};

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
  try {
    const vacationRef = doc(db, VACATIONS_COLLECTION, id);
    await deleteDoc(vacationRef);
    console.log(`Успешно удален отпуск с id: ${id}`);
  } catch (error) {
    console.error(`Ошибка при удалении отпуска ${id}:`, error);
    throw error; // Прокидываем ошибку дальше для обработки
  }
};

// Удаление всех отпусков пользователя
export const deleteUserVacations = async (userId: string): Promise<void> => {
  try {
    const vacationsCollection = collection(db, VACATIONS_COLLECTION);
    const q = query(vacationsCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    console.log(`Найдено ${querySnapshot.size} отпусков для удаления`);

    // Используем Promise.all для параллельного удаления
    await Promise.all(
      querySnapshot.docs.map(document => {
        console.log(`Удаляем отпуск с id: ${document.id}`);
        return deleteDoc(doc(db, VACATIONS_COLLECTION, document.id));
      })
    );

    console.log(`Все отпуски пользователя ${userId} удалены`);
  } catch (error) {
    console.error(`Ошибка при удалении отпусков пользователя ${userId}:`, error);
    throw error;
  }
};