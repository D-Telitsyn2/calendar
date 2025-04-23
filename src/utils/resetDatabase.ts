// src/utils/resetDatabase.ts
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Утилита для полной очистки базы данных Firebase
 * Удаляет всех пользователей и все отпуска
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    // 1. Получаем данные о всех записях
    const vacationsSnapshot = await getDocs(collection(db, 'vacations'));
    const usersSnapshot = await getDocs(collection(db, 'users'));

    // 2. Создаем массивы операций удаления
    const vacationPromises = vacationsSnapshot.docs.map(document =>
      deleteDoc(doc(db, 'vacations', document.id))
    );

    const userPromises = usersSnapshot.docs.map(document =>
      deleteDoc(doc(db, 'users', document.id))
    );

    // 3. Выполняем все операции удаления параллельно
    await Promise.all([...vacationPromises, ...userPromises]);

    return Promise.resolve();
  } catch (error: unknown) {
    return Promise.reject(error);
  }
};