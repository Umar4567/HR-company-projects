import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { getUser } from '../utils/auth';

const Attendance = () => {
  const [user] = useState(getUser());
  const [attendance, setAttendance] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(false);
  // hover tooltip state (shows full location on hover)
  const [hoverLocation, setHoverLocation] = useState({ id: null, type: null });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    name: ''
  });
  const [resultsCount, setResultsCount] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async (filterParams = {}) => {
    setLoading(true);
    try {
      // Clean params
      const cleanParams = {};
      Object.entries(filterParams || {}).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (typeof v === 'string' && v.trim() === '') return;
        cleanParams[k] = v;
      });

      console.debug('Attendance.fetchAttendance params:', cleanParams);

      let response;
      if (user.role === 'admin') {
        response = await attendanceAPI.getAllAttendance(cleanParams);
      } else {
        response = await attendanceAPI.getMyAttendance(cleanParams);
      }

      // Accept different response shapes from backend
      let records = [];
      if (Array.isArray(response)) records = response;
      else if (response && Array.isArray(response.attendance)) records = response.attendance;
      else if (response && Array.isArray(response.data)) records = response.data;
      else if (response && Array.isArray(response.records)) records = response.records;
      setAttendance(records);
      setResultsCount(records.length);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]); // Set empty array on error
      setResultsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAttendance(filters);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div style={styles.container}>
      <h1>{user.role === 'admin' ? 'All Attendance Records' : 'My Attendance'}</h1>
      
      {/* Filters for Admin */}
      {user.role === 'admin' && (
        <>
        <form onSubmit={handleFilterSubmit} style={styles.filterForm}>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            style={styles.filterInput}
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            style={styles.filterInput}
          />
          <input
            type="text"
            name="name"
            placeholder="Employee name"
            value={filters.name}
            onChange={handleFilterChange}
            style={{ ...styles.filterInput, minWidth: '180px' }}
          />
          <div style={{display:'flex',gap:'8px'}}>
            <button type="submit" style={styles.filterButton} disabled={loading}>
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
            <button type="button" style={{...styles.filterButton, backgroundColor:'#6c757d'}} onClick={() => { setFilters({ startDate: '', endDate: '', name: '' }); fetchAttendance(); }}>
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
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
            <thead>
              <tr>
                {user.role === 'admin' && (
                  <>
                    <th style={styles.th}>Employee ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Department</th>
                  </>
                )}
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Check In</th>
                <th style={styles.th}>Check Out</th>
                <th style={styles.th}>Hours Worked</th>
                <th style={{ ...styles.th, ...styles.statusHeader }}>Status</th>
                <th style={styles.th}>Check In Location</th>
                <th style={styles.th}>Check Out Location</th>
              </tr>
            </thead>
            <tbody>
              {attendance && attendance.length > 0 ? (
                attendance.map((record, idx) => (
                  <React.Fragment key={record._id}>
                    <tr style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                      {user.role === 'admin' && (
                        <>
                          <td style={styles.td}>{record.employee?.employeeId || 'N/A'}</td>
                          <td style={styles.td}>{record.employee?.name || 'N/A'}</td>
                          <td style={styles.td}>{record.employee?.department || 'N/A'}</td>
                        </>
                      )}
                      <td style={styles.td}>{formatDate(record.date)}</td>
                      <td style={styles.td}>{formatTime(record.checkIn)}</td>
                      <td style={styles.td}>{formatTime(record.checkOut)}</td>
                      <td style={styles.td}>{record.hoursWorked || 0}</td>
                      <td style={{ ...styles.td, ...styles.statusCell }}>
                        <span style={getStatusStyle(record.status)}>
                          {record.status || 'N/A'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, position: 'relative' }}>
                        <div
                          style={styles.locationCell}
                          onMouseEnter={() => setHoverLocation({ id: record._id, type: 'in' })}
                          onMouseLeave={() => setHoverLocation({ id: null, type: null })}
                        >
                          {record.checkInLocationName || (record.checkInLatitude && record.checkInLongitude ? `${record.checkInLatitude.toFixed(5)}, ${record.checkInLongitude.toFixed(5)}` : 'N/A')}
                        </div>
                        {/* floating tooltip removed; full-row expansion remains on hover */}
                      </td>
                      <td style={{ ...styles.td, position: 'relative' }}>
                        <div
                          style={styles.locationCell}
                          onMouseEnter={() => setHoverLocation({ id: record._id, type: 'out' })}
                          onMouseLeave={() => setHoverLocation({ id: null, type: null })}
                        >
                          {record.checkOutLocationName || (record.checkOutLatitude && record.checkOutLongitude ? `${record.checkOutLatitude.toFixed(5)}, ${record.checkOutLongitude.toFixed(5)}` : 'N/A')}
                        </div>
                        {/* floating tooltip removed; full-row expansion remains on hover */}
                      </td>
                    </tr>
                  {hoverLocation.id === record._id && hoverLocation.type === 'in' && (record.checkInLocationName || (record.checkInLatitude && record.checkInLongitude)) && (
                    <tr key={`${record._id}-loc-in`} style={styles.fullRow}>
                      <td colSpan={user.role === 'admin' ? 10 : 7} style={styles.fullRowCell}>
                        <strong>Check In Location:</strong> {record.checkInLocationName || `${record.checkInLatitude.toFixed(6)}, ${record.checkInLongitude.toFixed(6)}`}
                      </td>
                    </tr>
                  )}
                  {hoverLocation.id === record._id && hoverLocation.type === 'out' && (record.checkOutLocationName || (record.checkOutLatitude && record.checkOutLongitude)) && (
                    <tr key={`${record._id}-loc-out`} style={styles.fullRow}>
                      <td colSpan={user.role === 'admin' ? 10 : 7} style={styles.fullRowCell}>
                        <strong>Check Out Location:</strong> {record.checkOutLocationName || `${record.checkOutLatitude.toFixed(6)}, ${record.checkOutLongitude.toFixed(6)}`}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
              ) : (
                  <tr>
                    <td 
                      colSpan={user.role === 'admin' ? 8 : 5} 
                      style={{ ...styles.td, textAlign: 'center' }}
                    >
                      {loading ? 'Loading attendance records...' : 'No attendance records found'}
                    </td>
                  </tr>
                )}
            </tbody>
            </table>
        </div>
        {/* location buttons removed to avoid duplicates; Attendance page will send exact location when check in/out is triggered from the main app flow */}
    </div>
  );
};

const getStatusStyle = (status) => {
  const styles = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  };

  switch (status) {
    case 'present':
      return { ...styles, backgroundColor: '#d4edda', color: '#155724' };
    case 'absent':
      return { ...styles, backgroundColor: '#f8d7da', color: '#721c24' };
    case 'late':
      return { ...styles, backgroundColor: '#fff3cd', color: '#856404' };
    default:
      return { ...styles, backgroundColor: '#e2e3e5', color: '#383d41' };
  }
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  filterForm: {
    marginBottom: '2rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  filterInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  statusHeader: {
    minWidth: '120px'
  },
  statusCell: {
    minWidth: '120px',
    whiteSpace: 'nowrap'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e6e9ee',
    background: '#fff'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    fontFamily: "Inter, Roboto, -apple-system, 'Segoe UI', Arial",
    fontSize: '14px'
  },
  th: {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
    zIndex: 2
  },
  td: {
    border: '1px solid #eee',
    padding: '12px',
    verticalAlign: 'top'
  },
  rowEven: {
    backgroundColor: '#ffffff'
  },
  rowOdd: {
    backgroundColor: '#fbfbfc'
  },
  locationCell: {
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  fullRow: {
    backgroundColor: '#f9fafb'
  },
  fullRowCell: {
    padding: '12px',
    borderTop: '1px solid #e6e9ee'
  },
  // floating tooltip styles removed; using full-row expansion on hover
};

export default Attendance;