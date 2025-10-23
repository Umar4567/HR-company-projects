const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for API calls
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...options,
  };

  if (config.body) {
    config.body = JSON.stringify(config.body);
  }

  try {
    console.log(`API Call: ${config.method || 'GET'} ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    // Be defensive: some error responses (or proxy/server fallbacks) may return HTML or plain text
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    let data = null;
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // fall back to raw text if JSON.parse fails
        data = text;
      }
    } else {
      // Not JSON - return the raw text (could be HTML error page)
      data = text;
    }

    if (!response.ok) {
      // If parsed JSON contains message, prefer it
      const errMsg = data && typeof data === 'object' && data.message ? data.message : (typeof data === 'string' ? data : `HTTP error! status: ${response.status}`);
      const error = new Error(errMsg);
      error.status = response.status;
      error.raw = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: credentials
  }),
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: userData
  }),
  getProfile: () => apiRequest('/auth/profile'),
  forgotPassword: (emailData) => apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: emailData
  }),
  resetPassword: (token, passwordData) => apiRequest(`/auth/reset-password/${token}`, {
    method: 'PUT',
    body: passwordData
  })
};

// Attendance API - UPDATED FOR LOCATION
export const attendanceAPI = {
  // Check in with location data
  checkIn: (locationData) => apiRequest('/attendance/checkin', {
    method: 'POST',
    body: locationData // { latitude, longitude, accuracy }
  }),
  
  // Check out with location data
  checkOut: (locationData) => apiRequest('/attendance/checkout', {
    method: 'POST',
    body: locationData // { latitude, longitude, accuracy }
  }),
  
  getMyAttendance: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/my-attendance?${queryString}`);
  },
  getAllAttendance: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/all?${queryString}`);
  },
  getDashboardStats: () => apiRequest('/attendance/dashboard-stats'),
};

// Holidays API
export const holidaysAPI = {
  getHolidays: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/holidays?${queryString}`);
  },
  getUpcomingHolidays: (limit = 5) => {
    const queryString = new URLSearchParams({ limit }).toString();
    return apiRequest(`/holidays/upcoming?${queryString}`);
  },
  checkHoliday: (date) => apiRequest(`/holidays/check/${date}`),
  createHoliday: (holidayData) => apiRequest('/holidays', {
    method: 'POST',
    body: holidayData
  }),
  updateHoliday: (id, holidayData) => apiRequest(`/holidays/${id}`, {
    method: 'PUT',
    body: holidayData
  }),
  deleteHoliday: (id) => apiRequest(`/holidays/${id}`, {
    method: 'DELETE'
  }),
  addDefaultHolidays: () => apiRequest('/holidays/default', {
    method: 'POST'
  }),
};

// Users API (add if needed)
export const usersAPI = {
  getUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/users?${queryString}`);
  },
  getUserById: (id) => apiRequest(`/users/${id}`),
  updateUser: (id, userData) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: userData
  }),
  deleteUser: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE'
  })
};

// Approve user (admin)
usersAPI.approveUser = (id) => apiRequest(`/users/${id}/approve`, { method: 'PUT' });

export default apiRequest;