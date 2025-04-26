import { collection, doc, getDoc, deleteDoc, getDocs, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Employee } from '../types';

// Сотрудники хранятся в коллекции employees

export const getEmployees = async (accountId: string): Promise<Employee[]> => {
  // Получаем всех сотрудников для текущего аккаунта
  const employeesCollection = collection(db, 'employees');
  const q = query(employeesCollection, where('accountId', '==', accountId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Employee));
};

export const getEmployee = async (employeeId: string): Promise<Employee | null> => {
  const employeeRef = doc(db, 'employees', employeeId);
  const employeeSnap = await getDoc(employeeRef);

  if (!employeeSnap.exists()) return null;
  return { id: employeeId, ...employeeSnap.data() } as Employee;
};

export const addEmployee = async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
  // Создаем новый документ в коллекции employees
  const employeesCollection = collection(db, 'employees');
  const docRef = await addDoc(employeesCollection, employee);

  return {
    id: docRef.id,
    ...employee
  };
};

export const updateEmployee = async (employeeId: string, employee: Partial<Omit<Employee, 'id'>>): Promise<void> => {
  const employeeRef = doc(db, 'employees', employeeId);
  await updateDoc(employeeRef, employee);
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  const employeeRef = doc(db, 'employees', employeeId);
  await deleteDoc(employeeRef);
};

// Функция для удаления всех сотрудников аккаунта
export const deleteAllEmployees = async (accountId: string): Promise<void> => {
  const employeesCollection = collection(db, 'employees');
  const q = query(employeesCollection, where('accountId', '==', accountId));
  const querySnapshot = await getDocs(q);

  // Удаляем каждого сотрудника
  await Promise.all(
    querySnapshot.docs.map(docSnap => deleteDoc(doc(db, 'employees', docSnap.id)))
  );
};