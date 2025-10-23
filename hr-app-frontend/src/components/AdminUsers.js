import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const resp = await usersAPI.getUsers({ status: 'pending' });
      setUsers(resp || []);
    } catch (e) {
      console.error('Failed to load pending users', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const approve = async (id) => {
    try {
      await usersAPI.approveUser(id);
      setUsers(users.filter(u => u._id !== id));
    } catch (e) {
      console.error('Approve failed', e);
      alert('Failed to approve user');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Pending Users</h2>
      {loading ? <div>Loading...</div> : (
        users.length === 0 ? <div>No pending users</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{u.employeeId}</td>
                  <td style={{ padding: 8 }}>{u.name}</td>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}>{u.department}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => approve(u._id)} style={{ padding: '6px 10px' }}>Approve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
};

export default AdminUsers;
