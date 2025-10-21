import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { setToken, setUser } from '../utils/auth';

const Login = ({ onLogin, onForgotPassword }) => {
  const [isLogin, setIsLogin] = useState(true);
  const initialFormData = {
    employeeId: '',
    name: '',
    email: '',
    password: '',
    department: ''
  };
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let response;
      if (isLogin) {
        response = await authAPI.login({ email: formData.email, password: formData.password });
      } else {
        response = await authAPI.register(formData);
      }

      if (response.token) {
        setToken(response.token);
        setUser(response);
        onLogin(response);
      } else {
        setError('No token received from server');
      }
    } catch (err) {
      console.error('Login/Register error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Make sure backend is running on port 5000.');
      } else if (err.message.includes('Invalid email or password')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'Something went wrong. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset form when mode changes
  useEffect(() => {
    setFormData(initialFormData);
    setError('');
  }, [isLogin]);

  return (
    <div className="page-center">
      <div className="form-card">
        {/* Top image for branding - place the provided image in public/download.jpg */}
        <div style={{textAlign:'center', marginBottom: '8px'}}>
          <img src="/download.jpg" alt="Brand" className="login-image" />
        </div>
        <div style={{textAlign:'center', marginBottom: '6px'}}>
          <div className="welcome-heading">Welcome to Incircle Jobs</div>
        </div>
        <h2>{isLogin ? 'Login' : 'Register'}</h2>

        {error && <div className="error-box"><strong>Error:</strong> {error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input className="form-input" name="employeeId" placeholder="Employee ID" value={formData.employeeId} onChange={handleChange} required />
              <input className="form-input" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
              <input className="form-input" name="department" placeholder="Department" value={formData.department} onChange={handleChange} required />
            </>
          )}

          <input className="form-input" type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input className="form-input" type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}</button>
          </div>
        </form>

        {isLogin && (
          <div style={{textAlign:'center', marginTop:12}}>
            <span onClick={onForgotPassword} className="toggle-link">Forgot your password?</span>
          </div>
        )}

        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span className="toggle-link" onClick={() => setIsLogin(prev => !prev)}>{isLogin ? 'Register' : 'Login'}</span>
        </p>
      </div>
    </div>
  );
};

export default Login;