import React from 'react';
import { getUser, removeToken, removeUser } from '../utils/auth';

const Header = ({ onLogout, currentView, setCurrentView, userRole }) => {
  const user = getUser();

  const handleLogout = () => {
    removeToken();
    removeUser();
    onLogout();
  };

  return (
    <header className="app-header">
      <div className="app-logo">
        <h2>HR Attendance System</h2>
      </div>
      
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setCurrentView('attendance')}
          className={`nav-button ${currentView === 'attendance' ? 'active' : ''}`}
        >
          {userRole === 'admin' ? 'All Attendance' : 'My Attendance'}
        </button>
        
        {/* Holidays button for admin only */}
        {userRole === 'admin' && (
          <button 
            onClick={() => setCurrentView('holidays')}
            className={`nav-button ${currentView === 'holidays' ? 'active' : ''}`}
          >
            Holidays
          </button>
        )}
      </nav>

      <div className="user-info">
        <span>Welcome, {user?.name} ({user?.role})</span>
        <button onClick={handleLogout} className="btn btn-danger">
          Logout
        </button>
      </div>
    </header>
  );
};

// Add styles object
const styles = {
  header: {
    backgroundColor: '#343a40',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    flex: 1
  },
  nav: {
    flex: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem'
  },
  navButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '1px solid white',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  activeNavButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff'
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '1rem'
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default Header;