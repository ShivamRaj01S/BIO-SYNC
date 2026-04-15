import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function DonorDashboard() {
  const { user, profile, setProfileData } = useAuth();
  const [profileForm, setProfileForm] = useState({ bloodGroup: '', organConsent: false, address: '', coordinates: [77.2, 28.6] });
  const [availability, setAvailability] = useState('AVAILABLE');
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/donor/profile').then(({ data }) => {
      if (data.profile) {
        setProfileData(data.profile);
        setProfileForm({
          bloodGroup: data.profile.bloodGroup,
          organConsent: data.profile.organConsent || false,
          address: data.profile.address || '',
          coordinates: data.profile.location?.coordinates || [77.2, 28.6],
        });
        setAvailability(data.profile.availability || 'AVAILABLE');
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== 'donor') return;
    api.get('/donor/requests').then(({ data }) => setRequests(data.requests || [])).catch(() => {});
    api.get('/donor/history').then(({ data }) => setHistory(data.history || [])).catch(() => {});
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/donor/profile', {
        bloodGroup: profileForm.bloodGroup,
        organConsent: profileForm.organConsent,
        address: profileForm.address,
        location: { coordinates: profileForm.coordinates },
      });
      setProfileData(data.profile);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setAvail = async (val) => {
    try {
      await api.patch('/donor/availability', { availability: val });
      setAvailability(val);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const respond = async (matchId, action) => {
    try {
      await api.post(`/donor/requests/${matchId}/respond`, { action });
      setRequests((prev) => prev.filter((r) => r._id !== matchId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  if (loading && !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-medical-gray">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-blood-dark mb-6">Donor Dashboard</h1>

      {!profile ? (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-blood-red mb-4">Complete your profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Blood group</label>
              <select
                value={profileForm.bloodGroup}
                onChange={(e) => setProfileForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="organ"
                checked={profileForm.organConsent}
                onChange={(e) => setProfileForm((p) => ({ ...p, organConsent: e.target.checked }))}
              />
              <label htmlFor="organ">Organ donation consent</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Address (optional)</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                className="input-field"
                placeholder="City, area"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>Save profile</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card mb-6 flex flex-wrap items-center gap-4">
            <div>
              <span className="text-medical-gray block text-sm">Availability</span>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setAvail('AVAILABLE')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${availability === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setAvail('BUSY')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${availability === 'BUSY' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  Busy
                </button>
              </div>
            </div>
            <div>
              <span className="text-medical-gray block text-sm">Blood group</span>
              <span className="font-medium text-blood-red">{profile.bloodGroup}</span>
            </div>
            <div>
              <span className="text-medical-gray block text-sm">Reliability score</span>
              <span className="font-medium">{profile.reliabilityScore ?? 100}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}
            >
              Incoming requests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
            >
              Donation history
            </button>
          </div>

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-medical-gray">No pending requests.</p>
              ) : (
                requests.map((m) => (
                  <div key={m._id} className="card flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <p className="font-medium">Request — {m.request?.urgency} urgency, {m.request?.bloodGroup}</p>
                      <p className="text-sm text-medical-gray">Hospital: {m.request?.hospital?.hospitalName}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => respond(m._id, 'accept')} className="btn-primary text-sm">Accept</button>
                      <button type="button" onClick={() => respond(m._id, 'reject')} className="btn-secondary text-sm">Decline</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-medical-gray">No donation history yet.</p>
              ) : (
                history.map((h) => (
                  <div key={h.match?._id} className="card">
                    <p className="font-medium">{h.request?.bloodGroup} — {h.status}</p>
                    <p className="text-sm text-medical-gray">{h.request?.hospital?.hospitalName}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
