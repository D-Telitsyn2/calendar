import React, { useState } from 'react';
import { User } from '../types';

interface UserListProps {
  users: User[];
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  onUserAdd: (user: User) => void;
  onUserDelete: (userId: string) => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  selectedUserId,
  onUserSelect,
  onUserAdd,
  onUserDelete
}) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserColor, setNewUserColor] = useState('#3498db');

  const handleAddUser = () => {
    if (newUserName.trim()) {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: newUserName.trim(),
        color: newUserColor
      };
      onUserAdd(newUser);
      setNewUserName('');
    }
  };

  return (
    <div className="user-list">
      <h2>Сотрудники</h2>
      <div className="user-form">
        <input
          type="text"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          placeholder="Имя сотрудника"
        />
        <input
          type="color"
          value={newUserColor}
          onChange={(e) => setNewUserColor(e.target.value)}
        />
        <button onClick={handleAddUser}>Добавить</button>
      </div>
      <ul>
        {users.map((user) => (
          <li
            key={user.id}
            className={selectedUserId === user.id ? 'selected' : ''}
            onClick={() => onUserSelect(user.id)}
          >
            <span className="user-color" style={{ backgroundColor: user.color }}></span>
            <span className="user-name">{user.name}</span>
            <button className="delete-button" onClick={(e) => {
              e.stopPropagation();
              onUserDelete(user.id);
            }}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;