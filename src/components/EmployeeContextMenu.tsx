import React, { useState } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, TextField, Button, Box, DialogActions } from '@mui/material';
import { Edit, Delete, FormatColorFill, EventBusy } from '@mui/icons-material';
import { ChromePicker, ColorResult } from 'react-color';
import { Employee } from '../types';
import { useCalendarStore } from '../utils/store';
import { getDaysCount } from '../utils/dateUtils';

interface EmployeeContextMenuProps {
  open: boolean;
  anchorPosition: { top: number; left: number; } | null;
  employee: Employee | null;
  onClose: () => void;
  onDelete: (employeeId: string) => void;
  onDeleteVacations: (employeeId: string) => void;
  onChangeColor: (employeeId: string, color: string) => Promise<void>;
  onRename: (employeeId: string, name: string) => Promise<void>;
}

const EmployeeContextMenu: React.FC<EmployeeContextMenuProps> = ({
  open,
  anchorPosition,
  employee,
  onClose,
  onDelete,
  onDeleteVacations,
  onChangeColor,
  onRename
}) => {
  const { vacations } = useCalendarStore();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Получаем количество дней отпусков для данного сотрудника
  const employeeVacationDays = employee
    ? vacations.filter(v => v.employeeId === employee.id)
              .reduce((total, vacation) => total + getDaysCount(vacation.startDate, vacation.endDate), 0)
    : 0;

  const handleColorPickerOpen = () => {
    if (employee) {
      setSelectedColor(employee.color);
      setColorPickerOpen(true);
    }
  };

  const handleColorChange = (color: ColorResult) => {
    // Handle both rgba and hex formats
    if (color.rgb && color.rgb.a !== 1) {
      // If there's transparency, use rgba format
      const { r, g, b, a } = color.rgb;
      setSelectedColor(`rgba(${r}, ${g}, ${b}, ${a})`);
    } else {
      // Otherwise use hex
      setSelectedColor(color.hex);
    }
  };

  const handleColorConfirm = () => {
    if (employee && selectedColor) {
      onChangeColor(employee.id, selectedColor);
      setColorPickerOpen(false);
      onClose();
    }
  };

  const handleRenameSubmit = () => {
    if (employee && newName.trim()) {
      onRename(employee.id, newName);
      setRenameDialogOpen(false);
      onClose();
    }
  };

  const handleRenameClick = () => {
    if (employee) {
      setNewName(employee.name);
      setRenameDialogOpen(true);
    }
  };

  const handleDelete = () => {
    if (employee) {
      if (window.confirm(`Вы действительно хотите удалить сотрудника "${employee.name}"?`)) {
        onDelete(employee.id);
      }
    }
    onClose();
  };

  const handleDeleteVacations = () => {
    if (employee) {
      onDeleteVacations(employee.id);
    }
    onClose();
  };

  if (!employee) return null;

  return (
    <>
      <Menu
        open={open}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition || undefined}
      >
        <MenuItem onClick={handleColorPickerOpen}>
          <ListItemIcon>
            <FormatColorFill fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Изменить цвет" />
        </MenuItem>
        <MenuItem onClick={handleRenameClick}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Переименовать" />
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Удалить" />
        </MenuItem>
        <MenuItem onClick={handleDeleteVacations}>
          <ListItemIcon>
            <EventBusy fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={`Удалить отпуска${employeeVacationDays ? ` (${employeeVacationDays} дн.)` : ''}`} />
        </MenuItem>
      </Menu>

      <Dialog open={colorPickerOpen} onClose={() => setColorPickerOpen(false)}>
        <DialogTitle>Выберите новый цвет</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <ChromePicker
              color={selectedColor || employee.color}
              onChange={handleColorChange}
              disableAlpha={false}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorPickerOpen(false)}>Отмена</Button>
          <Button onClick={handleColorConfirm} variant="contained" color="primary">
            Применить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Переименовать сотрудника</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Новое имя"
            type="text"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleRenameSubmit} variant="contained" color="primary">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmployeeContextMenu;