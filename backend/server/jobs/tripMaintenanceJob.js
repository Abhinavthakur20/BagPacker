const Trip = require("../api/trip/tripModel");
const Booking = require("../api/booking/bookingModel");

const STALE_PENDING_BOOKING_MS = 30 * 60 * 1000;

const runTripMaintenanceJob = async () => {
  const now = new Date();
  const staleBookingCutoff = new Date(now.getTime() - STALE_PENDING_BOOKING_MS);
  const endedTripIds = (
    await Trip.find({
      endDate: { $lt: now },
    }).select("_id")
  ).map((trip) => trip._id);

  const [completedTripsResult, completedBookingsResult, staleBookingsResult] = await Promise.all([
    Trip.updateMany(
      {
        status: "active",
        endDate: { $lt: now },
      },
      {
        $set: { status: "completed" },
      },
    ),
    Booking.updateMany(
      {
        status: "confirmed",
        tripId: { $in: endedTripIds },
      },
      { $set: { status: "completed" } },
    ),
    Booking.updateMany(
      {
        status: "pending",
        paymentStatus: "created",
        createdAt: { $lt: staleBookingCutoff },
      },
      {
        $set: {
          status: "cancelled",
          paymentStatus: "failed",
        },
      },
    ),
  ]);

  return {
    completedTrips:
      Number(completedTripsResult.modifiedCount || completedTripsResult.nModified || 0),
    completedBookings:
      Number(completedBookingsResult.modifiedCount || completedBookingsResult.nModified || 0),
    staleBookingsFailed:
      Number(staleBookingsResult.modifiedCount || staleBookingsResult.nModified || 0),
    runAt: now.toISOString(),
  };
};

module.exports = {
  runTripMaintenanceJob,
};
