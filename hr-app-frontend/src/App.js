import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import HRDashboard from './components/HRDashboard';
import Attendance from './components/Attendance';
import AdminUsers from './components/AdminUsers';
import Holidays from './components/Holidays';
import Header from './components/Header';
import { isAuthenticated, getUser } from './utils/auth';
import './App.css';

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(getUser());
  const [currentView, setCurrentView] = useState('dashboard');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      setUser(getUser());
    }
  }, [loggedIn]);

  // Auto-logout on tab close or reload: remove token/user from localStorage
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Clear auth from local storage so next open is logged out
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (err) {
        // ignore
      }
      // Optionally show a confirmation (most browsers ignore custom messages)
      // e.preventDefault();
      // e.returnValue = '';
      return undefined;
    };

    const handleUnload = () => {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [loggedIn]);

  const handleLogin = (userData) => {
    setUser(userData);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    setUser(null);
    setLoggedIn(false);
    setCurrentView('dashboard');
    setShowForgotPassword(false);
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  if (!loggedIn) {
    if (showForgotPassword) {
      return <ForgotPassword onBackToLogin={handleBackToLogin} />;
    }

    return (
      <Router>
        <Routes>
          <Route 
            path="/reset-password/:token" 
            element={<ResetPassword />} 
          />
          <Route 
            path="*" 
            element={
              <Login 
                onLogin={handleLogin} 
                onForgotPassword={handleForgotPassword}
              />
            } 
          />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="App">
        <Header 
          onLogout={handleLogout}
          currentView={currentView}
          setCurrentView={setCurrentView}
          userRole={user?.role}
        />
        
        <main style={styles.main}>
          {user?.role === 'admin' ? (
            <>
              {currentView === 'dashboard' && <HRDashboard />}
              {currentView === 'attendance' && <Attendance />}
              {currentView === 'holidays' && <Holidays />}
              {currentView === 'users' && <AdminUsers />}
            </>
          ) : (
            <>
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'attendance' && <Attendance />}
            </>
          )}
        </main>
      </div>
    </Router>
  );
}

const styles = {
  main: {
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: '#f8f9fa'
  }
};

export default App;