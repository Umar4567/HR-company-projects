import React, { useState, useEffect } from 'react';
import { attendanceAPI, usersAPI } from '../services/api';

const HRDashboard = () => {
  const [stats, setStats] = useState(null);
  const [allAttendance, setAllAttendance] = useState([]);
  // For HR Dashboard we show Today's Attendance — remove date filters from UI
  const [filters, setFilters] = useState({
    department: 'all',
    employeeId: ''
  });
  const [loading, setLoading] = useState(false);
  const [resultsCount, setResultsCount] = useState(null);
  const [departments, setDepartments] = useState(['all']);

  useEffect(() => {
    fetchDashboardData();
    // Load attendance first then derive departments (users API fallback)
    fetchAllAttendance().then(() => fetchDepartments()).catch(() => fetchDepartments());
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await attendanceAPI.getDashboardStats();
      console.debug('HRDashboard.getDashboardStats response:', response);

      // Normalize response to ensure stats.todayAttendance is populated
      let normalized = response || {};
      // Common alternate shapes: { data: {...} } or { payload: {...} }
      if (!normalized.todayAttendance) {
        if (normalized.data && normalized.data.todayAttendance) normalized.todayAttendance = normalized.data.todayAttendance;
        else if (normalized.payload && normalized.payload.todayAttendance) normalized.todayAttendance = normalized.payload.todayAttendance;
        else if (Array.isArray(normalized.todayAttendance)) normalized.todayAttendance = normalized.todayAttendance;
        // sometimes backend might return today's records under 'today' or 'todayAttendanceRecords'
        else if (Array.isArray(normalized.today)) normalized.todayAttendance = normalized.today;
        else if (Array.isArray(normalized.todayAttendanceRecords)) normalized.todayAttendance = normalized.todayAttendanceRecords;
      }

      setStats(normalized);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      // Try users endpoint first
      const usersResp = await usersAPI.getUsers();
      let users = [];
      if (Array.isArray(usersResp)) users = usersResp;
      else if (usersResp && Array.isArray(usersResp.data)) users = usersResp.data;
      else if (usersResp && Array.isArray(usersResp.users)) users = usersResp.users;

      const deptSet = new Set();
      users.forEach(u => { if (u.department) deptSet.add(u.department); });

      // Fallback: scan attendance records already loaded
      if (deptSet.size === 0) {
        if (allAttendance && allAttendance.length > 0) {
          allAttendance.forEach(r => { if (r.employee?.department) deptSet.add(r.employee.department); });
        }
        // If still empty, try fetching attendance directly as a last resort
        if (deptSet.size === 0) {
          try {
            const resp = await attendanceAPI.getAllAttendance();
            let records = [];
            if (Array.isArray(resp)) records = resp;
            else if (resp && Array.isArray(resp.attendance)) records = resp.attendance;
            else if (resp && Array.isArray(resp.data)) records = resp.data;
            else if (resp && Array.isArray(resp.records)) records = resp.records;
            records.forEach(r => { if (r.employee?.department) deptSet.add(r.employee.department); });
          } catch (e) {
            // ignore
          }
        }
      }

      const deptArray = ['all', ...Array.from(deptSet).sort()];
      setDepartments(deptArray);
    } catch (error) {
      console.warn('Could not fetch users for departments, deriving from attendance instead', error);
      const deptSet = new Set();
      if (allAttendance && allAttendance.length > 0) {
        allAttendance.forEach(r => { if (r.employee?.department) deptSet.add(r.employee.department); });
      }
      setDepartments(['all', ...Array.from(deptSet).sort()]);
    }
  };

  const fetchAllAttendance = async (filterParams = {}) => {
    setLoading(true);
    try {
      // Clean params: remove empty values and ignore department 'all'
      const cleanParams = {};
      Object.entries(filterParams || {}).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (typeof v === 'string' && v.trim() === '') return;
        if (k === 'department' && (v === 'all' || v === '')) return;
        cleanParams[k] = v;
      });
      console.debug('HRDashboard.fetchAllAttendance params:', cleanParams);
      const response = await attendanceAPI.getAllAttendance(cleanParams);
      let records = [];
      if (Array.isArray(response)) records = response;
      else if (response && Array.isArray(response.attendance)) records = response.attendance;
      else if (response && Array.isArray(response.data)) records = response.data;
      else if (response && Array.isArray(response.records)) records = response.records;
      setAllAttendance(records);
      setResultsCount(records.length);
      return records;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAllAttendance([]);
      setResultsCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  };

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

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAllAttendance(filters);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusStyle = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold'
    };

    switch (status) {
      case 'present':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
      case 'absent':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
      case 'late':
        return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
      case 'half-day':
        return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460' };
      case 'holiday':
        return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
      default:
        return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
    }
  };

  if (!stats) return <div style={styles.loading}>Loading HR Dashboard...</div>;

  return (
    <div style={styles.container}>
      <h1>HR Dashboard</h1>
      
      {/* Today's Status Alert */}
      {stats.isTodayHoliday && stats.todayHoliday && (
        <div style={styles.holidayAlert}>
          🎉 Today is {stats.todayHoliday.name} - Company Holiday!
        </div>
      )}
      
      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3>Total Employees</h3>
          <p style={styles.statNumber}>{stats.totalEmployees || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Departments</h3>
          <p style={styles.statNumber}>{stats.totalDepartments || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Present Today</h3>
          <p style={styles.statNumber}>{stats.presentToday || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Absent Today</h3>
          <p style={{
            ...styles.statNumber,
            color: stats.absentToday > 0 ? '#e74c3c' : '#2ecc71'
          }}>
            {stats.absentToday || 0}
          </p>
        </div>
      </div>

      {/* Upcoming Holidays Section */}
      {stats.upcomingHolidays && stats.upcomingHolidays.length > 0 && (
        <div style={styles.upcomingSection}>
          <div style={styles.sectionHeader}>
            <h3>📅 Upcoming Company Holidays</h3>
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

      {/* Filters */}
      <div style={styles.filterSection}>
        <h3>Today's Attendance Records</h3>
        <>
        <form onSubmit={handleFilterSubmit} style={styles.filterForm}>
          <select
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
            style={styles.filterInput}
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
            ))}
          </select>
          <input
            type="text"
            name="employeeId"
            placeholder="Employee ID"
            value={filters.employeeId}
            onChange={handleFilterChange}
            style={styles.filterInput}
          />
          <div style={{display:'flex',gap:'8px'}}>
            <button type="submit" style={styles.filterButton} disabled={loading}>
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
            <button type="button" style={{...styles.filterButton, backgroundColor:'#6c757d'}} onClick={() => { setFilters({ department: 'all', employeeId: '' }); fetchAllAttendance(); }}>
              Reset
            </button>
          </div>
        </form>
        {resultsCount !== null && (
          <div style={{marginTop:8,color:'#6b7280'}}>
            {loading ? 'Applying filters...' : `${resultsCount} record(s) found`}
          </div>
        )}
        </>
      </div>

      {/* Today's Attendance Table */}
      <div style={styles.tableContainer}>
        <h3>Today's Employee Status</h3>
        <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Check In</th>
                <th style={styles.th}>Check Out</th>
                <th style={styles.th}>Hours Worked</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(
                (allAttendance && allAttendance.length > 0)
                ? allAttendance.map((record) => (
                    <tr key={record._id || record.employee?._id}>
                      <td style={styles.td}>{record.employee?.employeeId || 'N/A'}</td>
                      <td style={styles.td}>{record.employee?.name || 'N/A'}</td>
                      <td style={styles.td}>{record.employee?.department || 'N/A'}</td>
                      <td style={styles.td}>{formatTime(record.checkIn)}</td>
                      <td style={styles.td}>{formatTime(record.checkOut)}</td>
                      <td style={styles.td}>{record.hoursWorked || 0}</td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(record.status)}>
                          {record.status || 'N/A'}
                        </span>
                        {record.isHoliday && (
                          <div style={styles.holidayTag}>Holiday: {record.holidayName}</div>
                        )}
                      </td>
                    </tr>
                  ))
                : (stats.todayAttendance && stats.todayAttendance.length > 0)
                  ? stats.todayAttendance.map((record) => (
                      <tr key={record._id || record.employee?._id}>
                        <td style={styles.td}>{record.employee?.employeeId || 'N/A'}</td>
                        <td style={styles.td}>{record.employee?.name || 'N/A'}</td>
                        <td style={styles.td}>{record.employee?.department || 'N/A'}</td>
                        <td style={styles.td}>{formatTime(record.checkIn)}</td>
                        <td style={styles.td}>{formatTime(record.checkOut)}</td>
                        <td style={styles.td}>{record.hoursWorked || 0}</td>
                        <td style={styles.td}>
                          <span style={getStatusStyle(record.status)}>
                            {record.status || 'N/A'}
                          </span>
                          {record.isHoliday && (
                            <div style={styles.holidayTag}>Holiday: {record.holidayName}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan="7" style={{ ...styles.td, textAlign: 'center' }}>
                        {loading ? 'Loading attendance records...' : 'No attendance records found'}
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        
      </div>
    </div>
  );
};

// ... (keep the same styles object from previous HRDashboard)

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '18px'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '0.5rem 0 0 0'
  },
  // ... (rest of the styles remain the same as previous HRDashboard)
  upcomingSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e1e8ed',
    marginBottom: '2rem'
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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
  },
  filterSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  filterForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    alignItems: 'end'
  },
  filterInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  tableContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    fontWeight: 'bold'
  },
  td: {
    border: '1px solid #ddd',
    padding: '12px'
  },
  holidayTag: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    marginTop: '4px',
    display: 'inline-block'
  }
};

export default HRDashboard;