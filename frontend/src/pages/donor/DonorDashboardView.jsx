import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import GoogleMapPicker from '../../components/GoogleMapPicker.jsx';
import { getStoredClientLocation } from '../../utils/location.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ORGAN_OPTIONS = ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea'];
const AVAILABILITY_OPTIONS = ['available', 'busy', 'inactive'];

export default function DonorDashboardView() {
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('incoming');
  const [saving, setSaving] = useState(false);
  const [respondingId, setRespondingId] = useState('');
  const [form, setForm] = useState({
    bloodGroup: '',
    organPreferences: [],
    availabilityStatus: 'available',
    address: '',
    phone: '',
    locationCoordinates: getStoredClientLocation(),
  });

  const loadDashboard = async () => {
    const { data } = await api.get('/donor/dashboard');
    setDashboard(data);
    if (data.profile) {
      setForm({
        bloodGroup: data.profile.bloodGroup || '',
        organPreferences: data.profile.organPreferences || [],
        availabilityStatus: data.profile.availabilityStatus || 'available',
        address: data.profile.address || '',
        phone: data.profile.phone || '',
        locationCoordinates:
          data.profile.locationCoordinates?.coordinates || getStoredClientLocation(),
      });
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => {});
    const interval = setInterval(() => loadDashboard().catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleOrganPreference = (organ) => {
    setForm((current) => ({
      ...current,
      organPreferences: current.organPreferences.includes(organ)
        ? current.organPreferences.filter((item) => item !== organ)
        : [...current.organPreferences, organ],
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/donor/profile', form);
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save donor profile.');
    } finally {
      setSaving(false);
    }
  };

  const updateAvailability = async (availabilityStatus) => {
    try {
      await api.patch('/donor/availability', { availabilityStatus });
      setForm((current) => ({ ...current, availabilityStatus }));
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update availability.');
    }
  };

  const respondToMatch = async (matchId, action) => {
    setRespondingId(matchId);
    try {
      await api.post(`/donor/matches/${matchId}/respond`, { action });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to send your response.');
    } finally {
      setRespondingId('');
    }
  };

  if (!dashboard) {
    return (
      <div className="page-shell py-10">
        <p className="text-medical-gray">Loading donor command center...</p>
      </div>
    );
  }

  const profile = dashboard.profile;
  const incomingMatches = dashboard.incomingMatches || [];
  const history = dashboard.history || [];
  const notifications = dashboard.notifications || [];

  return (
    <div className="page-shell space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <p className="text-sm text-medical-gray">Trust score</p>
          <p className="text-3xl font-bold text-blood-red">{profile?.reliabilityScore ?? 100}</p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Blood group</p>
          <p className="text-3xl font-bold text-blood-dark">{profile?.bloodGroup || '--'}</p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Availability</p>
          <p className="text-xl font-semibold capitalize text-blood-dark">{form.availabilityStatus}</p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Successful donations</p>
          <p className="text-3xl font-bold text-blood-dark">{profile?.successfulDonations || 0}</p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-blood-dark">Donor dashboard</h1>
            <p className="text-medical-gray">Manage your profile, availability, and incoming requests.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateAvailability(option)}
                className={
                  form.availabilityStatus === option
                    ? 'btn-primary capitalize'
                    : 'btn-secondary capitalize'
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-medical-gray mb-1">Blood group</label>
            <select
              value={form.bloodGroup}
              onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-medical-gray mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="input-field"
              placeholder="Primary contact number"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-medical-gray mb-2">Organ preferences</label>
            <div className="flex flex-wrap gap-2">
              {ORGAN_OPTIONS.map((organ) => (
                <button
                  key={organ}
                  type="button"
                  onClick={() => toggleOrganPreference(organ)}
                  className={
                    form.organPreferences.includes(organ)
                      ? 'px-3 py-2 rounded-lg bg-blood-red text-white text-sm'
                      : 'px-3 py-2 rounded-lg bg-gray-100 text-medical-dark text-sm'
                  }
                >
                  {organ}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-medical-gray mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              className="input-field"
              placeholder="City, area, landmark"
            />
          </div>
          <div className="md:col-span-2">
            <GoogleMapPicker
              title="Donor service location"
              description="Choose the location that should be used for distance-based donor matching."
              value={form.locationCoordinates}
              address={form.address}
              onChange={(locationCoordinates) =>
                setForm((current) => ({ ...current, locationCoordinates }))
              }
              onAddressSelect={(address) =>
                setForm((current) => ({ ...current, address: address || current.address }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save donor profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={activeTab === 'incoming' ? 'btn-primary' : 'btn-secondary'}
          >
            Incoming requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}
          >
            Notifications
          </button>
        </div>

        {activeTab === 'incoming' && (
          <div className="space-y-4">
            {incomingMatches.length === 0 ? (
              <p className="text-medical-gray">No active emergency requests at the moment.</p>
            ) : (
              incomingMatches.map((match) => (
                <div key={match._id} className="interactive-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-blood-dark">
                        {match.request?.requiredType?.toUpperCase()} request for {match.request?.bloodGroup}
                      </p>
                      <p className="text-sm text-medical-gray">
                        Hospital: {match.request?.hospitalId?.hospitalName || 'Assigned hospital'}
                      </p>
                      <p className="text-sm text-medical-gray">
                        Urgency: <span className="capitalize">{match.request?.urgencyLevel}</span> | Distance:{' '}
                        {match.distanceKm} km | Match score: {Math.round(match.score)}
                      </p>
                      {match.request?.organType && (
                        <p className="text-sm text-medical-gray">Organ needed: {match.request.organType}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => respondToMatch(match._id, 'accept')}
                        className="btn-primary"
                        disabled={respondingId === match._id}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToMatch(match._id, 'decline')}
                        className="btn-secondary"
                        disabled={respondingId === match._id}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-medical-gray">No donor decision history yet.</p>
            ) : (
              history.map((entry) => (
                <div key={entry._id} className="interactive-card">
                  <p className="font-semibold text-blood-dark">
                    {entry.request?.requiredType?.toUpperCase()} request for {entry.request?.bloodGroup}
                  </p>
                  <p className="text-sm text-medical-gray">
                    Match status: <span className="capitalize">{entry.status}</span> | Request status:{' '}
                    <span className="capitalize">{entry.request?.status}</span>
                  </p>
                  <p className="text-sm text-medical-gray">
                    Hospital: {entry.request?.hospitalId?.hospitalName || 'Assigned hospital'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-medical-gray">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification._id} className="interactive-card p-4">
                  <p className="font-medium text-blood-dark">{notification.title}</p>
                  <p className="text-sm text-medical-gray mt-1">{notification.body}</p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
