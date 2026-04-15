import 'dotenv/config';

import assert from 'node:assert/strict';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

import axios from 'axios';
import mongoose from 'mongoose';

import app from '../app.js';
import { connectDB } from '../config/db.js';
import AuditLog from '../models/AuditLog.js';
import DonorProfile from '../models/DonorProfile.js';
import HospitalProfile from '../models/HospitalProfile.js';
import Match from '../models/Match.js';
import Notification from '../models/Notification.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

const KEEP_DATA = ['1', 'true', 'yes'].includes(String(process.env.E2E_KEEP_DATA || '').toLowerCase());

function buildPoint(longitude, latitude) {
  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
}

function buildHttpClient(baseURL, token) {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function apiCall(client, config, label) {
  try {
    return await client(config);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      throw new Error(`${label} failed (${status}): ${JSON.stringify(data)}`);
    }

    throw new Error(`${label} failed: ${error.message}`);
  }
}

async function startServer() {
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve local test server address.');
  }

  return {
    server,
    baseURL: `http://127.0.0.1:${address.port}/api`,
  };
}

async function stopServer(server) {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function waitFor(condition, { timeoutMs = 5000, intervalMs = 100, description = 'condition' } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await condition();
    if (result) {
      return result;
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out while waiting for ${description}.`);
}

async function createSimulatedUser({ email, name, role, verified = false, availabilityStatus = 'inactive' }) {
  const user = await User.create({
    email,
    name,
    role,
    status: 'active',
    verified,
    availabilityStatus,
  });

  const token = signToken({ id: user._id, role: user.role });
  return { user, token };
}

function logSection(title) {
  console.log(`\n${title}`);
}

function logDetail(message) {
  console.log(`  - ${message}`);
}

async function cleanupArtifacts({ userIds, requestIds, hospitalProfileIds }) {
  if (KEEP_DATA) {
    console.log('\nKeeping E2E artifacts because E2E_KEEP_DATA is enabled.');
    return;
  }

  await Notification.deleteMany({ user: { $in: userIds } });
  await Match.deleteMany({
    $or: [{ request: { $in: requestIds } }, { donor: { $in: userIds } }],
  });
  await Request.deleteMany({ _id: { $in: requestIds } });
  await DonorProfile.deleteMany({ user: { $in: userIds } });
  await HospitalProfile.deleteMany({
    $or: [{ _id: { $in: hospitalProfileIds } }, { user: { $in: userIds } }],
  });
  await AuditLog.deleteMany({
    $or: [
      { user: { $in: userIds } },
      { resourceId: { $in: [...userIds, ...requestIds, ...hospitalProfileIds] } },
      { 'details.hospitalUserId': { $in: userIds } },
    ],
  });
  await User.deleteMany({ _id: { $in: userIds } });
}

async function main() {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const artifacts = {
    userIds: [],
    requestIds: [],
    hospitalProfileIds: [],
  };

  let server;

  try {
    console.log(`Running automated E2E flow simulation: ${runId}`);

    await connectDB();
    const serverState = await startServer();
    server = serverState.server;

    const adminAccount = await createSimulatedUser({
      email: `e2e-admin-${runId}@example.com`,
      name: 'E2E Admin',
      role: 'admin',
      verified: true,
    });
    const hospitalAccount = await createSimulatedUser({
      email: `e2e-hospital-${runId}@example.com`,
      name: 'E2E Hospital',
      role: 'hospital',
    });
    const donorAccount = await createSimulatedUser({
      email: `e2e-donor-${runId}@example.com`,
      name: 'E2E Donor',
      role: 'donor',
    });
    const patientAccount = await createSimulatedUser({
      email: `e2e-patient-${runId}@example.com`,
      name: 'E2E Patient',
      role: 'patient',
    });

    artifacts.userIds.push(
      adminAccount.user._id,
      hospitalAccount.user._id,
      donorAccount.user._id,
      patientAccount.user._id
    );

    const adminApi = buildHttpClient(serverState.baseURL, adminAccount.token);
    const hospitalApi = buildHttpClient(serverState.baseURL, hospitalAccount.token);
    const donorApi = buildHttpClient(serverState.baseURL, donorAccount.token);
    const patientApi = buildHttpClient(serverState.baseURL, patientAccount.token);

    const hospitalPoint = buildPoint(88.3639, 22.5726);
    const donorPoint = buildPoint(88.3615, 22.5709);
    const patientPoint = buildPoint(88.3651, 22.5738);

    logSection('1. First hospital login before profile setup');
    const initialHospitalDashboardResponse = await apiCall(
      hospitalApi,
      {
        method: 'get',
        url: '/hospital/dashboard',
      },
      'Initial hospital dashboard fetch'
    );

    assert.equal(initialHospitalDashboardResponse.status, 200);
    assert.equal(initialHospitalDashboardResponse.data.profile, null);
    assert.equal(initialHospitalDashboardResponse.data.requiresProfileSetup, true);
    assert.deepEqual(initialHospitalDashboardResponse.data.requests, []);

    logDetail('Fresh hospital account can open the dashboard without a pre-existing profile');
    logDetail('Dashboard indicates that profile setup is required before verification');

    logSection('2. Hospital registration and admin verification');
    const hospitalProfileResponse = await apiCall(
      hospitalApi,
      {
        method: 'put',
        url: '/hospital/profile',
        data: {
          hospitalName: `E2E Care Hospital ${runId}`,
          registrationNumber: `REG-${runId}`,
          address: '12 Care Street, Kolkata',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '700001',
          contactPhone: '9000000001',
          locationCoordinates: hospitalPoint,
          documents: [
            {
              type: 'license',
              url: `https://example.com/e2e-license-${runId}.pdf`,
            },
          ],
        },
      },
      'Hospital profile registration'
    );

    assert.equal(hospitalProfileResponse.status, 200);
    assert.equal(hospitalProfileResponse.data.profile.verificationStatus, 'pending');

    const hospitalProfileId = hospitalProfileResponse.data.profile._id;
    artifacts.hospitalProfileIds.push(hospitalProfileId);

    logDetail(`Hospital profile created with id ${hospitalProfileId}`);
    logDetail('Verification state is pending before admin review');

    const hospitalVerificationResponse = await apiCall(
      adminApi,
      {
        method: 'patch',
        url: `/admin/hospitals/${hospitalProfileId}/verify`,
        data: { approved: true },
      },
      'Hospital verification'
    );

    assert.equal(hospitalVerificationResponse.status, 200);
    assert.equal(hospitalVerificationResponse.data.profile.verificationStatus, 'verified');

    const verifiedHospitalUser = await User.findById(hospitalAccount.user._id).lean();
    assert.equal(Boolean(verifiedHospitalUser?.verified), true);

    logDetail(`Hospital verified by admin; hospital user verified=${verifiedHospitalUser.verified}`);

    logSection('3. Donor registration, profile setup, and availability toggle');
    const donorProfileResponse = await apiCall(
      donorApi,
      {
        method: 'put',
        url: '/donor/profile',
        data: {
          bloodGroup: 'O-',
          organPreferences: ['Kidney'],
          availabilityStatus: 'busy',
          address: '45 Donor Avenue, Kolkata',
          phone: '9000000002',
          locationCoordinates: donorPoint,
        },
      },
      'Donor profile update'
    );

    assert.equal(donorProfileResponse.status, 200);
    assert.equal(donorProfileResponse.data.profile.bloodGroup, 'O-');
    assert.equal(donorProfileResponse.data.profile.availabilityStatus, 'busy');

    const donorAvailabilityResponse = await apiCall(
      donorApi,
      {
        method: 'patch',
        url: '/donor/availability',
        data: { availabilityStatus: 'available' },
      },
      'Donor availability update'
    );

    assert.equal(donorAvailabilityResponse.status, 200);
    assert.equal(donorAvailabilityResponse.data.availabilityStatus, 'available');

    logDetail(`Donor profile stored with blood group ${donorProfileResponse.data.profile.bloodGroup}`);
    logDetail(`Donor availability toggled to ${donorAvailabilityResponse.data.availabilityStatus}`);

    logSection('4. Patient creates an urgent blood request with the verified hospital');
    const patientRequestResponse = await apiCall(
      patientApi,
      {
        method: 'post',
        url: '/patient/requests',
        data: {
          hospitalId: hospitalProfileId,
          bloodGroup: 'O-',
          urgencyLevel: 'critical',
          locationCoordinates: patientPoint,
          address: '99 Emergency Lane, Kolkata',
          notes: 'Automated E2E simulation request',
          requiredUnits: 1,
        },
      },
      'Patient request creation'
    );

    assert.equal(patientRequestResponse.status, 201);
    const requestId = patientRequestResponse.data.request._id;
    artifacts.requestIds.push(requestId);

    logDetail(`Patient request created with id ${requestId}`);

    logSection('5. Smart matching is triggered for the patient request');
    const requestRecord = await waitFor(
      async () => {
        const request = await Request.findById(requestId).lean();
        return request?.lastNotifiedAt ? request : null;
      },
      { description: 'request notification timestamp' }
    );

    assert.equal(requestRecord.status, 'pending');
    assert.equal(String(requestRecord.hospitalId), String(hospitalProfileId));

    const matchRecord = await waitFor(
      async () =>
        Match.findOne({
          request: requestId,
          donor: donorAccount.user._id,
          status: 'notified',
        }).lean(),
      { description: 'notified donor match' }
    );

    assert.ok(matchRecord);
    logDetail(`Matching created a notified donor match ${matchRecord._id}`);
    logDetail(`Match score: ${matchRecord.score}, rank: ${matchRecord.rank}`);

    logSection('6. Notification verification for the shortlisted donor');
    const donorDashboardResponse = await apiCall(
      donorApi,
      {
        method: 'get',
        url: '/donor/dashboard',
      },
      'Donor dashboard fetch'
    );

    assert.equal(donorDashboardResponse.status, 200);

    const dashboardMatch = donorDashboardResponse.data.incomingMatches.find(
      (entry) => String(entry.request?._id) === String(requestId)
    );
    assert.ok(dashboardMatch, 'Expected the donor dashboard to list the notified request.');

    const hospitalRequestDetailsResponse = await apiCall(
      hospitalApi,
      {
        method: 'get',
        url: `/hospital/requests/${requestId}`,
      },
      'Hospital request details fetch'
    );

    assert.equal(hospitalRequestDetailsResponse.status, 200);

    const hospitalMatch = hospitalRequestDetailsResponse.data.matches.find(
      (entry) => String(entry.donor?._id) === String(donorAccount.user._id)
    );
    assert.ok(hospitalMatch, 'Expected the hospital request details to include the matched donor.');

    const notificationRecord = await waitFor(
      async () => {
        const notification = await Notification.findOne({
          user: donorAccount.user._id,
          type: 'donor_shortlisted',
        })
          .sort({ createdAt: -1 })
          .lean();

        return notification && String(notification.data?.requestId) === String(requestId)
          ? notification
          : null;
      },
      { description: 'donor notification record' }
    );

    assert.ok(notificationRecord);

    const dashboardNotification = donorDashboardResponse.data.notifications.find(
      (entry) =>
        entry.type === 'donor_shortlisted' && String(entry.data?.requestId) === String(requestId)
    );
    assert.ok(
      dashboardNotification,
      'Expected the donor dashboard to expose the shortlist notification.'
    );

    logDetail(`Donor dashboard shows the pending request match for donor ${donorAccount.user._id}`);
    logDetail(`Hospital request details include donor ${hospitalMatch.donor._id} in the notified list`);
    logDetail(`Notification record ${notificationRecord._id} confirms the shortlist event fired`);

    const summary = {
      runId,
      hospitalProfileId,
      donorUserId: String(donorAccount.user._id),
      patientRequestId: requestId,
      matchId: String(matchRecord._id),
      notificationId: String(notificationRecord._id),
      requestStatus: requestRecord.status,
      matchStatus: matchRecord.status,
    };

    console.log('\nSimulation completed successfully.');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    try {
      await cleanupArtifacts(artifacts);
    } finally {
      await stopServer(server);
      await mongoose.disconnect();
    }
  }
}

main().catch((error) => {
  console.error('\nE2E flow simulation failed.');
  console.error(error);
  process.exit(1);
});
