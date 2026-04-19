const EARTH_RADIUS_KM = 6371;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randomBetween(min, max) {
  return min + (Math.random() * (max - min));
}

export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function toDegrees(value) {
  return (value * 180) / Math.PI;
}

export function getDistanceKm(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a = (Math.sin(dLat / 2) ** 2)
    + (Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLng / 2) ** 2));
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function offsetPoint(origin, distanceKm, bearingDegrees) {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);

  const lat2 = Math.asin(
    (Math.sin(lat1) * Math.cos(angularDistance))
      + (Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing))
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - (Math.sin(lat1) * Math.sin(lat2))
  );

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2)
  };
}

export function createRandomPointAround(origin, maxDistanceKm) {
  const distance = Math.sqrt(Math.random()) * maxDistanceKm;
  const bearing = randomBetween(0, 360);
  return offsetPoint(origin, distance, bearing);
}

export function interpolatePoint(from, to, progress) {
  return {
    lat: from.lat + ((to.lat - from.lat) * progress),
    lng: from.lng + ((to.lng - from.lng) * progress)
  };
}

export function createSegmentPoints(from, to, density = 8) {
  return Array.from({ length: density + 1 }, (_, index) => {
    const progress = index / density;
    return interpolatePoint(from, to, progress);
  });
}
