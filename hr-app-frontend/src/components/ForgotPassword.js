// In your ForgotPassword.js component
import React, { useState } from 'react';
import { authAPI } from '../services/api';

const ForgotPassword = ({ onBackToLogin, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Sending forgot password request for:', email);
      
      // Correct way to call the API
      const response = await authAPI.forgotPassword({ email: email });

      console.log('Forgot password response:', response);

      // Response may be an object (JSON) or plain text depending on server/proxy errors
      if (response && typeof response === 'object') {
        // Prefer previewUrl if present (Ethereal development helper)
        if (response.previewUrl) {
          setSuccess(`Password reset link sent (preview available). Preview: ${response.previewUrl}`);
        } else if (response.message) {
          setSuccess(response.message);
        } else {
          setSuccess('Password reset link sent successfully! Check your email.');
        }
      } else if (typeof response === 'string') {
        // Plain text response (maybe HTML) - show small length-limited snippet to help debugging
        setSuccess(`Server response: ${response.slice(0, 300)}${response.length > 300 ? '... (truncated)' : ''}`);
      } else {
        setSuccess('Password reset link sent successfully! Check your email.');
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      
      // More specific error handling
      if (error.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please make sure the backend is running on port 5000.');
      } else if (error.message.includes('Network Error')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(error.message || 'Failed to send reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2>Forgot Password</h2>
        <p style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {success && (
          <div style={styles.success}>
            <strong>Success:</strong> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(loading && styles.buttonDisabled)
            }}
            disabled={loading}
          >
            {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={styles.backLink}>
          <span 
            onClick={onBackToLogin}
            style={styles.backLinkText}
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
    textAlign: 'center',
    color: '#666',
    marginBottom: '1.5rem'
  },
  inputGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
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
  button: {
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
  buttonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed'
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
  },
  backLink: {
    textAlign: 'center',
    marginTop: '1.5rem'
  },
  backLinkText: {
    color: '#007bff',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default ForgotPassword;