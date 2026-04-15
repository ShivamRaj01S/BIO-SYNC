import { useEffect, useState } from 'react';
import api from '../../api/client.js';

export default function AdminDashboardView() {
  const [dashboard, setDashboard] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('verification');

  const loadDashboard = async () => {
    const [{ data: dashboardData }, { data: logsData }] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/audit-logs?limit=50'),
    ]);

    setDashboard(dashboardData);
    setLogs(logsData.logs || []);
  };

  useEffect(() => {
    loadDashboard().catch(() => {});
  }, []);

  const verifyHospital = async (hospitalId, approved) => {
    try {
      await api.patch(`/admin/hospitals/${hospitalId}/verify`, { approved });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update hospital verification.');
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update user status.');
    }
  };

  if (!dashboard) {
    return (
      <div className="page-shell max-w-7xl py-10">
        <p className="text-medical-gray">Loading admin control panel...</p>
      </div>
    );
  }

  const { analytics, pendingHospitals, users, securityOverview } = dashboard;

  return (
    <div className="page-shell max-w-7xl space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <p className="text-sm text-medical-gray">Total users</p>
          <p className="text-3xl font-bold text-blood-red">{analytics.totalUsers}</p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Verified hospitals</p>
          <p className="text-3xl font-bold text-blood-dark">{analytics.verifiedHospitals}</p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Active requests</p>
          <p className="text-3xl font-bold text-blood-dark">{analytics.activeRequests}</p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Completed donations</p>
          <p className="text-3xl font-bold text-green-600">{analytics.completedRequests}</p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('verification')}
            className={activeTab === 'verification' ? 'btn-primary' : 'btn-secondary'}
          >
            Verify hospitals / NGOs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
          >
            User control
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}
          >
            Fraud review
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}
          >
            Audit logs
          </button>
        </div>

        {activeTab === 'verification' && (
          <div className="space-y-4">
            {pendingHospitals.length === 0 ? (
              <p className="text-medical-gray">No hospitals waiting for verification.</p>
            ) : (
              pendingHospitals.map((hospital) => (
                <div key={hospital._id} className="interactive-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-blood-dark">{hospital.hospitalName}</p>
                      <p className="text-sm text-medical-gray">
                        {hospital.user?.email} | {hospital.address}, {hospital.city}
                      </p>
                      <p className="text-sm text-medical-gray">
                        Registration: {hospital.registrationNumber || 'Not provided'} | Documents:{' '}
                        {hospital.documents?.length || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => verifyHospital(hospital._id, true)}
                        className="btn-primary"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => verifyHospital(hospital._id, false)}
                        className="btn-secondary"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-medical-gray">
                  <th className="py-3">Name</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Flags</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium text-blood-dark">{user.name}</p>
                      <p className="text-medical-gray">{user.email}</p>
                    </td>
                    <td className="py-3 capitalize">{user.role}</td>
                    <td className="py-3 capitalize">{user.status}</td>
                    <td className="py-3">{user.flags?.filter((flag) => flag.status === 'open').length || 0}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {user.status !== 'active' && user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user._id, 'active')}
                            className="text-green-600 hover:underline"
                          >
                            Activate
                          </button>
                        )}
                        {user.status !== 'suspended' && user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user._id, 'suspended')}
                            className="text-amber-600 hover:underline"
                          >
                            Suspend
                          </button>
                        )}
                        {user.status !== 'blocked' && user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user._id, 'blocked')}
                            className="text-red-600 hover:underline"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-blood-dark mb-3">Flagged users</h2>
              <div className="space-y-3">
                {securityOverview.flaggedUsers.length === 0 ? (
                  <p className="text-medical-gray">No open fraud flags.</p>
                ) : (
                  securityOverview.flaggedUsers.map((user) => (
                    <div key={user._id} className="interactive-card p-4">
                      <p className="font-medium text-blood-dark">{user.name}</p>
                      <p className="text-sm text-medical-gray">{user.email}</p>
                      <div className="mt-2 space-y-2">
                        {user.flags.filter((flag) => flag.status === 'open').map((flag) => (
                          <div key={flag._id} className="rounded-xl bg-blood-pale px-3 py-2 text-sm text-blood-dark">
                            {flag.type}: {flag.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-blood-dark mb-3">Blocked users</h2>
              <div className="space-y-3">
                {securityOverview.blockedUsers.length === 0 ? (
                  <p className="text-medical-gray">No blocked users.</p>
                ) : (
                  securityOverview.blockedUsers.map((user) => (
                    <div key={user._id} className="interactive-card p-4">
                      <p className="font-medium text-blood-dark">{user.name}</p>
                      <p className="text-sm text-medical-gray">
                        {user.email} | <span className="capitalize">{user.role}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-medical-gray">No audit logs available.</p>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="interactive-card p-4">
                  <p className="font-medium text-blood-dark">{log.action}</p>
                  <p className="text-sm text-medical-gray">
                    {log.resource} | {new Date(log.createdAt).toLocaleString()}
                  </p>
                  {log.details && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-medical-gray">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
