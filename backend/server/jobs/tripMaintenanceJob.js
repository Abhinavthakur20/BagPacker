const Trip = require("../api/trip/tripModel");
const Booking = require("../api/booking/bookingModel");

const runTripMaintenanceJob = async () => {
  const now = new Date();
  const endedTripIds = (
    await Trip.find({
      endDate: { $lt: now },
    }).select("_id")
  ).map((trip) => trip._id);

  const [completedTripsResult, completedBookingsResult] = await Promise.all([
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
  ]);

  return {
    completedTrips:
      Number(completedTripsResult.modifiedCount || completedTripsResult.nModified || 0),
    completedBookings:
      Number(completedBookingsResult.modifiedCount || completedBookingsResult.nModified || 0),
    runAt: now.toISOString(),
  };
};

module.exports = {
  runTripMaintenanceJob,
};
