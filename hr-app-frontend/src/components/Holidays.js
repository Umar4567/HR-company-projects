import React, { useState, useEffect } from 'react';
import { holidaysAPI } from '../services/api';
import { getUser } from '../utils/auth';

const Holidays = () => {
  const [user] = useState(getUser());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    type: 'all'
  });

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'national',
    description: '',
    recurring: false
  });

  useEffect(() => {
    fetchHolidays();
  }, [filters]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await holidaysAPI.getHolidays(filters);
      setHolidays(response);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingHoliday) {
        await holidaysAPI.updateHoliday(editingHoliday._id, formData);
      } else {
        await holidaysAPI.createHoliday(formData);
      }
      
      setShowForm(false);
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: '',
        type: 'national',
        description: '',
        recurring: false
      });
      fetchHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      type: holiday.type,
      description: holiday.description || '',
      recurring: holiday.recurring
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await holidaysAPI.deleteHoliday(id);
        fetchHolidays();
      } catch (error) {
        console.error('Error deleting holiday:', error);
      }
    }
  };

  const handleAddDefault = async () => {
    if (window.confirm('Add default holidays for this year? This will add common national holidays.')) {
      try {
        await holidaysAPI.addDefaultHolidays();
        fetchHolidays();
      } catch (error) {
        console.error('Error adding default holidays:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeColor = (type) => {
    const colors = {
      national: '#dc3545',
      regional: '#fd7e14',
      company: '#20c997',
      optional: '#6f42c1'
    };
    return colors[type] || '#6c757d';
  };

  if (user.role !== 'admin') {
    return (
      <div style={styles.container}>
        <h2>Holiday Calendar</h2>
        <div style={styles.accessDenied}>
          <h3>Access Denied</h3>
          <p>Only HR administrators can manage holidays.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Holiday Calendar Management</h2>
        <div style={styles.actions}>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={styles.primaryButton}
          >
            {showForm ? 'Cancel' : 'Add Holiday'}
          </button>
          <button 
            onClick={handleAddDefault}
            style={styles.secondaryButton}
          >
            Add Default Holidays
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={filters.year}
          onChange={(e) => setFilters({...filters, year: e.target.value})}
          style={styles.filterInput}
        >
          {[2023, 2024, 2025].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters({...filters, type: e.target.value})}
          style={styles.filterInput}
        >
          <option value="all">All Types</option>
          <option value="national">National</option>
          <option value="regional">Regional</option>
          <option value="company">Company</option>
          <option value="optional">Optional</option>
        </select>
      </div>

      {/* Holiday Form */}
      {showForm && (
        <div style={styles.formContainer}>
          <h3>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              placeholder="Holiday Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={styles.input}
              required
            />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              style={styles.input}
              required
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              style={styles.input}
            >
              <option value="national">National</option>
              <option value="regional">Regional</option>
              <option value="company">Company</option>
              <option value="optional">Optional</option>
            </select>
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              style={styles.textarea}
              rows="3"
            />
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => setFormData({...formData, recurring: e.target.checked})}
                style={styles.checkbox}
              />
              Recurring Holiday
            </label>
            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? 'Saving...' : (editingHoliday ? 'Update Holiday' : 'Add Holiday')}
            </button>
          </form>
        </div>
      )}

      {/* Holidays List */}
      <div style={styles.holidaysList}>
        {loading ? (
          <p>Loading holidays...</p>
        ) : holidays.length > 0 ? (
          holidays.map(holiday => (
            <div key={holiday._id} style={styles.holidayCard}>
              <div style={styles.holidayInfo}>
                <div style={styles.holidayHeader}>
                  <h4 style={styles.holidayName}>{holiday.name}</h4>
                  <span 
                    style={{
                      ...styles.typeBadge,
                      backgroundColor: getTypeColor(holiday.type)
                    }}
                  >
                    {holiday.type}
                  </span>
                  {holiday.recurring && (
                    <span style={styles.recurringBadge}>🔄 Recurring</span>
                  )}
                </div>
                <p style={styles.holidayDate}>{formatDate(holiday.date)}</p>
                {holiday.description && (
                  <p style={styles.holidayDescription}>{holiday.description}</p>
                )}
              </div>
              <div style={styles.holidayActions}>
                <button 
                  onClick={() => handleEdit(holiday)}
                  style={styles.editButton}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(holiday._id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={styles.noHolidays}>
            <p>No holidays found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  actions: {
    display: 'flex',
    gap: '1rem'
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem'
  },
  filterInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px'
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    resize: 'vertical'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  submitButton: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  holidaysList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  holidayCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  holidayInfo: {
    flex: 1
  },
  holidayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.5rem'
  },
  holidayName: {
    margin: 0,
    fontSize: '18px'
  },
  typeBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  recurringBadge: {
    backgroundColor: '#e9ecef',
    color: '#495057',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  holidayDate: {
    color: '#6c757d',
    margin: '0.25rem 0',
    fontWeight: 'bold'
  },
  holidayDescription: {
    color: '#6c757d',
    margin: '0.5rem 0 0 0'
  },
  holidayActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  editButton: {
    backgroundColor: '#ffc107',
    color: '#212529',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  noHolidays: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    color: '#6c757d'
  }
};

export default Holidays;