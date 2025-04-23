import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

const USERS_COLLECTION = 'users';

// Получение всех пользователей
export const getUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as Omit<User, 'id'>
  }));
};

// Добавление нового пользователя
export const addUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const docRef = await addDoc(collection(db, USERS_COLLECTION), user);
  return { id: docRef.id, ...user };
};

// Обновление пользователя
export const updateUser = async (id: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, id);
  await updateDoc(userRef, userData);
};

// Удаление пользователя
export const deleteUser = async (id: string): Promise<void> => {
  if (!id) {
    throw new Error('ID пользователя не указан');
  }
  const userRef = doc(db, USERS_COLLECTION, id);
  await deleteDoc(userRef);
};