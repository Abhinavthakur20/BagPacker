const Booking = require("./bookingModel");
const Notification = require("../notification/notificationModel");
const PickupPoint = require("../trip/pickupPointModel");
const Trip = require("../trip/tripModel");
const Organizer = require("../organizer/organizerModel");
const { ensureTripGroupChat, addMemberToTripGroup } = require("../groupChat/groupChatController");
const { reconcileTripsSeatInventory } = require("../trip/tripSeatSyncService");
const { emitSeatUpdate } = require("../../socket/socket");
const { sendMail } = require("../../utils/mailer");
const crypto = require("crypto");

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";
const RAZORPAY_CURRENCY = "INR";
const BOOKING_SERVICE_FEE_RATE = 0.05;

const getRazorpayCredentials = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured");
  }

  return { keyId, keySecret };
};

const buildRazorpayAuthHeader = ({ keyId, keySecret }) => {
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
};

const toPaise = (amount) => Math.round(Number(amount || 0) * 100);
const fromPaise = (amount) => Number((Number(amount || 0) / 100).toFixed(2));
const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
const getTicketCode = (bookingDoc) => {
  const idChunk = String(bookingDoc?._id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-6);
  const sourceChunk = String(bookingDoc?.tripId?.source || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  const destinationChunk = String(bookingDoc?.tripId?.destination || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  return `BP-${sourceChunk || "TR"}${destinationChunk || "IP"}-${idChunk || "000000"}`;
};

const populateBookingForTraveler = (query) =>
  query.populate({
    path: "tripId",
    populate: {
      path: "organizerId",
      select: "userId businessName",
    },
  }).populate("pickupPointId");

const buildBookingEmail = ({ travelerName, booking }) => {
  const ticketCode = getTicketCode(booking);
  const tripTitle = booking?.tripId?.title || "Trip";
  const route = `${booking?.tripId?.source || "Source"} to ${booking?.tripId?.destination || "Destination"}`;
  const pickupLine = `${booking?.pickupPointId?.location || "TBD"} (${booking?.pickupPointId?.time || "TBD"})`;
  const startDate = formatDate(booking?.tripId?.startDate);
  const endDate = formatDate(booking?.tripId?.endDate);
  const amount = formatInr(booking?.totalAmount || 0);
  const paymentId = String(booking?.razorpayPaymentId || "N/A");
  const issuedAt = formatDateTime(booking?.paymentCapturedAt || booking?.createdAt);
  const seats = Number(booking?.seatsBooked || 1);

  const subject = `Booking Confirmed • ${tripTitle} • ${ticketCode}`;
  const text = [
    `Hi ${travelerName || "Traveler"},`,
    "",
    "Your booking is confirmed. Here is your e-ticket:",
    `Ticket ID: ${ticketCode}`,
    `Trip: ${tripTitle}`,
    `Route: ${route}`,
    `Journey: ${startDate} to ${endDate}`,
    `Pickup: ${pickupLine}`,
    `Seats: ${seats}`,
    `Amount Paid: ${amount}`,
    `Payment ID: ${paymentId}`,
    `Issued At: ${issuedAt}`,
    "",
    "Please carry a valid government ID during travel.",
    "",
    "Thank you,",
    "BagPacker",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:24px;background:#f3f6f4;font-family:Segoe UI,Arial,sans-serif;color:#1f2e26;">
      <table role="presentation" style="max-width:760px;width:100%;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 16px 0;">
            <div style="font-size:12px;letter-spacing:.16em;font-weight:700;color:#8b5e18;text-transform:uppercase;">BagPacker Confirmation</div>
            <h1 style="margin:8px 0 0 0;font-size:30px;line-height:1.1;color:#113225;">Your booking is confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d8e1db;">
            <div style="padding:18px 20px;background:linear-gradient(90deg,#124c37,#1e6b4d);color:#fff;">
              <div style="font-size:11px;letter-spacing:.14em;font-weight:700;text-transform:uppercase;opacity:.88;">BagPacker E-Ticket</div>
              <div style="margin-top:6px;font-size:24px;font-weight:800;">${tripTitle}</div>
              <div style="margin-top:4px;font-size:14px;opacity:.95;">${route}</div>
            </div>
            <div style="padding:18px 20px;">
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Traveler</div><div style="font-size:14px;font-weight:700;">${travelerName || "Traveler"}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Ticket ID</div><div style="font-size:14px;font-weight:800;">${ticketCode}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Journey</div><div style="font-size:14px;font-weight:700;">${startDate} to ${endDate}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Pickup</div><div style="font-size:14px;font-weight:700;">${pickupLine}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Seats</div><div style="font-size:14px;font-weight:700;">${seats}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Paid Amount</div><div style="font-size:14px;font-weight:800;">${amount}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Payment ID</div><div style="font-size:14px;font-weight:700;">${paymentId}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d7a73;">Issued At</div><div style="font-size:14px;font-weight:700;">${issuedAt}</div></div>
              </div>
              <p style="margin:16px 0 0 0;font-size:12px;color:#66736c;">Please carry a valid government ID and arrive before pickup time.</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

const createRazorpayOrder = async ({ amountPaise, receipt }) => {
  const credentials = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildRazorpayAuthHeader(credentials),
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: RAZORPAY_CURRENCY,
      receipt,
      payment_capture: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description || "Failed to create Razorpay order");
  }
  return data;
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getRazorpayCredentials();
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
  return expectedSignature === signature;
};

const getBookingTripAndPickup = async ({ tripId, pickupPointId }) => {
  const pickupPoint = await PickupPoint.findOne({ _id: pickupPointId, tripId });
  if (!pickupPoint) {
    throw new Error("Pickup point does not belong to this trip");
  }

  const trip = await Trip.findOne({ _id: tripId, status: "active" }).select(
    "organizerId title pricePerPerson availableSeats status paymentEnabled startDate endDate",
  );
  if (!trip) {
    throw new Error("Trip is unavailable");
  }
  if (trip.startDate && new Date(trip.startDate) < new Date()) {
    throw new Error("This trip has already departed");
  }
  if (!trip.paymentEnabled) {
    throw new Error("Payments are disabled for this trip");
  }

  const [reconciledTrip] = await reconcileTripsSeatInventory([trip.toObject()]);

  return { trip: reconciledTrip || trip.toObject(), pickupPoint };
};
const reserveTripSeats = async ({ tripId, seatsBooked }) =>
  Trip.findOneAndUpdate(
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

const initiateBookingPayment = async (req, res) => {
  try {
    if (!req.user?.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email before booking a trip" });
    }

    const { tripId, pickupPointId, seatsBooked } = req.body;
    const normalizedSeats = Number(seatsBooked);
    if (!Number.isInteger(normalizedSeats) || normalizedSeats < 1) {
      return res.status(400).json({ message: "Seats booked must be a valid number greater than 0" });
    }

    const { trip } = await getBookingTripAndPickup({ tripId, pickupPointId });
    if (normalizedSeats > Number(trip.availableSeats || 0)) {
      return res.status(409).json({ message: "Requested seats are no longer available" });
    }
    const subtotal = trip.pricePerPerson * normalizedSeats;
    const serviceFee = Math.round(subtotal * BOOKING_SERVICE_FEE_RATE);
    const totalAmount = subtotal + serviceFee;
    const amountPaise = toPaise(totalAmount);
    if (amountPaise <= 0) {
      return res.status(400).json({ message: "Invalid booking amount" });
    }

    const ORDER_EXPIRY_MS = 14 * 60 * 1000; // 14 min (Razorpay orders expire after 15 min)
    const existingPending = await Booking.findOne({
      travelerId: req.user._id,
      tripId,
      pickupPointId,
      seatsBooked: normalizedSeats,
      status: "pending",
      paymentStatus: "created",
    })
      .sort({ createdAt: -1 })
      .select("razorpayOrderId totalAmount currency paymentProvider status paymentStatus createdAt");

    if (existingPending?.razorpayOrderId) {
      const isExpired = (Date.now() - new Date(existingPending.createdAt).getTime()) > ORDER_EXPIRY_MS;
      if (!isExpired) {
        return res.status(200).json({
          bookingId: existingPending._id,
          orderId: existingPending.razorpayOrderId,
          amount: toPaise(existingPending.totalAmount),
          currency: existingPending.currency || RAZORPAY_CURRENCY,
          keyId: String(process.env.RAZORPAY_KEY_ID || "").trim(),
        });
      }
      existingPending.status = "cancelled";
      existingPending.paymentStatus = "failed";
      await existingPending.save();
    }

    const draftBooking = await Booking.create({
      travelerId: req.user._id,
      tripId,
      pickupPointId,
      seatsBooked: normalizedSeats,
      totalAmount,
      currency: RAZORPAY_CURRENCY,
      paymentProvider: "razorpay",
      paymentStatus: "created",
      status: "pending",
    });

    const receipt = `booking_${String(draftBooking._id)}`.slice(0, 40);
    const razorpayOrder = await createRazorpayOrder({ amountPaise, receipt });
    draftBooking.razorpayOrderId = razorpayOrder.id;
    await draftBooking.save();

    return res.status(201).json({
      bookingId: draftBooking._id,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || RAZORPAY_CURRENCY,
      keyId: String(process.env.RAZORPAY_KEY_ID || "").trim(),
    });
  } catch (error) {
    if (error.message === "Payments are disabled for this trip") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

const verifyBookingPayment = async (req, res) => {
  try {
    const { bookingId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } =
      req.body;

    const booking = await Booking.findOne({ _id: bookingId, travelerId: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
      const alreadyConfirmed = await Booking.findById(booking._id).populate("tripId").populate("pickupPointId");
      return res.status(200).json(alreadyConfirmed);
    }

    if (booking.status !== "pending" || booking.paymentStatus !== "created") {
      return res.status(400).json({ message: "Booking is not in payable state" });
    }

    if (!booking.razorpayOrderId || booking.razorpayOrderId !== orderId) {
      return res.status(400).json({ message: "Invalid Razorpay order reference" });
    }

    const isValidSignature = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!isValidSignature) {
      booking.paymentStatus = "failed";
      booking.razorpayPaymentId = String(paymentId || "").trim();
      booking.razorpaySignature = String(signature || "").trim();
      await booking.save();
      return res.status(400).json({ message: "Payment signature verification failed" });
    }

    const updatedTrip = await reserveTripSeats({
      tripId: booking.tripId,
      seatsBooked: booking.seatsBooked,
    });

    if (!updatedTrip) {
      booking.paymentStatus = "refund_required";
      booking.razorpayPaymentId = String(paymentId || "").trim();
      booking.razorpaySignature = String(signature || "").trim();
      booking.paymentCapturedAt = new Date();
      await booking.save();
      return res.status(409).json({
        message:
          "Payment succeeded but seats are no longer available. Please contact support for refund.",
      });
    }

    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.razorpayPaymentId = String(paymentId || "").trim();
    booking.razorpaySignature = String(signature || "").trim();
    booking.paymentCapturedAt = new Date();
    booking.totalAmount = fromPaise(toPaise(booking.totalAmount));
    await booking.save();

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

    const populatedBooking = await populateBookingForTraveler(Booking.findById(booking._id));

    const travelerEmail = String(req.user?.email || "").trim();
    const travelerName = String(req.user?.name || "Traveler").trim();
    let mailStatus = { delivered: false, skipped: true, reason: "Traveler email unavailable" };

    if (travelerEmail) {
      try {
        const emailPayload = buildBookingEmail({
          travelerName,
          booking: populatedBooking,
        });
        mailStatus = await sendMail({
          to: travelerEmail,
          ...emailPayload,
        });
      } catch (mailError) {
        mailStatus = {
          delivered: false,
          skipped: false,
          reason: String(mailError?.message || "Email delivery failed"),
        };
      }
    }

    return res.status(200).json({
      ...populatedBooking.toObject(),
      emailDelivery: mailStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const bookings = await populateBookingForTraveler(
      Booking.find({ travelerId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    );

    const total = await Booking.countDocuments({ travelerId: req.user._id });
    return res.status(200).json({
      items: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
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

    if (booking.status === "completed") {
      return res.status(400).json({ message: "Completed bookings cannot be cancelled" });
    }

    // Enforce 24-hour cancellation window before departure
    const trip = await Trip.findById(booking.tripId).select("startDate");
    if (trip?.startDate) {
      const hoursUntilTrip = (new Date(trip.startDate) - Date.now()) / 36e5;
      if (hoursUntilTrip < 24) {
        return res.status(400).json({ message: "Bookings cannot be cancelled within 24 hours of departure" });
      }
    }

    const shouldReleaseSeats = booking.status === "confirmed";

    // Flag refund tracking for confirmed paid bookings
    if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
      booking.paymentStatus = "refund_required";
    }

    booking.status = "cancelled";
    await booking.save();

    const updatedTrip = shouldReleaseSeats
      ? await Trip.findByIdAndUpdate(
          booking.tripId,
          { $inc: { availableSeats: booking.seatsBooked } },
          { returnDocument: "after" },
        )
      : null;

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

const getOrganizerBookingAndTrip = async ({ bookingId, organizerUserId }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return { error: { status: 404, message: "Booking not found" } };
  }

  const trip = await Trip.findById(booking.tripId).select("title organizerId");
  if (!trip) {
    return { error: { status: 404, message: "Trip not found" } };
  }

  const organizer = await Organizer.findById(trip.organizerId).select("userId");
  if (!organizer || String(organizer.userId) !== String(organizerUserId)) {
    return { error: { status: 403, message: "Only the trip organizer can perform this action" } };
  }

  return { booking, trip };
};

const cancelBookingByOrganizer = async (req, res) => {
  try {
    const payload = await getOrganizerBookingAndTrip({
      bookingId: req.params.id,
      organizerUserId: req.user._id,
    });
    if (payload.error) {
      return res.status(payload.error.status).json({ message: payload.error.message });
    }
    const { booking, trip } = payload;

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }
    if (booking.status === "completed") {
      return res.status(400).json({ message: "Completed bookings cannot be cancelled" });
    }

    const shouldReleaseSeats = booking.status === "confirmed";
    if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
      booking.paymentStatus = "refund_required";
    }

    booking.status = "cancelled";
    await booking.save();

    const updatedTrip = shouldReleaseSeats
      ? await Trip.findByIdAndUpdate(
          booking.tripId,
          { $inc: { availableSeats: booking.seatsBooked } },
          { returnDocument: "after" },
        )
      : null;

    await Notification.create({
      userId: booking.travelerId,
      type: "booking_cancelled",
      message: `Your booking for ${trip?.title || "this trip"} was cancelled by the organizer.`,
    });

    if (updatedTrip) {
      emitSeatUpdate(updatedTrip._id, updatedTrip.availableSeats);
    }

    const populatedBooking = await populateBookingForTraveler(Booking.findById(booking._id));
    return res.status(200).json(populatedBooking);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markBookingRefundedByOrganizer = async (req, res) => {
  try {
    const payload = await getOrganizerBookingAndTrip({
      bookingId: req.params.id,
      organizerUserId: req.user._id,
    });
    if (payload.error) {
      return res.status(payload.error.status).json({ message: payload.error.message });
    }
    const { booking, trip } = payload;

    if (booking.paymentStatus === "refunded") {
      return res.status(400).json({ message: "Booking is already marked as refunded" });
    }
    if (booking.paymentStatus !== "refund_required") {
      return res.status(400).json({ message: "Only refund-required bookings can be marked as refunded" });
    }

    booking.paymentStatus = "refunded";
    await booking.save();

    await Notification.create({
      userId: booking.travelerId,
      type: "trip_alert",
      message: `Refund for your ${trip?.title || "trip"} booking has been marked as completed.`,
    });

    const populatedBooking = await populateBookingForTraveler(Booking.findById(booking._id));
    return res.status(200).json(populatedBooking);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only the trip's organizer can mark bookings as complete
    const trip = await Trip.findById(booking.tripId).select("endDate title organizerId");
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const organizer = await Organizer.findById(trip.organizerId).select("userId");
    if (!organizer || String(organizer.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the trip organizer can complete bookings" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled bookings cannot be completed" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ message: "Booking is already marked as completed" });
    }

    if (trip?.endDate && new Date(trip.endDate).getTime() > Date.now()) {
      return res.status(400).json({
        message: "Booking can be marked as completed only after the trip end date",
      });
    }

    booking.status = "completed";
    await booking.save();

    await Notification.create({
      userId: booking.travelerId,
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
  initiateBookingPayment,
  verifyBookingPayment,
  getMyBookings,
  cancelBooking,
  cancelBookingByOrganizer,
  markBookingRefundedByOrganizer,
  completeBooking,
};
