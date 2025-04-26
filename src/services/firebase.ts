import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFp7j4ln7qj5fN_2Eivx-wmYyStEKtNEw",
  authDomain: "calendar-399d9.firebaseapp.com",
  projectId: "calendar-399d9",
  storageBucket: "calendar-399d9.firebasestorage.app",
  messagingSenderId: "694414836511",
  appId: "1:694414836511:web:07c2a28a999b08d9c1662a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };