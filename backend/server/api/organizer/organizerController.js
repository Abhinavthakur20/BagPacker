const Organizer = require("./organizerModel");
const Trip = require("../trip/tripModel");
const Booking = require("../booking/bookingModel");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

const DOCUMENT_IMAGE_TRANSFORMATIONS = {
  width: 2000,
  crop: "limit",
  quality: "auto:good",
  fetch_format: "auto",
  dpr: "auto",
};

const getPrimaryOrganizerProfile = (userId) =>
  Organizer.findOne({ userId })
    .sort({ approvalStatus: 1, approvedAt: -1, createdAt: -1 })
    .populate({
      path: "userId",
      select: "-passwordHash",
    });

const registerOrganizerProfile = async (req, res) => {
  try {
    const { businessName, gstNumber, bankAccountDetails } = req.body;

    const existingOrganizer = await Organizer.findOne({ userId: req.user._id });

    if (existingOrganizer) {
      return res.status(400).json({ message: "Organizer profile already exists" });
    }

    let licenseUrl = null;
    if (req.file) {
      const uploadedLicense = await uploadBufferToCloudinary({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        folder: "bagpacker/organizer-licenses",
        resourceType: "auto",
        transformations: DOCUMENT_IMAGE_TRANSFORMATIONS,
      });
      licenseUrl = uploadedLicense.secure_url;
    }

    const organizer = await Organizer.create({
      userId: req.user._id,
      businessName: businessName.trim(),
      gstNumber: gstNumber ? gstNumber.trim() : undefined,
      licenseUrl,
      bankAccountDetails: bankAccountDetails ? bankAccountDetails.trim() : null,
    });

    return res.status(201).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrganizerProfile = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    return res.status(200).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrganizerTrips = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const trips = await Trip.find({ organizerId: organizer._id })
      .select(
        "title source destination startDate endDate pricePerPerson totalSeats availableSeats status images organizerId createdAt",
      )
      .sort({ startDate: 1, createdAt: -1 })
      .lean();

    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyTripBookings = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const tripId = String(req.params.tripId || "").trim();
    const status = String(req.query.status || "").trim();

    const trip = await Trip.findOne({ _id: tripId, organizerId: organizer._id })
      .select("title source destination startDate endDate pricePerPerson totalSeats availableSeats status organizerId")
      .lean();

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const bookingQuery = { tripId: trip._id };
    if (status) {
      bookingQuery.status = status;
    }

    const bookings = await Booking.find(bookingQuery)
      .sort({ createdAt: -1 })
      .populate({
        path: "travelerId",
        select: "name email phone avatarUrl verificationStatus trustScore",
      })
      .populate({
        path: "pickupPointId",
        select: "location time",
      })
      .select(
        "travelerId seatsBooked totalAmount currency paymentProvider paymentStatus razorpayPaymentId paymentCapturedAt status createdAt pickupPointId",
      )
      .lean();

    const seatsBookedTotal = bookings.reduce((sum, booking) => sum + Math.max(0, Number(booking?.seatsBooked || 0)), 0);
    const revenueTotal = bookings
      .filter((booking) => booking?.paymentStatus === "paid" && booking?.status === "confirmed")
      .reduce((sum, booking) => sum + Math.max(0, Number(booking?.totalAmount || 0)), 0);

    return res.status(200).json({
      trip,
      summary: {
        seatsBookedTotal,
        seatsFilled: Math.max(0, Number(trip.totalSeats || 0) - Number(trip.availableSeats || 0)),
        totalSeats: Number(trip.totalSeats || 0),
        revenueTotal,
        bookingsCount: bookings.length,
      },
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyOrganizerTrips,
  registerOrganizerProfile,
  getMyOrganizerProfile,
  getMyTripBookings,
};
