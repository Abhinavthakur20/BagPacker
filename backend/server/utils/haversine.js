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

const splitExpense = (distanceKm, fuelPricePerLitre, mileage, numberOfPassengers) => {
  if (mileage <= 0 || numberOfPassengers <= 0) {
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
