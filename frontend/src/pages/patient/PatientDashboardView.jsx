import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import GoogleMapPicker from '../../components/GoogleMapPicker.jsx';
import { getStoredClientLocation } from '../../utils/location.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['low', 'medium', 'critical'];

function renderStatusSteps(status) {
  const activeIndex = {
    pending: 1,
    matched: 2,
    completed: 3,
    cancelled: 3,
  }[status] || 1;

  return ['Request created', 'Donor search active', status === 'cancelled' ? 'Request closed' : 'Hospital outcome']
    .map((label, index) => ({
      label,
      active: index + 1 <= activeIndex,
    }));
}

export default function PatientDashboardView() {
  const [dashboard, setDashboard] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    hospitalId: '',
    bloodGroup: '',
    urgencyLevel: 'medium',
    requiredUnits: 1,
    address: '',
    notes: '',
    locationCoordinates: getStoredClientLocation(),
  });

  const loadDashboard = async () => {
    const { data } = await api.get('/patient/dashboard');
    setDashboard(data);
  };

  useEffect(() => {
    loadDashboard().catch(() => {});
    const interval = setInterval(() => loadDashboard().catch(() => {}), 20000);
    return () => clearInterval(interval);
  }, []);

  const submitRequest = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      await api.post('/patient/requests', form);
      setForm({
        hospitalId: '',
        bloodGroup: '',
        urgencyLevel: 'medium',
        requiredUnits: 1,
        address: '',
        notes: '',
        locationCoordinates: getStoredClientLocation(),
      });
      await loadDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to create blood request.');
    } finally {
      setCreating(false);
    }
  };

  if (!dashboard) {
    return (
      <div className="page-shell py-10">
        <p className="text-medical-gray">Loading patient dashboard...</p>
      </div>
    );
  }

  const hospitals = dashboard.hospitals || [];
  const requests = dashboard.requests || [];

  return (
    <div className="page-shell space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-blood-dark">Patient dashboard</h1>
            <p className="text-medical-gray">
              Patients can request blood only. Verified hospitals are required for fulfillment.
            </p>
          </div>
          <div className="rounded-xl bg-blood-pale px-4 py-3 text-sm text-blood-dark">
            Live tracking refreshes every 20 seconds.
          </div>
        </div>

        <form onSubmit={submitRequest} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-medical-gray mb-1">Verified hospital</label>
            <select
              value={form.hospitalId}
              onChange={(event) => setForm((current) => ({ ...current, hospitalId: event.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.hospitalName} - {hospital.city}
                </option>
              ))}
            </select>
          </div>
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
            <label className="block text-sm font-medium text-medical-gray mb-1">Urgency</label>
            <select
              value={form.urgencyLevel}
              onChange={(event) => setForm((current) => ({ ...current, urgencyLevel: event.target.value }))}
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
              value={form.requiredUnits}
              onChange={(event) =>
                setForm((current) => ({ ...current, requiredUnits: Number(event.target.value) || 1 }))
              }
              className="input-field"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-medical-gray mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              className="input-field"
              placeholder="Ward, city, landmark"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-medical-gray mb-1">Clinical notes</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Any urgency context or medical notes"
            />
          </div>
          <div className="md:col-span-2">
            <GoogleMapPicker
              title="Patient or pickup location"
              description="Choose the blood request location so nearby donors can be ranked correctly."
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
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Submitting...' : 'Create blood request'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-blood-dark">Live request tracking</h2>
        {requests.length === 0 ? (
          <div className="card">
            <p className="text-medical-gray">No active requests yet.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request._id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-blood-dark">
                    {request.bloodGroup} blood request - <span className="capitalize">{request.urgencyLevel}</span>
                  </p>
                  <p className="text-sm text-medical-gray">
                    Hospital: {request.hospitalId?.hospitalName} | Units: {request.requiredUnits}
                  </p>
                  <p className="text-sm text-medical-gray capitalize">
                    Status: {request.status}
                    {request.fraudReviewRequired ? ' | Pending security review' : ''}
                  </p>
                  {request.matchedDonorId && (
                    <p className="text-sm text-blood-red mt-1">
                      Matched donor: {request.matchedDonorId.name}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-blood-pale px-4 py-2 text-sm capitalize text-blood-dark">
                  {request.requiredType}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {renderStatusSteps(request.status).map((step) => (
                  <div
                    key={step.label}
                    className={`rounded-xl border px-4 py-3 text-sm ${step.active ? 'border-blood-red bg-blood-pale text-blood-dark' : 'border-gray-200 text-medical-gray'}`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
              {request.notes && <p className="text-sm text-medical-gray">Notes: {request.notes}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
