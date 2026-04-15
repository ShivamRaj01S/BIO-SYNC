import { useState, useEffect } from 'react';
import api from '../../api/client.js';

export default function HospitalDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPhone: '',
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/hospital/profile').then(({ data }) => {
      if (data.profile) {
        setProfile(data.profile);
        setForm({
          hospitalName: data.profile.hospitalName || '',
          registrationNumber: data.profile.registrationNumber || '',
          address: data.profile.address || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          pincode: data.profile.pincode || '',
          contactPhone: data.profile.contactPhone || '',
        });
      }
    }).catch(() => {});
    api.get('/hospital/requests').then(({ data }) => setRequests(data.requests || [])).catch(() => {});
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/hospital/profile', form);
      setProfile(data.profile);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const completeRequest = async (requestId, success, reason) => {
    try {
      await api.patch(`/hospital/requests/${requestId}/complete`, { success, reason: reason || '' });
      setRequests((prev) => prev.map((r) => (r._id === requestId ? { ...r, status: success ? 'completed' : 'failed' } : r)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-blood-dark mb-6">Hospital Dashboard</h1>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}
        >
          Profile & verification
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}
        >
          Requests
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="card mb-6">
          {profile && (
            <p className="mb-4">
              Verification: <span className={profile.verificationStatus === 'verified' ? 'text-green-600 font-medium' : 'text-amber-600'}>{profile.verificationStatus}</span>
            </p>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Hospital name</label>
              <input
                type="text"
                value={form.hospitalName}
                onChange={(e) => setForm((f) => ({ ...f, hospitalName: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Registration number</label>
              <input
                type="text"
                value={form.registrationNumber}
                onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">Contact phone</label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>Save profile</button>
          </form>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-medical-gray">No requests for your hospital yet.</p>
          ) : (
            requests.map((r) => (
              <div key={r._id} className="card">
                <p className="font-medium">{r.bloodGroup} — {r.type} — {r.urgency}</p>
                <p className="text-sm text-medical-gray">Patient: {r.patient?.name} · Status: {r.status}</p>
                {r.status === 'donor_accepted' && profile?.verificationStatus === 'verified' && (
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => completeRequest(r._id, true)} className="btn-primary text-sm">Mark completed</button>
                    <button type="button" onClick={() => completeRequest(r._id, false)} className="btn-secondary text-sm">Mark failed</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
