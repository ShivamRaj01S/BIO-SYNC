export function isValidCoordinates(coordinates) {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1])) &&
    Number(coordinates[0]) >= -180 &&
    Number(coordinates[0]) <= 180 &&
    Number(coordinates[1]) >= -90 &&
    Number(coordinates[1]) <= 90
  );
}

export function normalizePoint(input) {
  if (!input) {
    return null;
  }

  if (Array.isArray(input) && isValidCoordinates(input)) {
    return {
      type: 'Point',
      coordinates: [Number(input[0]), Number(input[1])],
    };
  }

  const coordinates = input.coordinates;
  if (!isValidCoordinates(coordinates)) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [Number(coordinates[0]), Number(coordinates[1])],
  };
}

export function haversineKm(origin, destination) {
  if (!origin || !destination) {
    return Number.POSITIVE_INFINITY;
  }

  const [lng1, lat1] = origin;
  const [lng2, lat2] = destination;

  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Radians = (lat1 * Math.PI) / 180;
  const lat2Radians = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1Radians) * Math.cos(lat2Radians);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + Number(days));
  return nextDate;
}
