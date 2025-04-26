import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { VacationPeriod } from '../types';

// Отпуска хранятся в коллекции vacations, с документами, которые содержат информацию о userId

interface FirebaseVacationData {
  startDate: Timestamp;
  endDate: Timestamp;
  employeeId: string;
  accountId: string;
}

const toFirebaseVacation = (vacation: Omit<VacationPeriod, 'id'>): FirebaseVacationData => {
  return {
    startDate: Timestamp.fromDate(vacation.startDate),
    endDate: Timestamp.fromDate(vacation.endDate),
    employeeId: vacation.employeeId,
    accountId: vacation.accountId
  };
};

const fromFirebaseVacation = (id: string, data: FirebaseVacationData): VacationPeriod => {
  return {
    id,
    employeeId: data.employeeId,
    accountId: data.accountId,
    startDate: data.startDate.toDate(),
    endDate: data.endDate.toDate()
  };
};

export const getVacations = async (accountId: string): Promise<VacationPeriod[]> => {
  const vacationsCollection = collection(db, 'vacations');
  const q = query(vacationsCollection, where('accountId', '==', accountId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc =>
    fromFirebaseVacation(doc.id, doc.data() as FirebaseVacationData)
  );
};

export const getEmployeeVacations = async (employeeId: string): Promise<VacationPeriod[]> => {
  const vacationsCollection = collection(db, 'vacations');
  const q = query(vacationsCollection, where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc =>
    fromFirebaseVacation(doc.id, doc.data() as FirebaseVacationData)
  );
};

export const addVacation = async (vacation: Omit<VacationPeriod, 'id'>): Promise<VacationPeriod> => {
  const firebaseVacation = toFirebaseVacation(vacation);
  const docRef = await addDoc(collection(db, 'vacations'), firebaseVacation);

  return {
    id: docRef.id,
    ...vacation
  };
};

export const updateVacation = async (id: string, vacationData: Partial<Omit<VacationPeriod, 'id'>>): Promise<void> => {
  const vacationRef = doc(db, 'vacations', id);
  const updates: Record<string, Timestamp | string> = {};

  if (vacationData.startDate) {
    updates.startDate = Timestamp.fromDate(vacationData.startDate);
  }

  if (vacationData.endDate) {
    updates.endDate = Timestamp.fromDate(vacationData.endDate);
  }

  if (vacationData.employeeId) {
    updates.employeeId = vacationData.employeeId;
  }

  await updateDoc(vacationRef, updates);
};

export const deleteVacation = async (id: string): Promise<void> => {
  const vacationRef = doc(db, 'vacations', id);
  await deleteDoc(vacationRef);
};

export const deleteEmployeeVacations = async (employeeId: string, accountId: string): Promise<void> => {
  const vacationsCollection = collection(db, 'vacations');
  const q = query(
    vacationsCollection,
    where('employeeId', '==', employeeId),
    where('accountId', '==', accountId)
  );
  const querySnapshot = await getDocs(q);

  await Promise.all(
    querySnapshot.docs.map(document =>
      deleteDoc(doc(db, 'vacations', document.id))
    )
  );
};

export const deleteAllAccountVacations = async (accountId: string): Promise<void> => {
  const vacationsCollection = collection(db, 'vacations');
  const q = query(vacationsCollection, where('accountId', '==', accountId));
  const querySnapshot = await getDocs(q);

  await Promise.all(
    querySnapshot.docs.map(document =>
      deleteDoc(doc(db, 'vacations', document.id))
    )
  );
};