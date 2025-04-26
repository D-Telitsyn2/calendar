import React, { useState } from 'react';
import { User } from '../types';
import { generateUniqueColor } from '../utils/dateUtils';

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
  const [isAddingUser, setIsAddingUser] = useState(false);

  const handleAddUser = () => {
    if (newUserName.trim()) {
      const existingColors = users.map(user => user.color);
      const newColor = generateUniqueColor(existingColors);

      const newUser: User = {
        id: `user-${Date.now()}`,
        name: newUserName.trim(),
        color: newColor
      };
      onUserAdd(newUser);
      setNewUserName('');
      setIsAddingUser(false);
    }
  };

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Сотрудники</h3>
        {!isAddingUser && (
          <button className="add-user-button" onClick={() => setIsAddingUser(true)}>
            + Добавить
          </button>
        )}
      </div>

      {isAddingUser && (
        <div className="user-form">
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Имя сотрудника"
            autoFocus
          />
          <div className="user-form-actions">
            <button onClick={handleAddUser}>Сохранить</button>
            <button
              className="cancel-button"
              onClick={() => {
                setIsAddingUser(false);
                setNewUserName('');
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="users-container">
        {users.map((user) => (
          <div
            key={user.id}
            className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;