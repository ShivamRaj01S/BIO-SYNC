import DonorProfile from '../models/DonorProfile.js';
import HospitalProfile from '../models/HospitalProfile.js';
import User from '../models/User.js';
import { normalizePoint } from '../utils/geo.js';

const DEFAULT_ORGAN_OPTIONS = ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea'];

function mapAvailabilityToLegacy(availabilityStatus) {
  return availabilityStatus === 'available' ? 'AVAILABLE' : 'BUSY';
}

function mapAvailabilityFromLegacy(availability) {
  return availability === 'AVAILABLE' ? 'available' : 'busy';
}

export async function hydrateUserWithLegacyProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return { user: null, profile: null };
  }

  let profile = null;
  let changed = false;

  if (user.role === 'donor') {
    profile = await DonorProfile.findOne({ user: user._id });
    if (profile) {
      if (!user.bloodGroup && profile.bloodGroup) {
        user.bloodGroup = profile.bloodGroup;
        changed = true;
      }
      if ((!user.organPreferences || !user.organPreferences.length) && profile.organConsent) {
        user.organPreferences = DEFAULT_ORGAN_OPTIONS;
        changed = true;
      }
      if (!user.locationCoordinates?.coordinates?.length && profile.location?.coordinates?.length) {
        user.locationCoordinates = profile.location;
        changed = true;
      }
      if (!user.address && profile.address) {
        user.address = profile.address;
        changed = true;
      }
      if (user.availabilityStatus === 'available' && profile.availability) {
        user.availabilityStatus = mapAvailabilityFromLegacy(profile.availability);
        changed = true;
      }
      if (!user.lastDonationDate && profile.lastDonationDate) {
        user.lastDonationDate = profile.lastDonationDate;
        changed = true;
      }
      if ((user.reliabilityScore ?? 100) === 100 && profile.reliabilityScore != null) {
        user.reliabilityScore = profile.reliabilityScore;
        changed = true;
      }
    }
  }

  if (user.role === 'hospital') {
    profile = await HospitalProfile.findOne({ user: user._id }).populate(
      'user',
      'name email verified role'
    );
    if (profile) {
      if (!user.address && profile.address) {
        user.address = profile.address;
        changed = true;
      }
      if (!user.locationCoordinates?.coordinates?.length && profile.location?.coordinates?.length) {
        user.locationCoordinates = profile.location;
        changed = true;
      }
      const shouldBeVerified = profile.verificationStatus === 'verified';
      if (user.verified !== shouldBeVerified) {
        user.verified = shouldBeVerified;
        changed = true;
      }
      if (!user.phone && profile.contactPhone) {
        user.phone = profile.contactPhone;
        changed = true;
      }
    }
  }

  if (changed) {
    await user.save();
  }

  return { user, profile };
}

export async function saveDonorProfile(userId, payload) {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  user.bloodGroup = payload.bloodGroup;
  user.organPreferences = Array.isArray(payload.organPreferences) ? payload.organPreferences : [];
  user.availabilityStatus = payload.availabilityStatus || user.availabilityStatus || 'available';
  user.address = payload.address || '';
  if (payload.phone !== undefined) {
    user.phone = payload.phone || '';
  }

  const point = normalizePoint(payload.locationCoordinates);
  if (point) {
    user.locationCoordinates = point;
  }

  await user.save();

  const donorProfile = await DonorProfile.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        bloodGroup: user.bloodGroup,
        organConsent: user.organPreferences.length > 0,
        location: user.locationCoordinates,
        address: user.address,
        availability: mapAvailabilityToLegacy(user.availabilityStatus),
        reliabilityScore: user.reliabilityScore,
        lastDonationDate: user.lastDonationDate,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return { user, profile: donorProfile };
}

export async function saveHospitalProfile(userId, payload) {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  user.address = payload.address || '';
  user.phone = payload.contactPhone || payload.phone || '';

  const point = normalizePoint(payload.locationCoordinates);
  if (point) {
    user.locationCoordinates = point;
  }

  await user.save();

  const hospitalProfile = await HospitalProfile.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        hospitalName: payload.hospitalName,
        registrationNumber: payload.registrationNumber || '',
        address: payload.address,
        city: payload.city,
        state: payload.state || '',
        pincode: payload.pincode || '',
        contactPhone: payload.contactPhone || '',
        documents: Array.isArray(payload.documents) ? payload.documents : [],
        location: point || user.locationCoordinates || undefined,
      },
    },
    { new: true, upsert: true, runValidators: true }
  ).populate('user', 'name email verified role');

  return { user, profile: hospitalProfile };
}

export async function syncLegacyProfiles() {
  const donors = await DonorProfile.find().select(
    'user bloodGroup organConsent location address availability reliabilityScore lastDonationDate'
  );

  for (const profile of donors) {
    const user = await User.findById(profile.user);
    if (!user) {
      continue;
    }
    user.bloodGroup = user.bloodGroup || profile.bloodGroup;
    user.organPreferences =
      user.organPreferences?.length ? user.organPreferences : profile.organConsent ? DEFAULT_ORGAN_OPTIONS : [];
    user.locationCoordinates =
      user.locationCoordinates?.coordinates?.length ? user.locationCoordinates : profile.location;
    user.address = user.address || profile.address || '';
    user.availabilityStatus =
      user.availabilityStatus || mapAvailabilityFromLegacy(profile.availability);
    user.reliabilityScore = user.reliabilityScore ?? profile.reliabilityScore ?? 100;
    user.lastDonationDate = user.lastDonationDate || profile.lastDonationDate || null;
    await user.save();
  }

  const hospitals = await HospitalProfile.find().select(
    'user address contactPhone location verificationStatus'
  );

  for (const profile of hospitals) {
    const user = await User.findById(profile.user);
    if (!user) {
      continue;
    }
    user.address = user.address || profile.address || '';
    user.phone = user.phone || profile.contactPhone || '';
    user.locationCoordinates =
      user.locationCoordinates?.coordinates?.length ? user.locationCoordinates : profile.location;
    user.verified = profile.verificationStatus === 'verified';
    await user.save();
  }
}
