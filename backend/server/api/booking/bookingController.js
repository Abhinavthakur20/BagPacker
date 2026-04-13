const Booking = require("./bookingModel");
const Notification = require("../notification/notificationModel");
const PickupPoint = require("../trip/pickupPointModel");
const Trip = require("../trip/tripModel");
const Organizer = require("../organizer/organizerModel");
const { ensureTripGroupChat, addMemberToTripGroup } = require("../groupChat/groupChatController");
const { emitSeatUpdate } = require("../../socket/socket");

const createBooking = async (req, res) => {
  try {
    const { tripId, pickupPointId, seatsBooked } = req.body;

    const pickupPoint = await PickupPoint.findOne({ _id: pickupPointId, tripId });

    if (!pickupPoint) {
      return res.status(400).json({ message: "Pickup point does not belong to this trip" });
    }

    const updatedTrip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        status: "active",
        availableSeats: { $gte: seatsBooked },
      },
      {
        $inc: { availableSeats: -seatsBooked },
      },
      { returnDocument: "after" },
    );

    if (!updatedTrip) {
      return res.status(400).json({ message: "Not enough seats available for this trip" });
    }

    const booking = await Booking.create({
      travelerId: req.user._id,
      tripId,
      pickupPointId,
      seatsBooked,
      totalAmount: updatedTrip.pricePerPerson * seatsBooked,
      status: "confirmed",
    });

    const organizer = await Organizer.findById(updatedTrip.organizerId).select("userId");
    if (organizer?.userId) {
      await ensureTripGroupChat({
        tripId: updatedTrip._id,
        organizerUserId: organizer.userId,
      });
      await addMemberToTripGroup({ tripId: updatedTrip._id, userId: req.user._id });
    }

    await Notification.create({
      userId: req.user._id,
      type: "booking_confirmed",
      message: `Your booking for ${updatedTrip.title} has been confirmed.`,
    });

    emitSeatUpdate(updatedTrip._id, updatedTrip.availableSeats);

    const populatedBooking = await Booking.findById(booking._id)
      .populate("tripId")
      .populate("pickupPointId");

    return res.status(201).json(populatedBooking);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ travelerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("tripId")
      .populate("pickupPointId");

    return res.status(200).json(bookings);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      travelerId: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    const updatedTrip = await Trip.findByIdAndUpdate(
      booking.tripId,
      { $inc: { availableSeats: booking.seatsBooked } },
      { returnDocument: "after" },
    );

    await Notification.create({
      userId: req.user._id,
      type: "booking_cancelled",
      message: "Your booking has been cancelled successfully.",
    });

    if (updatedTrip) {
      emitSeatUpdate(updatedTrip._id, updatedTrip.availableSeats);
    }

    return res.status(200).json(booking);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      travelerId: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled bookings cannot be completed" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ message: "Booking is already marked as completed" });
    }

    const trip = await Trip.findById(booking.tripId).select("endDate title");

    if (trip?.endDate && new Date(trip.endDate).getTime() > Date.now()) {
      return res.status(400).json({
        message: "Booking can be marked as completed only after the trip end date",
      });
    }

    booking.status = "completed";
    await booking.save();

    await Notification.create({
      userId: req.user._id,
      type: "trip_alert",
      message: `Your booking for ${trip?.title || "this trip"} is marked as completed.`,
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("tripId")
      .populate("pickupPointId");

    return res.status(200).json(populatedBooking);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  completeBooking,
};
