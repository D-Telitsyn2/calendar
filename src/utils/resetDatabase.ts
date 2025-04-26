import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const resetDatabase = async (): Promise<void> => {
  try {
    const vacationsSnapshot = await getDocs(collection(db, 'vacations'));
    const usersSnapshot = await getDocs(collection(db, 'users'));

    const vacationPromises = vacationsSnapshot.docs.map(document =>
      deleteDoc(doc(db, 'vacations', document.id))
    );

    const userPromises = usersSnapshot.docs.map(document =>
      deleteDoc(doc(db, 'users', document.id))
    );

    await Promise.all([...vacationPromises, ...userPromises]);

    return Promise.resolve();
  } catch (error: unknown) {
    return Promise.reject(error);
  }
};