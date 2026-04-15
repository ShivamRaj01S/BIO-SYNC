import { isExactBloodMatch } from './compatibility.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function calculateMatchScore({ donor, request, distanceKm, radiusKm }) {
  const urgencyMultiplier = {
    low: 0.9,
    medium: 1,
    critical: 1.25,
  }[request.urgencyLevel] || 1;

  const distanceScore = clamp(100 - (distanceKm / Math.max(radiusKm, 1)) * 100, 5, 100);
  const reliabilityScore = clamp(Number(donor.reliabilityScore ?? 100), 0, 100);
  const availabilityScore =
    donor.availabilityStatus === 'available' ? 100 : donor.availabilityStatus === 'busy' ? 35 : 0;
  const compatibilityBonus = isExactBloodMatch(donor.bloodGroup, request.bloodGroup)
    ? 12
    : donor.bloodGroup === 'O-'
      ? 8
      : 4;

  const weightedBase =
    distanceScore * 0.35 + reliabilityScore * 0.4 + availabilityScore * 0.25 + compatibilityBonus;
  const total = Number((weightedBase * urgencyMultiplier).toFixed(2));

  return {
    total,
    breakdown: {
      urgencyMultiplier,
      distanceScore: Number(distanceScore.toFixed(2)),
      reliabilityScore,
      availabilityScore,
      compatibilityBonus,
    },
  };
}
