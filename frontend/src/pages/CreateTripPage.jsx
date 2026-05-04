import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";
import LoadingPanel from "../components/ui/LoadingPanel";
import CityAutocompleteInput from "../components/ui/CityAutocompleteInput";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../lib/alerts";

const blankItinerary = { dayNumber: 1, activities: "", accommodation: "" };
const blankPickup = { location: "", time: "", sequence: 1 };
const initialTripForm = {
  title: "",
  source: "",
  destination: "",
  transportType: "bus",
  startDate: "",
  endDate: "",
  totalSeats: 1,
  pricePerPerson: 0,
  paymentEnabled: true,
  description: "",
  status: "active",
};
const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
const fileSignature = (file) => `${file.name}-${file.size}-${file.lastModified}`;
const formatDateInput = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const preventWheelNumberChange = (event) => {
  event.currentTarget.blur();
};

export default function CreateTripPage() {
  const token = useSelector((state) => state.auth.token);
  const isLoggedIn = Boolean(token);
  const navigate = useNavigate();
  const { id: tripId } = useParams();
  const isEditMode = Boolean(tripId);
  const [organizer, setOrganizer] = useState(null);
  const [tripForm, setTripForm] = useState(initialTripForm);
  const [itinerary, setItinerary] = useState([blankItinerary]);
  const [pickupPoints, setPickupPoints] = useState([blankPickup]);
  const [tripImages, setTripImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [pendingCropFiles, setPendingCropFiles] = useState([]);
  const [activeCropFile, setActiveCropFile] = useState(null);
  const [cropArea, setCropArea] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, size: 0 });
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [isCroppingImage, setIsCroppingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const cropImageRef = useRef(null);
  const dragStateRef = useRef(null);

  const previewUrls = useMemo(
    () => tripImages.map((file) => URL.createObjectURL(file)),
    [tripImages],
  );
  const activeCropUrl = useMemo(
    () => (activeCropFile ? URL.createObjectURL(activeCropFile) : ""),
    [activeCropFile],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      if (activeCropUrl) {
        URL.revokeObjectURL(activeCropUrl);
      }
    };
  }, [activeCropUrl]);

  useEffect(() => {
    if (previewIndex >= previewUrls.length) {
      setPreviewIndex(0);
    }
  }, [previewIndex, previewUrls.length]);

  useEffect(() => {
    if (!activeCropFile && pendingCropFiles.length) {
      setActiveCropFile(pendingCropFiles[0]);
      setPendingCropFiles((prev) => prev.slice(1));
    }
  }, [activeCropFile, pendingCropFiles]);

  useEffect(() => {
    const loadPageData = async () => {
      if (!isLoggedIn) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const organizerProfile = await api.get("/organizers/me");
        setOrganizer(organizerProfile);
        setTripImages([]);
        setPendingCropFiles([]);
        setActiveCropFile(null);
        setPreviewIndex(0);

        if (isEditMode) {
          const tripDetails = await api.get(`/trips/${tripId}`);
          setTripForm({
            title: tripDetails?.title || "",
            source: tripDetails?.source || "",
            destination: tripDetails?.destination || "",
            transportType: tripDetails?.transportType || "bus",
            startDate: formatDateInput(tripDetails?.startDate),
            endDate: formatDateInput(tripDetails?.endDate),
            totalSeats: Number(tripDetails?.totalSeats || 1),
            pricePerPerson: Number(tripDetails?.pricePerPerson || 0),
            paymentEnabled: tripDetails?.paymentEnabled !== false,
            description: tripDetails?.description || "",
            status: tripDetails?.status || "active",
          });
          setItinerary(
            Array.isArray(tripDetails?.itinerary) && tripDetails.itinerary.length
              ? tripDetails.itinerary.map((item, index) => ({
                  dayNumber: Number(item.dayNumber || index + 1),
                  activities: item.activities || "",
                  accommodation: item.accommodation || "",
                }))
              : [blankItinerary],
          );
          setPickupPoints(
            Array.isArray(tripDetails?.pickupPoints) && tripDetails.pickupPoints.length
              ? tripDetails.pickupPoints.map((item, index) => ({
                  location: item.location || "",
                  time: item.time || "",
                  sequence: Number(item.sequence || index + 1),
                }))
              : [blankPickup],
          );
          setExistingImages(
            Array.isArray(tripDetails?.images)
              ? tripDetails.images.map((path) => resolveMediaUrl(path)).filter(Boolean)
              : [],
          );
        } else {
          setTripForm(initialTripForm);
          setItinerary([blankItinerary]);
          setPickupPoints([blankPickup]);
          setExistingImages([]);
        }
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [isEditMode, isLoggedIn, tripId]);

  const updateTripField = (field, value) => {
    setTripForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItinerary = (index, field, value) => {
    setItinerary((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updatePickupPoint = (index, field, value) => {
    setPickupPoints((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItineraryRow = () => {
    setItinerary((prev) => [
      ...prev,
      { dayNumber: prev.length + 1, activities: "", accommodation: "" },
    ]);
  };

  const addPickupRow = () => {
    setPickupPoints((prev) => [
      ...prev,
      { location: "", time: "", sequence: prev.length + 1 },
    ]);
  };

  const onSelectTripImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    const knownFiles = new Set([
      ...tripImages.map((file) => fileSignature(file)),
      ...pendingCropFiles.map((file) => fileSignature(file)),
      ...(activeCropFile ? [fileSignature(activeCropFile)] : []),
    ]);
    const occupiedSlots =
      tripImages.length + pendingCropFiles.length + (activeCropFile ? 1 : 0);
    const remainingSlots = Math.max(0, 10 - occupiedSlots);
    const filesToQueue = [];

    for (const file of files) {
      if (filesToQueue.length >= remainingSlots) {
        break;
      }

      const signature = fileSignature(file);
      if (knownFiles.has(signature)) {
        continue;
      }

      knownFiles.add(signature);
      filesToQueue.push(file);
    }

    if (filesToQueue.length) {
      setPendingCropFiles((previous) => [...previous, ...filesToQueue]);
    }

    event.target.value = "";
  };

  const addTripImage = (file) => {
    setTripImages((previous) => {
      if (previous.length >= 10) {
        return previous;
      }
      const signature = fileSignature(file);
      const alreadyAdded = previous.some(
        (current) => fileSignature(current) === signature,
      );
      return alreadyAdded ? previous : [...previous, file];
    });
  };

  const moveToNextCropFile = () => {
    dragStateRef.current = null;
    setIsCropDragging(false);
    setCropArea({ width: 0, height: 0 });
    setCropBox({ x: 0, y: 0, size: 0 });
    setActiveCropFile(null);
  };

  const onCropImageLoad = (event) => {
    const image = event.currentTarget;
    const width = image.clientWidth;
    const height = image.clientHeight;
    const maxSquare = Math.floor(Math.min(width, height));

    if (!width || !height || !maxSquare) {
      return;
    }

    const initialSize = Math.floor(maxSquare * 0.7);
    setCropArea({ width, height });
    setCropBox({
      size: initialSize,
      x: Math.floor((width - initialSize) / 2),
      y: Math.floor((height - initialSize) / 2),
    });
  };

  const onCropPointerDown = (event) => {
    if (!cropArea.width || !cropArea.height || !cropBox.size) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startBoxX: cropBox.x,
      startBoxY: cropBox.y,
    };
    setIsCropDragging(true);
  };

  const onCropPointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const maxX = cropArea.width - cropBox.size;
    const maxY = cropArea.height - cropBox.size;

    setCropBox((previous) => ({
      ...previous,
      x: clampValue(dragState.startBoxX + deltaX, 0, Math.max(0, maxX)),
      y: clampValue(dragState.startBoxY + deltaY, 0, Math.max(0, maxY)),
    }));
  };

  const onCropPointerUp = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsCropDragging(false);
  };

  const onCropSizeChange = (event) => {
    const nextSize = Number(event.target.value);
    if (!cropArea.width || !cropArea.height || !nextSize) {
      return;
    }

    const maxSize = Math.floor(Math.min(cropArea.width, cropArea.height));
    const clampedSize = clampValue(nextSize, 1, maxSize);
    setCropBox((previous) => ({
      size: clampedSize,
      x: clampValue(previous.x, 0, cropArea.width - clampedSize),
      y: clampValue(previous.y, 0, cropArea.height - clampedSize),
    }));
  };

  const applySquareCrop = async () => {
    if (!activeCropFile || !cropImageRef.current || !cropBox.size) {
      return;
    }

    try {
      setIsCroppingImage(true);
      const image = cropImageRef.current;
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      const displayWidth = image.clientWidth;
      const displayHeight = image.clientHeight;

      if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) {
        moveToNextCropFile();
        return;
      }

      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      const sourceX = clampValue(
        Math.round(cropBox.x * scaleX),
        0,
        Math.max(0, naturalWidth - 1),
      );
      const sourceY = clampValue(
        Math.round(cropBox.y * scaleY),
        0,
        Math.max(0, naturalHeight - 1),
      );
      const sourceSize = Math.max(
        1,
        Math.min(
          Math.round(cropBox.size * scaleX),
          Math.round(cropBox.size * scaleY),
          naturalWidth - sourceX,
          naturalHeight - sourceY,
        ),
      );

      const canvas = document.createElement("canvas");
      canvas.width = sourceSize;
      canvas.height = sourceSize;
      const context = canvas.getContext("2d");
      if (!context) {
        moveToNextCropFile();
        return;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        sourceSize,
        sourceSize,
      );

      const webpBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.92);
      });
      const resultBlob =
        webpBlob ||
        (await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/png");
        }));

      if (!resultBlob) {
        moveToNextCropFile();
        return;
      }

      const originalName = activeCropFile.name.replace(/\.[^/.]+$/, "");
      const extension = resultBlob.type === "image/webp" ? "webp" : "png";
      const croppedFile = new File([resultBlob], `${originalName}-square.${extension}`, {
        type: resultBlob.type,
        lastModified: Date.now(),
      });

      addTripImage(croppedFile);
    } finally {
      setIsCroppingImage(false);
      moveToNextCropFile();
    }
  };

  const useOriginalImage = () => {
    if (!activeCropFile) {
      return;
    }
    addTripImage(activeCropFile);
    moveToNextCropFile();
  };

  const skipCurrentImage = () => {
    moveToNextCropFile();
  };

  const removeTripImage = (indexToRemove) => {
    setTripImages((previous) => previous.filter((_, index) => index !== indexToRemove));
  };

  const autofillTripWithAI = async () => {
    const source = String(tripForm.source || "").trim();
    const destination = String(tripForm.destination || "").trim();

    if (!source || !destination) {
      const message = "Enter source and destination first to generate trip details.";
      setError(message);
      await showErrorAlert("AI autofill unavailable", message);
      return;
    }

    try {
      setIsAutoFilling(true);
      setError("");
      const response = await api.post("/ai/trip-autofill", {
        source,
        destination,
        context: {
          currentForm: {
            startDate: tripForm.startDate,
            endDate: tripForm.endDate,
            totalSeats: Number(tripForm.totalSeats || 0),
            pricePerPerson: Number(tripForm.pricePerPerson || 0),
          },
        },
      });

      const suggestion = response?.suggestion || {};
      const nextItinerary =
        Array.isArray(suggestion.itinerary) && suggestion.itinerary.length
          ? suggestion.itinerary.map((item, index) => ({
              dayNumber: Number(item.dayNumber || index + 1),
              activities: String(item.activities || ""),
              accommodation: String(item.accommodation || ""),
            }))
          : [blankItinerary];
      const nextPickupPoints =
        Array.isArray(suggestion.pickupPoints) && suggestion.pickupPoints.length
          ? suggestion.pickupPoints.map((item, index) => ({
              location: String(item.location || ""),
              time: String(item.time || ""),
              sequence: Number(item.sequence || index + 1),
            }))
          : [blankPickup];

      setTripForm((prev) => ({
        ...prev,
        title: String(suggestion.title || prev.title || `${source} to ${destination} Group Trip`),
        source,
        destination,
        startDate: String(suggestion.startDate || prev.startDate || ""),
        endDate: String(suggestion.endDate || prev.endDate || ""),
        totalSeats: Math.max(1, Number(suggestion.totalSeats || prev.totalSeats || 1)),
        pricePerPerson: Math.max(0, Number(suggestion.pricePerPerson || prev.pricePerPerson || 0)),
        description: String(suggestion.description || prev.description || ""),
      }));
      setItinerary(nextItinerary);
      setPickupPoints(nextPickupPoints);
      setSuccessMessage("AI generated trip details have been applied.");
    } catch (autofillError) {
      setError(autofillError.message);
      await showErrorAlert("AI autofill failed", autofillError.message);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const submitTrip = async () => {
    const result = await showConfirmAlert({
      title: isEditMode ? "Save trip changes?" : "Create this trip?",
      text: isEditMode
        ? "This will update the published trip details, itinerary, and pickup points."
        : "This will publish the trip with its itinerary and pickup points.",
      confirmButtonText: isEditMode ? "Save Changes" : "Create Trip",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      const normalizedItinerary = itinerary.map((item, index) => ({
        dayNumber: Number(item.dayNumber || index + 1),
        activities: item.activities,
        accommodation: item.accommodation || null,
      }));
      const normalizedPickupPoints = pickupPoints.map((item, index) => ({
        location: item.location,
        time: item.time,
        sequence: Number(item.sequence || index + 1),
      }));

      if (isEditMode) {
        await api.put(`/trips/${tripId}`, {
          title: tripForm.title,
          source: tripForm.source,
          destination: tripForm.destination,
          transportType: tripForm.transportType,
          startDate: tripForm.startDate,
          endDate: tripForm.endDate,
          totalSeats: Number(tripForm.totalSeats),
          pricePerPerson: Number(tripForm.pricePerPerson),
          paymentEnabled: Boolean(tripForm.paymentEnabled),
          description: tripForm.description,
          status: tripForm.status,
          itinerary: normalizedItinerary,
          pickupPoints: normalizedPickupPoints,
        });
      } else {
        const payload = new FormData();
        payload.append("title", tripForm.title);
        payload.append("source", tripForm.source);
        payload.append("destination", tripForm.destination);
        payload.append("transportType", tripForm.transportType);
        payload.append("startDate", tripForm.startDate);
        payload.append("endDate", tripForm.endDate);
        payload.append("totalSeats", String(Number(tripForm.totalSeats)));
        payload.append("pricePerPerson", String(Number(tripForm.pricePerPerson)));
        payload.append("paymentEnabled", String(Boolean(tripForm.paymentEnabled)));
        payload.append("description", tripForm.description);
        payload.append("itinerary", JSON.stringify(normalizedItinerary));
        payload.append("pickupPoints", JSON.stringify(normalizedPickupPoints));
        tripImages.forEach((image) => {
          payload.append("tripImages", image);
        });

        await api.post("/trips", payload);
      }

      setSuccessMessage(
        isEditMode ? "Trip updated successfully." : "Trip created successfully.",
      );
      await showSuccessAlert(
        isEditMode ? "Trip updated" : "Trip created",
        isEditMode
          ? "Your trip changes have been saved successfully."
          : "Your expedition has been published successfully.",
      );
      navigate("/dashboard/organizer");
    } catch (submitError) {
      setError(submitError.message);
      await showErrorAlert(
        isEditMode ? "Trip update failed" : "Trip creation failed",
        submitError.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#efeee9] px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl rounded-xl bg-[#f7f5ef] p-10 shadow-lg">
          <p className="font-semibold text-error">
            Please login as an organizer to manage trips.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efeee9] text-[#171717]">
      <header className="border-b border-[#ddd8cf] bg-[#f4f2ec]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-5">
          <Link
            to="/"
            className="font-manrope text-xl font-extrabold text-on-surface sm:text-2xl"
          >
            BagPacker
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-on-surface md:flex">
            <Link to="/dashboard/organizer" className="hover:text-[#4f6f16]">
              Organizer Dashboard
            </Link>
            <Link to="/trips/search" className="hover:text-[#4f6f16]">
              Search Trips
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5f7f19]">
              Organizer Workspace
            </p>
            <h1 className="font-manrope text-xl font-extrabold text-on-surface sm:text-2xl md:text-3xl">
              {isEditMode ? "Edit Trip Details" : "Create New Expedition"}
            </h1>
            <p className="mt-2 max-w-3xl text-[#6f736b]">
              {isEditMode
                ? "Update your published trip details, itinerary, pickup points, and status."
                : "Build a complete trip with schedule and pickup points in one submission."}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-2 text-sm font-bold uppercase ${
              organizer?.approvalStatus === "approved"
                ? "bg-[#012d1d] text-[#7fa11c]"
                : organizer?.approvalStatus === "rejected"
                  ? "bg-error-container text-error"
                  : "bg-[#3d4466] text-[#7fa11c]"
            }`}
          >
            {organizer?.approvalStatus || "loading"}
          </span>
        </header>

        {error ? (
          <div className="rounded-2xl bg-error-container p-4 font-semibold text-error">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl bg-[#012d1d] p-4 font-semibold text-[#7fa11c]">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingPanel
            label={isEditMode ? "Loading trip editor..." : "Loading organizer profile..."}
            variant="page"
          />
        ) : null}

        {!isLoading && organizer?.approvalStatus !== "approved" ? (
          <div className="rounded-xl bg-[#f7f5ef] p-10 text-center shadow-sm">
            <h2 className="font-manrope text-xl font-extrabold text-on-surface">
              Organizer approval is still {organizer?.approvalStatus || "pending"}
            </h2>
            <p className="mt-3 text-[#6f736b]">
              Trips can only be created after the organizer profile is approved by an admin.
            </p>
            <Link
              to="/dashboard/organizer"
              className="mt-6 inline-block rounded-xl bg-surface px-6 py-3 font-bold text-white"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : null}

        {!isLoading && organizer?.approvalStatus === "approved" ? (
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <section className="space-y-6">
              <article className="rounded-xl bg-[#f7f5ef] p-6 shadow-sm">
                <h2 className="font-manrope text-xl font-bold text-on-surface">
                  Core Trip Information
                </h2>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <input
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    placeholder="Trip title"
                    value={tripForm.title}
                    onChange={(event) => updateTripField("title", event.target.value)}
                  />
                  <CityAutocompleteInput
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    placeholder="Source city"
                    value={tripForm.source}
                    onChange={(event) => updateTripField("source", event.target.value)}
                  />
                  <CityAutocompleteInput
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    placeholder="Destination city"
                    value={tripForm.destination}
                    onChange={(event) => updateTripField("destination", event.target.value)}
                  />
                  <select
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    value={tripForm.transportType}
                    onChange={(event) => updateTripField("transportType", event.target.value)}
                  >
                    <option value="bus">Bus</option>
                    <option value="car">Car</option>
                    <option value="tempo_traveller">Tempo Traveller</option>
                    <option value="train">Train</option>
                    <option value="flight">Flight</option>
                    <option value="other">Other</option>
                  </select>
                  <label className="flex items-center justify-between rounded-xl bg-[#eeebe4] px-4 py-3 text-sm font-semibold text-on-surface">
                    <span>Accept online payments</span>
                    <input
                      type="checkbox"
                      checked={Boolean(tripForm.paymentEnabled)}
                      onChange={(event) => updateTripField("paymentEnabled", event.target.checked)}
                      className="h-4 w-4 accent-[#124f38]"
                    />
                  </label>
                  {!isEditMode ? (
                    <button
                      type="button"
                      onClick={autofillTripWithAI}
                      disabled={isAutoFilling}
                      className="rounded-xl bg-[#124f38] px-4 py-3 text-sm font-bold text-white disabled:opacity-60 lg:col-span-2"
                    >
                      {isAutoFilling
                        ? "Generating Trip with AI..."
                        : "Auto Fill with AI (Source + Destination)"}
                    </button>
                  ) : null}
                  <input
                    type="number"
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    placeholder="Price per person"
                    value={tripForm.pricePerPerson}
                    onWheel={preventWheelNumberChange}
                    onChange={(event) =>
                      updateTripField("pricePerPerson", event.target.value)
                    }
                  />
                  <input
                    type="date"
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    value={tripForm.startDate}
                    onChange={(event) => updateTripField("startDate", event.target.value)}
                  />
                  <input
                    type="date"
                    className="rounded-xl bg-[#eeebe4] px-4 py-3"
                    value={tripForm.endDate}
                    onChange={(event) => updateTripField("endDate", event.target.value)}
                  />
                  <input
                    type="number"
                    className="rounded-xl bg-[#eeebe4] px-4 py-3 lg:col-span-2"
                    placeholder="Total seats"
                    value={tripForm.totalSeats}
                    onWheel={preventWheelNumberChange}
                    onChange={(event) => updateTripField("totalSeats", event.target.value)}
                  />
                  {isEditMode ? (
                    <select
                      className="rounded-xl bg-[#eeebe4] px-4 py-3 lg:col-span-2"
                      value={tripForm.status}
                      onChange={(event) => updateTripField("status", event.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : null}
                  <textarea
                    rows={5}
                    className="rounded-xl bg-[#eeebe4] px-4 py-3 lg:col-span-2"
                    placeholder="Trip description"
                    value={tripForm.description}
                    onChange={(event) => updateTripField("description", event.target.value)}
                  />
                </div>
              </article>

              <article className="rounded-xl bg-[#f7f5ef] p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-manrope text-xl font-bold text-on-surface">
                    Day-wise Itinerary
                  </h2>
                  <button
                    onClick={addItineraryRow}
                    className="rounded-xl bg-[#124f38] px-4 py-2 text-sm font-bold text-white"
                  >
                    Add Day
                  </button>
                </div>
                <div className="space-y-4">
                  {itinerary.map((item, index) => (
                    <div key={`itinerary-${index}`} className="grid gap-3 lg:grid-cols-[120px_1fr_1fr]">
                      <input
                        type="number"
                        min="1"
                        className="rounded-xl bg-[#eeebe4] px-4 py-3"
                        value={item.dayNumber}
                        onWheel={preventWheelNumberChange}
                        onChange={(event) =>
                          updateItinerary(index, "dayNumber", event.target.value)
                        }
                      />
                      <input
                        className="rounded-xl bg-[#eeebe4] px-4 py-3"
                        placeholder="Activities"
                        value={item.activities}
                        onChange={(event) =>
                          updateItinerary(index, "activities", event.target.value)
                        }
                      />
                      <input
                        className="rounded-xl bg-[#eeebe4] px-4 py-3"
                        placeholder="Accommodation"
                        value={item.accommodation}
                        onChange={(event) =>
                          updateItinerary(index, "accommodation", event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl bg-[#f7f5ef] p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-manrope text-xl font-bold text-on-surface">
                    Pickup Points
                  </h2>
                  <button
                    onClick={addPickupRow}
                    className="rounded-xl bg-[#124f38] px-4 py-2 text-sm font-bold text-white"
                  >
                    Add Point
                  </button>
                </div>
                <div className="space-y-4">
                  {pickupPoints.map((item, index) => (
                    <div key={`pickup-${index}`} className="grid gap-3 lg:grid-cols-[1fr_180px_120px]">
                      <input
                        className="rounded-xl bg-[#eeebe4] px-4 py-3"
                        placeholder="Pickup location"
                        value={item.location}
                        onChange={(event) =>
                          updatePickupPoint(index, "location", event.target.value)
                        }
                      />
                      <input
                        className="rounded-xl bg-[#eeebe4] px-4 py-3"
                        placeholder="Time"
                        value={item.time}
                        onChange={(event) =>
                          updatePickupPoint(index, "time", event.target.value)
                        }
                      />
                      <input
                        type="number"
                        min="1"
                        className="rounded-xl bg-[#eeebe4] px-4 py-3"
                        value={item.sequence}
                        onWheel={preventWheelNumberChange}
                        onChange={(event) =>
                          updatePickupPoint(index, "sequence", event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl bg-[#f7f5ef] p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-manrope text-xl font-bold text-on-surface">
                    {isEditMode ? "Current Trip Images" : "Trip Image Carousel"}
                  </h2>
                  <p className="rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-bold uppercase text-[#124f38]">
                    {isEditMode ? `${existingImages.length} saved` : `${tripImages.length}/10 selected`}
                  </p>
                </div>

                {!isEditMode ? (
                  <>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      multiple
                      onChange={onSelectTripImages}
                      className="w-full rounded-xl bg-[#eeebe4] px-4 py-3 text-sm"
                    />
                    <p className="mt-2 text-xs text-[#6f736b]">
                      You can choose multiple files at once. Each image opens a square crop step.
                    </p>

                    {previewUrls.length ? (
                      <div className="mt-5 space-y-3">
                        <div className="relative overflow-hidden rounded-2xl bg-[#dad5ca]">
                          <img
                            src={previewUrls[previewIndex]}
                            alt={`Trip preview ${previewIndex + 1}`}
                            className="h-64 w-full object-cover"
                          />
                          {previewUrls.length > 1 ? (
                            <>
                              <button
                                onClick={() =>
                                  setPreviewIndex((current) =>
                                    current === 0 ? previewUrls.length - 1 : current - 1,
                                  )
                                }
                                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                                aria-label="Previous trip image"
                              >
                                <span className="material-symbols-outlined">chevron_left</span>
                              </button>
                              <button
                                onClick={() =>
                                  setPreviewIndex((current) => (current + 1) % previewUrls.length)
                                }
                                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                                aria-label="Next trip image"
                              >
                                <span className="material-symbols-outlined">chevron_right</span>
                              </button>
                            </>
                          ) : null}
                        </div>
                        <div className="flex gap-2 overflow-x-auto">
                          {previewUrls.map((previewUrl, index) => (
                            <div key={`${previewUrl}-${index}`} className="space-y-1">
                              <button
                                onClick={() => setPreviewIndex(index)}
                                className={`h-16 min-w-20 overflow-hidden rounded-lg border-2 ${
                                  index === previewIndex ? "border-[#124f38]" : "border-transparent"
                                }`}
                                aria-label={`Preview trip image ${index + 1}`}
                              >
                                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                              </button>
                              <button
                                onClick={() => removeTripImage(index)}
                                className="w-full rounded-md bg-[#fce0e0] px-1 py-1 text-[10px] font-bold uppercase text-error"
                                aria-label={`Remove trip image ${index + 1}`}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[#6f736b]">
                        Select multiple images to preview your trip carousel.
                      </p>
                    )}
                  </>
                ) : existingImages.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[#6f736b]">
                      Existing images stay attached to this trip. Image replacement is not enabled in
                      the edit flow yet.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {existingImages.map((image, index) => (
                        <img
                          key={`${image}-${index}`}
                          src={optimizeCloudinaryImage(image, "f_auto,q_auto,w_800")}
                          alt={`Trip image ${index + 1}`}
                          className="h-36 w-full rounded-2xl object-cover"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#6f736b]">
                    This trip currently has no saved images. The edit flow keeps image uploads
                    unchanged for now.
                  </p>
                )}
              </article>
            </section>

            <aside className="space-y-6">
              <article className="rounded-xl bg-[#012d1d] p-6 text-white shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b6e5c7]">
                  Live Preview
                </p>
                <h3 className="mt-4 font-manrope text-2xl font-bold">
                  {tripForm.title || "Trip title appears here"}
                </h3>
                <p className="mt-3 text-sm text-[#d3efe0]">
                  {tripForm.source || "Source"} to {tripForm.destination || "Destination"}
                </p>
                <div className="mt-6 space-y-2 text-sm text-[#d3efe0]">
                  <p>Price: {Number(tripForm.pricePerPerson) > 0 ? `INR ${tripForm.pricePerPerson}` : "INR --"}</p>
                  <p>Seats: {tripForm.totalSeats || 0}</p>
                  <p>Transport: {tripForm.transportType || "bus"}</p>
                  <p>Payments: {tripForm.paymentEnabled ? "Enabled" : "Disabled"}</p>
                  <p>Status: {tripForm.status || "active"}</p>
                  <p>Itinerary days: {itinerary.length}</p>
                  <p>Pickup points: {pickupPoints.length}</p>
                  <p>Carousel images: {isEditMode ? existingImages.length : tripImages.length}</p>
                </div>
              </article>

              <article className="rounded-xl bg-[#f7f5ef] p-6 shadow-sm">
                <h3 className="font-manrope text-lg font-bold text-on-surface">
                  {isEditMode ? "Ready to save?" : "Ready to publish?"}
                </h3>
                <p className="mt-3 text-sm text-[#6f736b]">
                  {isEditMode
                    ? "Saving will update the trip details, itinerary, pickup points, and status in one request."
                    : "Submission will create the trip with itinerary and pickup points in one request."}
                </p>
                <button
                  onClick={submitTrip}
                  disabled={isSubmitting}
                  className="mt-6 w-full rounded-xl bg-surface px-6 py-4 font-bold text-white disabled:opacity-60"
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Saving Changes..."
                      : "Creating Trip..."
                    : isEditMode
                      ? "Save Changes"
                      : "Create Trip"}
                </button>
              </article>
            </aside>
          </div>
        ) : null}
      </div>

      {activeCropFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-[#f7f5ef] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-manrope text-xl font-bold text-on-surface">
                  Square Crop
                </h2>
                <p className="text-sm text-[#6f736b]">
                  Drag the square to choose the visible area. Remaining queue:{" "}
                  {pendingCropFiles.length}
                </p>
              </div>
              <button
                onClick={skipCurrentImage}
                disabled={isCroppingImage}
                className="rounded-lg bg-[#fce0e0] px-3 py-2 text-xs font-bold uppercase text-error disabled:opacity-60"
              >
                Skip
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-[#dad5ca]">
              <img
                ref={cropImageRef}
                src={activeCropUrl}
                alt="Crop preview"
                onLoad={onCropImageLoad}
                className="max-h-[65vh] w-full select-none object-contain"
                draggable={false}
              />
              {cropBox.size ? (
                <div
                  className="absolute inset-0 touch-none"
                  onPointerMove={onCropPointerMove}
                  onPointerUp={onCropPointerUp}
                  onPointerCancel={onCropPointerUp}
                >
                  <div
                    className={`absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] ${
                      isCropDragging ? "cursor-grabbing" : "cursor-grab"
                    }`}
                    onPointerDown={onCropPointerDown}
                    style={{
                      width: `${cropBox.size}px`,
                      height: `${cropBox.size}px`,
                      transform: `translate(${cropBox.x}px, ${cropBox.y}px)`,
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#124f38]">
                Crop size
              </label>
              <input
                type="range"
                min="1"
                max={Math.max(1, Math.floor(Math.min(cropArea.width, cropArea.height)))}
                value={Math.max(1, cropBox.size)}
                onChange={onCropSizeChange}
                className="w-full"
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                onClick={useOriginalImage}
                disabled={isCroppingImage}
                className="rounded-lg border border-[#124f38] px-4 py-2 text-sm font-bold text-[#124f38] disabled:opacity-60"
              >
                Use Original
              </button>
              <button
                onClick={applySquareCrop}
                disabled={isCroppingImage || !cropBox.size}
                className="rounded-lg bg-[#124f38] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {isCroppingImage ? "Applying..." : "Apply Square Crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

