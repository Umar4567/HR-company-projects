import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { getUser } from '../utils/auth';
import ConfirmModal from './ConfirmModal';
import getLocationAndAddress from '../utils/location';

const Dashboard = () => {
  const [user] = useState(getUser());
  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAddress, setLastAddress] = useState(null);
  const [lastCoords, setLastCoords] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'checkin' | 'checkout'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await attendanceAPI.getDashboardStats();
      setStats(response);
      setTodayAttendance(response.todayAttendance);
      // prefer server-provided address; otherwise fall back to locally cached address
      if (response.todayAttendance && response.todayAttendance.address) {
        setLastAddress(response.todayAttendance.address);
        try { localStorage.setItem('attendance_last_address', response.todayAttendance.address); } catch (e) { /* ignore */ }
      } else {
        try {
          const cached = localStorage.getItem('attendance_last_address');
          if (cached) setLastAddress(cached);
        } catch (e) { /* ignore */ }
      }

      // also load cached coords if available
      try {
        const coordsRaw = localStorage.getItem('attendance_last_coords');
        if (coordsRaw) {
          const parsed = JSON.parse(coordsRaw);
          setLastCoords(parsed);
        }
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleCheckIn = async () => {
    // Show modal confirmation first
    setConfirmAction('checkin');
    setConfirmVisible(true);
  };

  const handleCheckOut = async () => {
    // Show modal confirmation first
    setConfirmAction('checkout');
    setConfirmVisible(true);
  };

  // Use shared getLocationAndAddress from ../utils/location.js

  // Called when user confirms in modal — simple flow (no map/location)
  const onConfirmModal = async () => {
    setConfirmVisible(false);
    setLoading(true);
    setMessage('Acquiring location...');
    try {
  const { location, address } = await getLocationAndAddress({ language: 'en' });
      console.debug('getLocationAndAddress result', { location, address });
      const payload = location ? { location, address } : undefined;
      if (confirmAction === 'checkin') {
        const response = await attendanceAPI.checkIn(payload);
        setTodayAttendance(response.attendance);
        setMessage(address ? `Checked in: ${address}` : 'Checked in successfully');
      } else if (confirmAction === 'checkout') {
        const response = await attendanceAPI.checkOut(payload);
        setTodayAttendance(response.attendance);
        setMessage(address ? `Checked out: ${address}` : 'Checked out successfully');
      }
      // persist last known
      if (location) {
        try { localStorage.setItem('attendance_last_coords', JSON.stringify(location)); } catch (e) { }
      }
      if (address) {
        try { localStorage.setItem('attendance_last_address', address); } catch (e) { }
        setLastAddress(address);
      }
      fetchDashboardData();
    } catch (err) {
      console.error('Attendance error:', err);
      // apiRequest throws Error with message, but also the original error may include response body
      const serverMsg = err.message || err.response?.data?.message;
      setMessage(serverMsg || 'Error finalizing attendance (see console)');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const onCancelModal = () => {
    setConfirmVisible(false);
    setConfirmAction(null);
  };

  // (map confirm flow removed) — simple confirm modal finalizer is handled by onConfirmModal

  // Helper function to format holiday date
  const formatHolidayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to calculate days until holiday
  const getDaysUntilHoliday = (dateString) => {
    const today = new Date();
    const holidayDate = new Date(dateString);
    const diffTime = holidayDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  };

  // Helper function to get holiday icon
  const getHolidayIcon = (type) => {
    const icons = {
      national: '🇮🇳',
      regional: '🏛️',
      company: '🏢',
      optional: '🎯'
    };
    return icons[type] || '📅';
  };

  // Helper function for type colors
  const getTypeColor = (type) => {
    const colors = {
      national: '#e74c3c',
      regional: '#3498db',
      company: '#2ecc71',
      optional: '#9b59b6'
    };
    return colors[type] || '#95a5a6';
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Not recorded';
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusStyle = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      marginLeft: '8px'
    };

    switch (status) {
      case 'present':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
      case 'absent':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
      case 'half-day':
        return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460' };
      case 'holiday':
        return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
      default:
        return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
    }
  };

  // Get current status - FIXED: Use todayStatus from stats or calculate from todayAttendance
  const getCurrentStatus = () => {
    if (!stats) return 'absent';
    
    // Use todayStatus from backend if available
    if (stats.todayStatus) {
      return stats.todayStatus;
    }
    
    // Fallback: calculate from todayAttendance
    if (stats.isTodayHoliday) {
      return 'holiday';
    }
    if (todayAttendance?.checkIn && todayAttendance?.checkOut) {
      return todayAttendance.status;
    }
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      return 'present';
    }
    return 'absent';
  };

  const currentStatus = getCurrentStatus();

  if (!stats) return <div style={styles.loading}>Loading...</div>;

  return (
    <div className="container">
      <div style={styles.header}>
        <h1>Welcome, {user?.name}</h1>
        <p>Employee ID: {user?.employeeId} | Department: {user?.department}</p>
      </div>

      {/* Holiday Alert */}
      {stats.isTodayHoliday && stats.todayHoliday && (
        <div style={styles.holidayAlert}>
          🎉 Today is {stats.todayHoliday.name} - Holiday!
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3>Working Days (This Month)</h3>
          <p style={styles.statNumber}>{stats.workingDays}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Total Hours (This Month)</h3>
          <p style={styles.statNumber}>{stats.totalHours}</p>
        </div>
      </div>

      {/* Today's Attendance */}
  <div className="card attendance-card" style={styles.attendanceCard}>
        <h2>Today's Attendance</h2>
        <div style={styles.attendanceInfo}>
          <p><strong>Check In:</strong> {formatTime(todayAttendance?.checkIn)}</p>
          <p><strong>Check Out:</strong> {formatTime(todayAttendance?.checkOut)}</p>
          {/* lastAddress display removed by request */}
          <p><strong>Hours Worked:</strong> {todayAttendance?.hoursWorked || 0} hours</p>
          <p><strong>Status:</strong> 
            <span style={getStatusStyle(currentStatus)}>
              {currentStatus === 'present' && 'Present'}
              {currentStatus === 'absent' && 'Absent'}
              {currentStatus === 'half-day' && 'Half Day'}
              {currentStatus === 'holiday' && 'Holiday'}
            </span>
          </p>
          {lastAddress ? (
            <p style={{ marginTop: 6 }}><strong>Last known location:</strong> {lastAddress}</p>
          ) : lastCoords ? (
            <p style={{ marginTop: 6 }}><strong>Last known coords:</strong> {`${lastCoords.latitude.toFixed(5)}, ${lastCoords.longitude.toFixed(5)} (±${Math.round(lastCoords.accuracy || 0)}m)`}</p>
          ) : null}
          <p style={styles.lunchNote}>💡 Note: 1 hour lunch break is automatically deducted</p>
        </div>

        {/* Check-in/Check-out buttons - disabled on holidays or if already completed */}
        {!stats.isTodayHoliday && currentStatus !== 'holiday' && (
          <div style={styles.buttonGroup}>
            {(!todayAttendance?.checkIn && currentStatus === 'absent') && (
              <button 
                onClick={handleCheckIn}
                disabled={loading}
                style={styles.checkInButton}
              >
                Check In
              </button>
            )}
            
            {(todayAttendance?.checkIn && !todayAttendance?.checkOut && currentStatus === 'present') && (
              <button 
                onClick={handleCheckOut}
                disabled={loading}
                style={styles.checkOutButton}
              >
                Check Out
              </button>
            )}
            
            {todayAttendance?.checkOut && (
              <p style={styles.completedText}>✅ Attendance completed for today</p>
            )}
          </div>
        )}

        <ConfirmModal
          visible={confirmVisible}
          title={confirmAction === 'checkin' ? 'Confirm Check In' : 'Confirm Check Out'}
          message={confirmAction === 'checkin' ? 'Are you sure you want to check in now?' : 'Are you sure you want to check out now?'}
          onConfirm={onConfirmModal}
          onCancel={onCancelModal}
          confirmText={confirmAction === 'checkin' ? 'Check In' : 'Check Out'}
          cancelText="Cancel"
          loading={loading}
        />

        {stats.isTodayHoliday && (
          <div style={styles.holidayMessage}>
            🎉 Enjoy your holiday! Check-in/Check-out is disabled today.
          </div>
        )}

        {message && (
          <div style={message.includes('Error') ? styles.errorMessage : styles.successMessage}>
            {message}
          </div>
        )}
      </div>

      {/* Upcoming Holidays */}
      {stats.upcomingHolidays && stats.upcomingHolidays.length > 0 && (
        <div style={styles.upcomingHolidays} className="card">
          <div style={styles.sectionHeader}>
            <h3>📅 Upcoming Holidays</h3>
            <span style={styles.holidayCount}>{stats.upcomingHolidays.length} upcoming</span>
          </div>
          <div style={styles.holidaysGrid}>
            {stats.upcomingHolidays.map(holiday => (
              <div key={holiday._id} style={styles.holidayCard}>
                <div style={styles.holidayIcon}>
                  {getHolidayIcon(holiday.type)}
                </div>
                <div style={styles.holidayContent}>
                  <div style={styles.holidayName}>{holiday.name}</div>
                  <div style={styles.holidayDate}>
                    {formatHolidayDate(holiday.date)}
                  </div>
                  <div style={styles.holidayType}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: getTypeColor(holiday.type)
                    }}>
                      {holiday.type}
                    </span>
                  </div>
                </div>
                <div style={styles.daysLeft}>
                  {getDaysUntilHoliday(holiday.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Complete styles object
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '18px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  holidayAlert: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '2rem',
    border: '1px solid #ffeaa7',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    transition: 'transform 0.2s ease'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '0.5rem 0 0 0'
  },
  attendanceCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  attendanceInfo: {
    margin: '2rem 0',
    fontSize: '18px',
    textAlign: 'left',
    display: 'inline-block'
  },
  lunchNote: {
    fontSize: '14px',
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: '1rem'
  },
  buttonGroup: {
    margin: '2rem 0'
  },
  checkInButton: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    margin: '0 10px',
    transition: 'background-color 0.2s ease'
  },
  checkOutButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    margin: '0 10px',
    transition: 'background-color 0.2s ease'
  },
  completedText: {
    color: '#28a745',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  holidayMessage: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
    padding: '1rem',
    borderRadius: '4px',
    margin: '1rem 0',
    textAlign: 'center'
  },
  successMessage: {
    marginTop: '1rem',
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: '#d4edda',
    color: '#155724',
    textAlign: 'center'
  },
  errorMessage: {
    marginTop: '1rem',
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    textAlign: 'center'
  },
  // Beautiful Upcoming Holidays Styles
  upcomingHolidays: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e1e8ed'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #f8f9fa'
  },
  holidayCount: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  holidaysGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  holidayCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fafbfc',
    borderRadius: '10px',
    border: '1px solid #e1e8ed',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  holidayIcon: {
    fontSize: '24px',
    marginRight: '16px',
    width: '40px',
    textAlign: 'center'
  },
  holidayContent: {
    flex: 1
  },
  holidayName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '4px'
  },
  holidayDate: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '6px',
    fontWeight: '500'
  },
  holidayType: {
    display: 'flex',
    alignItems: 'center'
  },
  typeBadge: {
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  daysLeft: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    minWidth: '60px',
    textAlign: 'center'
  }
};

export default Dashboard;