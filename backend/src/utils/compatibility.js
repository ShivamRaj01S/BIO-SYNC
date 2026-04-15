const BLOOD_COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export function isBloodCompatible(donorBloodGroup, recipientBloodGroup) {
  if (!donorBloodGroup || !recipientBloodGroup) {
    return false;
  }

  return Boolean(BLOOD_COMPATIBILITY[recipientBloodGroup]?.includes(donorBloodGroup));
}

export function isExactBloodMatch(donorBloodGroup, recipientBloodGroup) {
  return donorBloodGroup && recipientBloodGroup && donorBloodGroup === recipientBloodGroup;
}

export function isOrganPreferenceCompatible(donorPreferences, requestedOrganType) {
  if (!requestedOrganType) {
    return false;
  }

  return Array.isArray(donorPreferences)
    ? donorPreferences.map((item) => item.toLowerCase()).includes(requestedOrganType.toLowerCase())
    : false;
}
