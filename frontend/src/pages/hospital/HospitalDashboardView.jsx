import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import GoogleMapPicker from '../../components/GoogleMapPicker.jsx';
import { getStoredClientLocation } from '../../utils/location.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['low', 'medium', 'critical'];

function documentsToText(documents) {
  return (documents || []).map((doc) => doc.url).filter(Boolean).join('\n');
}

function textToDocuments(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url) => ({ type: 'document', url }));
}

export default function HospitalDashboardView() {
  const [dashboard, setDashboard] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [completingId, setCompletingId] = useState('');
  const [profileForm, setProfileForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPhone: '',
    documentsText: '',
    locationCoordinates: getStoredClientLocation(),
  });
  const [requestForm, setRequestForm] = useState({
    bloodGroup: '',
    organType: '',
    urgencyLevel: 'critical',
    requiredUnits: 1,
    address: '',
    notes: '',
    locationCoordinates: getStoredClientLocation(),
  });

  const loadDashboard = async () => {
    const { data } = await api.get('/hospital/dashboard');
    setDashboard(data);
    setLoadError('');

    const profile = data.profile;
    if (profile) {
      setProfileForm({
        hospitalName: profile.hospitalName || '',
        registrationNumber: profile.registrationNumber || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        contactPhone: profile.contactPhone || '',
        documentsText: documentsToText(profile.documents),
        locationCoordinates:
          profile.location?.coordinates ||
          data.user?.locationCoordinates?.coordinates ||
          getStoredClientLocation(),
      });
    }

    return data;
  };

  useEffect(() => {
    let active = true;

    loadDashboard()
      .catch((error) => {
        if (active) {
          setLoadError(error.response?.data?.message || 'Failed to load hospital workspace.');
        }
      })
      .finally(() => {
        if (active) {
          setInitializing(false);
        }
      });

    const interval = setInterval(() => {
      loadDashboard().catch((error) => {
        if (active) {
          setLoadError(error.response?.data?.message || 'Failed to refresh hospital workspace.');
        }
      });
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const isVerified = useMemo(() => Boolean(dashboard?.user?.verified), [dashboard]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/hospital/profile', {
        ...profileForm,
        documents: textToDocuments(profileForm.documentsText),
      });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save hospital profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const createOrganRequest = async (event) => {
    event.preventDefault();
    setCreatingRequest(true);
    try {
      await api.post('/hospital/requests', requestForm);
      setRequestForm({
        bloodGroup: '',
        organType: '',
        urgencyLevel: 'critical',
        requiredUnits: 1,
        address: '',
        notes: '',
        locationCoordinates: getStoredClientLocation(),
      });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create organ request.');
    } finally {
      setCreatingRequest(false);
    }
  };

  const confirmCompletion = async (requestId, success, outcome = null) => {
    setCompletingId(requestId);
    try {
      await api.patch(`/hospital/requests/${requestId}/complete`, {
        success,
        outcome,
        reason:
          success
            ? ''
            : outcome === 'no_show'
              ? 'Matched donor marked as no-show by hospital.'
              : outcome === 'late_cancellation'
                ? 'Matched donor cancelled late.'
                : 'Hospital could not complete the request.',
      });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update request outcome.');
    } finally {
      setCompletingId('');
    }
  };

  if (initializing) {
    return (
      <div className="page-shell py-10">
        <p className="text-medical-gray">Loading hospital workspace...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page-shell py-10">
        <div className="card space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-blood-dark">Hospital workspace unavailable</h1>
            <p className="text-medical-gray mt-2">
              {loadError || 'We could not load your hospital dashboard right now.'}
            </p>
          </div>
          <button type="button" onClick={() => loadDashboard().catch(() => {})} className="btn-primary w-fit">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const requests = dashboard.requests || [];

  return (
    <div className="page-shell space-y-6">
      {dashboard.requiresProfileSetup && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-blood-dark">Complete your hospital profile</h2>
          <p className="text-sm text-medical-gray mt-1">
            Your account was created, but your hospital verification profile is still empty. Fill out the
            form below so admin can review and approve your hospital.
          </p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-medical-gray">Verification status</p>
          <p className={`text-2xl font-bold ${isVerified ? 'text-green-600' : 'text-amber-600'}`}>
            {dashboard.profile?.verificationStatus || 'pending'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Open requests</p>
          <p className="text-3xl font-bold text-blood-dark">
            {requests.filter((entry) => entry.request.status === 'pending').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-medical-gray">Matched requests</p>
          <p className="text-3xl font-bold text-blood-red">
            {requests.filter((entry) => entry.request.status === 'matched').length}
          </p>
        </div>
      </section>

      <section className="card">
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}
          >
            Verification workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}
          >
            Organ requests
          </button>
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-xl bg-blood-pale/70 px-4 py-3 text-sm text-blood-dark">
              Verified hospitals can create organ requests and confirm donation completion. Submit accurate
              registration details and documents for admin review.
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Hospital name</label>
              <input
                type="text"
                value={profileForm.hospitalName}
                onChange={(event) => setProfileForm((current) => ({ ...current, hospitalName: event.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Registration number</label>
              <input
                type="text"
                value={profileForm.registrationNumber}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, registrationNumber: event.target.value }))
                }
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-medical-gray mb-1">Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">City</label>
              <input
                type="text"
                value={profileForm.city}
                onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">State</label>
              <input
                type="text"
                value={profileForm.state}
                onChange={(event) => setProfileForm((current) => ({ ...current, state: event.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Pincode</label>
              <input
                type="text"
                value={profileForm.pincode}
                onChange={(event) => setProfileForm((current) => ({ ...current, pincode: event.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Contact phone</label>
              <input
                type="text"
                value={profileForm.contactPhone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, contactPhone: event.target.value }))
                }
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-medical-gray mb-1">Verification documents</label>
              <textarea
                value={profileForm.documentsText}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, documentsText: event.target.value }))
                }
                className="input-field"
                rows={4}
                placeholder="One document URL per line"
              />
            </div>
            <div className="md:col-span-2">
              <GoogleMapPicker
                title="Hospital verification location"
                description="Pin the verified hospital campus or branch that should be used for matching and audit checks."
                value={profileForm.locationCoordinates}
                address={profileForm.address}
                onChange={(locationCoordinates) =>
                  setProfileForm((current) => ({ ...current, locationCoordinates }))
                }
                onAddressSelect={(address) =>
                  setProfileForm((current) => ({ ...current, address: address || current.address }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save verification profile'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            <form onSubmit={createOrganRequest} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-medical-gray">
                {!dashboard.profile
                  ? 'Complete your hospital profile first. After admin verification, you can create organ donation requests here.'
                  : 'Only verified hospitals can create organ donation requests. Patients remain limited to blood requests.'}
              </div>
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">Blood group</label>
                <select
                  value={requestForm.bloodGroup}
                  onChange={(event) => setRequestForm((current) => ({ ...current, bloodGroup: event.target.value }))}
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
                <label className="block text-sm font-medium text-medical-gray mb-1">Organ type</label>
                <input
                  type="text"
                  value={requestForm.organType}
                  onChange={(event) => setRequestForm((current) => ({ ...current, organType: event.target.value }))}
                  className="input-field"
                  placeholder="Kidney, Liver, Heart..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">Urgency</label>
                <select
                  value={requestForm.urgencyLevel}
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, urgencyLevel: event.target.value }))
                  }
                  className="input-field"
                >
                  {URGENCY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">Units required</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={requestForm.requiredUnits}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      requiredUnits: Number(event.target.value) || 1,
                    }))
                  }
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-medical-gray mb-1">Address</label>
                <input
                  type="text"
                  value={requestForm.address}
                  onChange={(event) => setRequestForm((current) => ({ ...current, address: event.target.value }))}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-medical-gray mb-1">Notes</label>
                <textarea
                  value={requestForm.notes}
                  onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <GoogleMapPicker
                  title="Request pickup or treatment location"
                  description="Set the organ request location that should drive donor distance scoring."
                  value={requestForm.locationCoordinates}
                  address={requestForm.address}
                  onChange={(locationCoordinates) =>
                    setRequestForm((current) => ({ ...current, locationCoordinates }))
                  }
                  onAddressSelect={(address) =>
                    setRequestForm((current) => ({ ...current, address: address || current.address }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="btn-primary" disabled={creatingRequest || !isVerified}>
                  {creatingRequest ? 'Creating...' : 'Create organ request'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="interactive-card">
                  <p className="text-medical-gray">No hospital requests yet.</p>
                </div>
              ) : (
                requests.map((entry) => (
                  <div key={entry.request._id} className="interactive-card space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-blood-dark">
                          {entry.request.organType || entry.request.requiredType} request for {entry.request.bloodGroup}
                        </p>
                        <p className="text-sm text-medical-gray capitalize">
                          Status: {entry.request.status} | Urgency: {entry.request.urgencyLevel}
                        </p>
                        {entry.request.matchedDonorId && (
                          <p className="text-sm text-blood-red mt-1">
                            Accepted donor: {entry.request.matchedDonorId.name}
                          </p>
                        )}
                      </div>
                      {entry.request.status === 'matched' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => confirmCompletion(entry.request._id, true)}
                            className="btn-primary"
                            disabled={completingId === entry.request._id}
                          >
                            Confirm donation completion
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmCompletion(entry.request._id, false, 'no_show')}
                            className="btn-secondary"
                            disabled={completingId === entry.request._id}
                          >
                            Mark donor no-show
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmCompletion(entry.request._id, false, 'late_cancellation')}
                            className="btn-secondary"
                            disabled={completingId === entry.request._id}
                          >
                            Mark late cancellation
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-blood-dark mb-2">Matched donor list</p>
                      <div className="space-y-2">
                        {entry.matches.length === 0 ? (
                          <p className="text-sm text-medical-gray">No donor ranking generated yet.</p>
                        ) : (
                          entry.matches.map((match) => (
                            <div
                              key={match._id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <div>
                                <p className="font-medium text-blood-dark">{match.donor?.name || 'Donor'}</p>
                                <p className="text-sm text-medical-gray">
                                  Score: {Math.round(match.score)} | Distance: {match.distanceKm} km | Status:{' '}
                                  <span className="capitalize">{match.status}</span>
                                </p>
                              </div>
                              <div className="text-sm text-medical-gray">
                                Trust score: {match.donor?.reliabilityScore ?? '--'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
