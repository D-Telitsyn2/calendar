// src/utils/resetDatabase.ts
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Утилита для полной очистки базы данных Firebase
 * Удаляет всех пользователей и все отпуска
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log('Начинаем очистку базы данных...');

    // 1. Удаляем все отпуска
    console.log('Удаление всех отпусков...');
    const vacationsSnapshot = await getDocs(collection(db, 'vacations'));
    const vacationPromises = vacationsSnapshot.docs.map(async (document) => {
      console.log(`Удаление отпуска с ID: ${document.id}`);
      await deleteDoc(doc(db, 'vacations', document.id));
    });

    await Promise.all(vacationPromises);
    console.log(`Удалено ${vacationsSnapshot.size} отпусков`);

    // 2. Удаляем всех пользователей
    console.log('Удаление всех пользователей...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userPromises = usersSnapshot.docs.map(async (document) => {
      console.log(`Удаление пользователя с ID: ${document.id}`);
      await deleteDoc(doc(db, 'users', document.id));
    });

    await Promise.all(userPromises);
    console.log(`Удалено ${usersSnapshot.size} пользователей`);

    console.log('База данных успешно очищена!');
    return Promise.resolve();
  } catch (error: unknown) {
    console.error('Ошибка при очистке базы данных:', error instanceof Error ? error.message : error);
    return Promise.reject(error);
  }
};