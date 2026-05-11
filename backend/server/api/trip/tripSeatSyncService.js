const Booking = require("../booking/bookingModel");
const Trip = require("./tripModel");

const OCCUPIED_BOOKING_STATUSES = ["confirmed", "completed"];

const toTripKey = (tripId) => String(tripId || "");

const getOccupiedSeatsMap = async (tripIds = []) => {
  const normalizedIds = tripIds.filter(Boolean);
  if (!normalizedIds.length) {
    return new Map();
  }

  const rows = await Booking.aggregate([
    {
      $match: {
        tripId: { $in: normalizedIds },
        status: { $in: OCCUPIED_BOOKING_STATUSES },
      },
    },
    {
      $group: {
        _id: "$tripId",
        occupiedSeats: {
          $sum: { $max: [0, { $toInt: "$seatsBooked" }] },
        },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [toTripKey(row?._id), Math.max(0, Number(row?.occupiedSeats || 0))]),
  );
};

const computeAvailableSeats = ({ totalSeats, occupiedSeats }) =>
  Math.max(0, Number(totalSeats || 0) - Math.max(0, Number(occupiedSeats || 0)));

const reconcileTripsSeatInventory = async (trips = []) => {
  if (!Array.isArray(trips) || !trips.length) {
    return [];
  }

  const tripIds = trips.map((trip) => trip?._id).filter(Boolean);
  const occupiedByTrip = await getOccupiedSeatsMap(tripIds);

  const updates = [];
  const reconciled = trips.map((trip) => {
    const occupiedSeats = occupiedByTrip.get(toTripKey(trip?._id)) || 0;
    const nextAvailableSeats = computeAvailableSeats({
      totalSeats: trip?.totalSeats,
      occupiedSeats,
    });
    const currentAvailableSeats = Number(trip?.availableSeats || 0);

    if (currentAvailableSeats !== nextAvailableSeats) {
      updates.push({
        updateOne: {
          filter: { _id: trip._id },
          update: { $set: { availableSeats: nextAvailableSeats } },
        },
      });
    }

    return {
      ...trip,
      availableSeats: nextAvailableSeats,
    };
  });

  if (updates.length) {
    await Trip.bulkWrite(updates);
  }

  return reconciled;
};

const reconcileTripSeatInventory = async (tripId) => {
  if (!tripId) {
    return null;
  }

  const trip = await Trip.findById(tripId)
    .select(
      "title source destination startDate endDate pricePerPerson totalSeats availableSeats status organizerId",
    )
    .lean();

  if (!trip) {
    return null;
  }

  const [reconciledTrip] = await reconcileTripsSeatInventory([trip]);
  return reconciledTrip || trip;
};

module.exports = {
  OCCUPIED_BOOKING_STATUSES,
  reconcileTripsSeatInventory,
  reconcileTripSeatInventory,
};

