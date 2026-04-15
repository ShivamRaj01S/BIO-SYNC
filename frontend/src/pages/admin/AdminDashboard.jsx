import { useState, useEffect } from 'react';
import api from '../../api/client.js';

export default function AdminDashboard() {
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('hospitals');

  useEffect(() => {
    api.get('/admin/hospitals').then(({ data }) => setPendingHospitals(data.hospitals || [])).catch(() => {});
    api.get('/admin/users').then(({ data }) => setUsers(data.users || [])).catch(() => {});
    api.get('/admin/audit-logs').then(({ data }) => setLogs(data.logs || [])).catch(() => {});
    api.get('/admin/analytics').then(({ data }) => setAnalytics(data.analytics)).catch(() => {});
  }, []);

  const verifyHospital = async (hospitalId, approved) => {
    try {
      await api.patch(`/admin/hospitals/${hospitalId}/verify`, { approved });
      setPendingHospitals((prev) => prev.filter((h) => h._id !== hospitalId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const setUserStatus = async (userId, status) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status } : u)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-blood-dark mb-6">Admin Dashboard</h1>

      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-medical-gray">Total users</p>
            <p className="text-2xl font-bold text-blood-red">{analytics.totalUsers}</p>
          </div>
          <div className="card">
            <p className="text-sm text-medical-gray">Donors</p>
            <p className="text-2xl font-bold text-blood-red">{analytics.donors}</p>
          </div>
          <div className="card">
            <p className="text-sm text-medical-gray">Verified hospitals</p>
            <p className="text-2xl font-bold text-blood-red">{analytics.verifiedHospitals}</p>
          </div>
          <div className="card">
            <p className="text-sm text-medical-gray">Completed requests</p>
            <p className="text-2xl font-bold text-blood-red">{analytics.completedRequests}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('hospitals')}
          className={activeTab === 'hospitals' ? 'btn-primary' : 'btn-secondary'}
        >
          Hospital verification
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}
        >
          Audit logs
        </button>
      </div>

      {activeTab === 'hospitals' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-blood-dark">Pending verification</h2>
          {pendingHospitals.length === 0 ? (
            <p className="text-medical-gray">No hospitals pending verification.</p>
          ) : (
            pendingHospitals.map((h) => (
              <div key={h._id} className="card flex flex-wrap justify-between items-start gap-4">
                <div>
                  <p className="font-medium">{h.hospitalName}</p>
                  <p className="text-sm text-medical-gray">{h.user?.email} · {h.address}, {h.city}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => verifyHospital(h._id, true)} className="btn-primary text-sm">Approve</button>
                  <button type="button" onClick={() => verifyHospital(h._id, false)} className="btn-secondary text-sm">Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-medical-gray">Name</th>
                <th className="text-left p-3 text-sm font-medium text-medical-gray">Email</th>
                <th className="text-left p-3 text-sm font-medium text-medical-gray">Role</th>
                <th className="text-left p-3 text-sm font-medium text-medical-gray">Status</th>
                <th className="text-left p-3 text-sm font-medium text-medical-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 text-sm">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">{u.status}</td>
                  <td className="p-3">
                    {u.role !== 'admin' && u.status === 'active' && (
                      <button type="button" onClick={() => setUserStatus(u._id, 'suspended')} className="text-amber-600 text-sm hover:underline">Suspend</button>
                    )}
                    {u.role !== 'admin' && u.status === 'suspended' && (
                      <button type="button" onClick={() => setUserStatus(u._id, 'active')} className="text-green-600 text-sm hover:underline">Activate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-2">
          {logs.slice(0, 50).map((log) => (
            <div key={log._id} className="card py-3 text-sm">
              <span className="font-medium text-blood-red">{log.action}</span> — {log.resource} {log.resourceId && `(${log.resourceId})`}
              {log.user && <span className="text-medical-gray"> · {log.user?.name}</span>}
              <span className="text-medical-gray ml-2">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}