import { useState, useEffect } from 'react';
import api from '../../api/client.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY = ['low', 'medium', 'high', 'critical'];

export default function PatientDashboard() {
  const [requests, setRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    hospitalId: '',
    type: 'blood',
    bloodGroup: '',
    organType: '',
    urgency: 'medium',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/patient/requests').then(({ data }) => setRequests(data.requests || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/patient/hospitals').then(({ data }) => setHospitals(data.hospitals || [])).catch(() => setHospitals([]));
  }, []);

  const createRequest = async (e) => {
    e.preventDefault();
    if (!form.hospitalId || !form.bloodGroup || !form.urgency) {
      alert('Please fill hospital, blood group, and urgency.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/patient/requests', {
        hospitalId: form.hospitalId,
        type: form.type,
        bloodGroup: form.bloodGroup,
        organType: form.type === 'organ' ? form.organType : undefined,
        urgency: form.urgency,
        address: form.address,
        notes: form.notes,
      });
      setShowForm(false);
      setForm({ hospitalId: '', type: 'blood', bloodGroup: '', organType: '', urgency: 'medium', address: '', notes: '' });
      const { data } = await api.get('/patient/requests');
      setRequests(data.requests || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-blood-dark mb-6">Patient Dashboard</h1>
      <button type="button" onClick={() => setShowForm(true)} className="btn-primary mb-6">Create donation request</button>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-blood-red mb-4">New request</h2>
          <form onSubmit={createRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Hospital (verified)</label>
              <select
                value={form.hospitalId}
                onChange={(e) => setForm((f) => ({ ...f, hospitalId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select hospital</option>
                {hospitals.map((h) => (
                  <option key={h._id} value={h._id}>{h.hospitalName} — {h.city}</option>
                ))}
              </select>
              {hospitals.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">No verified hospitals yet. Admin must verify hospitals first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="input-field"
              >
                <option value="blood">Blood</option>
                <option value="organ">Organ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Blood group</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            {form.type === 'organ' && (
              <div>
                <label className="block text-sm font-medium text-medical-gray mb-1">Organ type (optional)</label>
                <input
                  type="text"
                  value={form.organType}
                  onChange={(e) => setForm((f) => ({ ...f, organType: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Kidney"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
                className="input-field"
              >
                {URGENCY.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Address / location (optional)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-medical-gray mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={loading}>Submit request</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <h2 className="text-lg font-semibold text-blood-dark mb-4">Your requests</h2>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-medical-gray">No requests yet.</p>
        ) : (
          requests.map((r) => (
            <div key={r._id} className="card">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <p className="font-medium">{r.bloodGroup} — {r.type} — {r.urgency}</p>
                  <p className="text-sm text-medical-gray">{r.hospital?.hospitalName}</p>
                  <p className="text-sm mt-1">
                    Status: <span className={r.status === 'completed' ? 'text-green-600' : r.status === 'donor_accepted' ? 'text-blood-red' : 'text-gray-600'}>{r.status}</span>
                  </p>
                  {r.acceptedDonor && <p className="text-sm text-blood-red">Donor: {r.acceptedDonor.name}</p>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
