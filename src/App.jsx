// App.jsx
import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [vacations, setVacations] = useState({});

  const handleAddUser = async () => {
    const name = prompt("Имя пользователя");
    const color = prompt("Цвет (hex, например, #ff0000)");
    const newUser = { name, color };
    const docRef = await addDoc(collection(db, "users"), newUser);
    setUsers([...users, { id: docRef.id, ...newUser }]);
  };

  const handleDateChange = (range) => {
    if (!selectedUser || !Array.isArray(range)) return;
    const [start, end] = range;
    const days = [];
    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      days.push(date.toISOString().split("T")[0]);
    }
    setVacations((prev) => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), ...days],
    }));
  };

  const tileClassName = ({ date }) => {
    const day = date.toISOString().split("T")[0];
    for (const user of users) {
      if (vacations[user.id]?.includes(day)) {
        return `vacation-${user.id}`;
      }
    }
    return null;
  };

  return (
    <div className="p-4">
      <div className="flex mb-4">
        <button onClick={handleAddUser} className="mr-4">Добавить пользователя</button>
        <div>
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              style={{ color: user.color, fontWeight: selectedUser?.id === user.id ? "bold" : "normal", cursor: "pointer" }}
            >
              ● {user.name}
            </div>
          ))}
        </div>
      </div>
      <Calendar
        selectRange
        onChange={handleDateChange}
        tileClassName={tileClassName}
      />
      <style>{`
        ${users.map(
          (user) => `.vacation-${user.id} {
          background-color: ${user.color};
          color: white;
        }`
        ).join("\n")}
      `}</style>
    </div>
  );
}

export default App;
