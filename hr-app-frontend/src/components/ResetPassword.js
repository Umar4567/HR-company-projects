import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // send as object so backend JSON body parser receives { password }
      const response = await authAPI.resetPassword(token, { password });
      // response may be object or string
      if (response && typeof response === 'object' && response.message) setMessage(response.message);
      else if (typeof response === 'string') setMessage(response);
      else setMessage('Password reset successful.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      // If apiRequest attached raw response, show it for debugging
      if (error && error.raw) {
        const raw = typeof error.raw === 'string' ? error.raw : JSON.stringify(error.raw);
        setError(raw.slice(0, 1000));
      } else {
        setError(error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2>Reset Your Password</h2>
        <p style={styles.subtitle}>
          Enter your new password below.
        </p>
        
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
        
        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter new password"
              required
              minLength="6"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Confirm new password"
              required
              minLength="6"
            />
          </div>
          
          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={styles.backLink}>
          <span 
            onClick={() => navigate('/')}
            style={styles.backText}
          >
            ← Back to Login
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '400px'
  },
  subtitle: {
    color: '#666',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  backLink: {
    textAlign: 'center',
    marginTop: '1.5rem'
  },
  backText: {
    color: '#007bff',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  error: {
    color: 'red',
    marginBottom: '1rem',
    textAlign: 'center',
    backgroundColor: '#ffe6e6',
    padding: '10px',
    borderRadius: '4px'
  },
  success: {
    color: 'green',
    marginBottom: '1rem',
    textAlign: 'center',
    backgroundColor: '#e6ffe6',
    padding: '10px',
    borderRadius: '4px'
  }
};

export default ResetPassword;