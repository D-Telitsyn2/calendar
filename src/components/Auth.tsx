import React, { useEffect, useState } from 'react';
import { register, login, getCurrentUser, onUserChanged } from '../services/authService';
import './Auth.css';
import Loader from './Loader';
import type { FirebaseError } from 'firebase/app';
import type { User as FirebaseUser } from 'firebase/auth';
// Импорт компонентов Material UI
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Paper,
  Box,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(() => getCurrentUser());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onUserChanged(setUser);
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError.message || 'Ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  if (user) return null;

  if (isSubmitting) {
    return <Loader />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Typography variant="h5" align="center" gutterBottom>
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </Typography>

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            variant="outlined"
            autoFocus
            required
          />

          <TextField
            fullWidth
            label="Пароль"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            variant="outlined"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {mode === 'register' && (
            <TextField
              fullWidth
              label="Подтвердите пароль"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              variant="outlined"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            {mode === 'login' ? 'Войти' : 'Создать'}
          </Button>

          <Button
            type="button"
            variant="text"
            color="primary"
            onClick={toggleMode}
            fullWidth
            sx={{ mt: 1 }}
          >
            {mode === 'login' ? 'Регистрация' : 'Вход'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
