import React, { useEffect, useState } from 'react';
import { register, login, getCurrentUser, onUserChanged } from '../services/authService';
import './Auth.css';
import Loader from './Loader';
import type { FirebaseError } from 'firebase/app';
import type { User as FirebaseUser } from 'firebase/auth';

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
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>

        <div className="auth-input-group">
          <input
            className="auth-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoFocus
          />
        </div>

        <div className="auth-input-group">
          <input
            className="auth-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder="Пароль"
          />
          <button
            aria-hidden="true"
            tabIndex={-1}
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {mode === 'register' && (
          <div className="auth-input-group">
            <input
              className="auth-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Подтвердите пароль"
            />
            <button
              aria-hidden="true"
              tabIndex={-1}
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-button" type="submit">
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        <button
          className="auth-switch"
          type="button"
          onClick={toggleMode}
        >
          {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  );
};
