/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of the first point.
 * @param {number} lon1 - Longitude of the first point.
 * @param {number} lat2 - Latitude of the second point.
 * @param {number} lon2 - Longitude of the second point.
 * @returns {number} The distance between the two points in kilometers.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

/**
 * Calculates the split cost per passenger for a given trip.
 *
 * @param {number} distanceKm - Total distance in kilometers.
 * @param {number} fuelPricePerLitre - Price of fuel per litre.
 * @param {number} mileage - Vehicle fuel mileage (km/litre).
 * @param {number} numberOfPassengers - Number of passengers sharing the cost.
 * @returns {number} The cost per passenger, rounded to 2 decimal places.
 */
const splitExpense = (distanceKm, fuelPricePerLitre, mileage, numberOfPassengers) => {
  if (distanceKm <= 0 || fuelPricePerLitre <= 0 || mileage <= 0 || numberOfPassengers <= 0) {
    return 0;
  }

  const litresRequired = distanceKm / mileage;
  const totalCost = litresRequired * fuelPricePerLitre;

  return Number((totalCost / numberOfPassengers).toFixed(2));
};

module.exports = {
  haversineDistance,
  splitExpense,
};
