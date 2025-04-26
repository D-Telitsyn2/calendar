import React, { useState } from 'react';
import { Employee } from '../types';
import { generateUniqueColor } from '../utils/dateUtils';
// Импорт компонентов Material UI
import {
  Box,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  IconButton,
  Divider,
  Paper,
  Stack
} from '@mui/material';
import { Add, Close } from '@mui/icons-material';

interface UserListProps {
  users: Employee[];
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  onUserAdd: (user: Employee) => void;
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

      const newUser: Employee = {
        id: `user-${Date.now()}`,
        name: newUserName.trim(),
        color: newColor,
        accountId: '', // Adding required accountId field
      };
      onUserAdd(newUser);
      setNewUserName('');
      setIsAddingUser(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ padding: 2, borderRadius: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Сотрудники</Typography>
        {!isAddingUser && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => setIsAddingUser(true)}
          >
            Добавить
          </Button>
        )}
      </Box>

      {isAddingUser && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Имя сотрудника"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            autoFocus
            margin="dense"
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleAddUser}
            >
              Сохранить
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setIsAddingUser(false);
                setNewUserName('');
              }}
            >
              Отмена
            </Button>
          </Stack>
        </Box>
      )}

      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
        {users.map((user, index) => (
          <React.Fragment key={user.id}>
            <ListItem
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="delete"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserDelete(user.id);
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              }
              sx={{ borderRadius: 1 }}
            >
              <ListItemButton
                selected={selectedUserId === user.id}
                onClick={() => onUserSelect(user.id)}
                sx={{ borderRadius: 1 }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: user.color,
                    mr: 1.5
                  }}
                />
                <Typography>{user.name}</Typography>
              </ListItemButton>
            </ListItem>
            {index < users.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default UserList;