const DEFAULT_LOCATION = [77.209, 28.6139];

export function getStoredClientLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem('clientLocation') || '{}');
    if (Number.isFinite(saved.longitude) && Number.isFinite(saved.latitude)) {
      return [saved.longitude, saved.latitude];
    }
  } catch {}

  return DEFAULT_LOCATION;
}

export function saveClientLocation(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return;
  }

  localStorage.setItem(
    'clientLocation',
    JSON.stringify({
      longitude: Number(coordinates[0]),
      latitude: Number(coordinates[1]),
    })
  );
}

export { DEFAULT_LOCATION };
