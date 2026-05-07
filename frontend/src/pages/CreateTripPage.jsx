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
  const [onlineImageUrl, setOnlineImageUrl] = useState("");
  const [isAddingImageUrl, setIsAddingImageUrl] = useState(false);
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

  const queueTripImagesForCrop = (files) => {
    if (!Array.isArray(files) || !files.length) {
      return 0;
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

    return filesToQueue.length;
  };

  const onSelectTripImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    queueTripImagesForCrop(files);

    event.target.value = "";
  };

  const addTripImageByUrl = async () => {
    const trimmedUrl = String(onlineImageUrl || "").trim();
    if (!trimmedUrl) {
      const message = "Paste an image URL first.";
      setError(message);
      await showErrorAlert("Image URL missing", message);
      return;
    }

    try {
      setIsAddingImageUrl(true);
      setError("");
      const url = new URL(trimmedUrl);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error("Could not load image from this URL.");
      }

      const imageBlob = await response.blob();
      const imageType = String(imageBlob.type || "").toLowerCase();
      const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowedImageTypes.has(imageType)) {
        throw new Error("Only JPG, PNG, or WEBP image URLs are supported.");
      }

      const extensionByType = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const rawName = decodeURIComponent(
        url.pathname.split("/").filter(Boolean).pop() || "online-image",
      );
      const baseName =
        rawName
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]+/g, "-")
          .replace(/^-+|-+$/g, "") || "online-image";
      const imageFile = new File(
        [imageBlob],
        `${baseName}-online.${extensionByType[imageType] || "jpg"}`,
        {
          type: imageType,
          lastModified: Date.now(),
        },
      );

      const queuedCount = queueTripImagesForCrop([imageFile]);
      if (!queuedCount) {
        throw new Error("Image queue is full (max 10) or this image is already added.");
      }

      setOnlineImageUrl("");
    } catch (addError) {
      const message =
        addError instanceof Error
          ? addError.message
          : "Failed to add image from URL. Please try another link.";
      setError(message);
      await showErrorAlert("Unable to add image URL", message);
    } finally {
      setIsAddingImageUrl(false);
    }
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

  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { id: 1, label: "Basics", icon: "map" },
    { id: 2, label: "Logistics", icon: "payments" },
    { id: 3, label: "Plan", icon: "route" },
    { id: 4, label: "Media", icon: "add_a_photo" },
  ];

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-6">
        <div className="max-w-md rounded-3xl border border-outline-variant/20 bg-surface p-10 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="font-headline text-xl font-black text-on-surface">Access Restricted</h2>
          <p className="mt-3 text-sm font-bold text-on-surface-variant/70">Please login as an organizer to access the Creator Studio.</p>
          <Link to="/auth" className="mt-8 inline-block w-full rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-on-primary">Login Now</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">
      {/* ── Fixed Studio Header ── */}
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-headline text-2xl font-black tracking-tight">
              Bag<span className="text-secondary">Packer</span>
              <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary/60">Studio</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-surface-container-low px-4 py-1.5 md:flex">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Drafting Expedition</p>
            </div>
            <button
              onClick={() => navigate("/dashboard/organizer")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[1.2rem]">close</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl pt-20">
        {/* ── Progress Sidebar ── */}
        <aside className="fixed bottom-0 top-20 hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low/30 px-6 py-10 lg:flex">
          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50">Expedition Builder</h3>
            <p className="mt-1 font-headline text-lg font-black">{isEditMode ? "Edit Mode" : "New Trip"}</p>
          </div>

          <nav className="flex-1 space-y-2">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-300 ${
                  currentStep === step.id
                    ? "bg-primary text-on-primary shadow-xl shadow-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[1.2rem]">{step.icon}</span>
                <span className="text-sm font-bold">{step.label}</span>
                {currentStep > step.id && (
                  <span className="material-symbols-outlined ml-auto text-sm">check_circle</span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-10 rounded-3xl bg-surface-container-high p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Compliance</p>
            <div className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${organizer?.approvalStatus === 'approved' ? 'bg-primary/10 text-primary' : 'bg-error-container text-error'}`}>
              {organizer?.approvalStatus || "pending"}
            </div>
            <p className="mt-3 text-[11px] font-bold text-on-surface-variant leading-relaxed">
              Trips are audited before public listing to ensure traveler safety.
            </p>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="min-h-[calc(100vh-80px)] flex-1 px-6 py-12 lg:ml-72 md:px-16">
          <div className="mx-auto max-w-3xl space-y-12">
            {/* Header Content */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Step 0{currentStep} of 04</p>
              <h1 className="mt-2 font-headline text-4xl font-black text-on-surface tracking-tight">
                {steps.find(s => s.id === currentStep)?.label} <span className="text-secondary-variant">Details</span>
              </h1>
              <p className="mt-3 text-sm font-bold text-on-surface-variant/70 leading-relaxed max-w-xl">
                {currentStep === 1 && "Start with the core logistics. Where are we going and when does the journey begin?"}
                {currentStep === 2 && "Configure the economics. Set your pricing, seat capacity, and financial policies."}
                {currentStep === 3 && "Define the adventure. Map out the daily itinerary and traveler pickup points."}
                {currentStep === 4 && "The first impression. Upload high-quality visuals to showcase the expedition."}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error-container p-5 text-sm font-bold text-error">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm font-bold text-primary">
                <span className="material-symbols-outlined">check_circle</span>
                {successMessage}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-96 items-center justify-center rounded-[3rem] bg-surface-container-low/50">
                <LoadingPanel label="Initializing Studio..." variant="grid" />
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* ── Step 1: Basics ── */}
                {currentStep === 1 && (
                  <div className="grid gap-6">
                    <div className="group relative">
                      <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Expedition Title</label>
                      <input
                        className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                        placeholder="e.g., Hidden Gems of Spiti Valley"
                        value={tripForm.title}
                        onChange={(e) => updateTripField("title", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Source City</label>
                        <CityAutocompleteInput
                          className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                          placeholder="Departure from..."
                          value={tripForm.source}
                          onChange={(e) => updateTripField("source", e.target.value)}
                        />
                      </div>
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Destination</label>
                        <CityAutocompleteInput
                          className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                          placeholder="Arrival at..."
                          value={tripForm.destination}
                          onChange={(e) => updateTripField("destination", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Transport Mode</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                            value={tripForm.transportType}
                            onChange={(e) => updateTripField("transportType", e.target.value)}
                          >
                            <option value="bus">Luxury Bus</option>
                            <option value="car">Private SUV / Car</option>
                            <option value="tempo_traveller">Tempo Traveller</option>
                            <option value="train">Indian Railways</option>
                            <option value="flight">Aviation / Flight</option>
                            <option value="other">Other Mode</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">expand_more</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 px-4 py-2">
                         <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                           <span className="material-symbols-outlined">auto_fix_high</span>
                         </div>
                         <div>
                            <button
                              type="button"
                              onClick={autofillTripWithAI}
                              disabled={isAutoFilling || !tripForm.source || !tripForm.destination}
                              className="text-[11px] font-black uppercase tracking-widest text-secondary hover:underline disabled:opacity-30"
                            >
                              {isAutoFilling ? "AI Drafting..." : "Draft Plan with AI"}
                            </button>
                            <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Generates itinerary & logistics</p>
                         </div>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Start Date</label>
                        <input
                          type="date"
                          className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                          value={tripForm.startDate}
                          onChange={(e) => updateTripField("startDate", e.target.value)}
                        />
                      </div>
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">End Date</label>
                        <input
                          type="date"
                          className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                          value={tripForm.endDate}
                          onChange={(e) => updateTripField("endDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Logistics ── */}
                {currentStep === 2 && (
                  <div className="grid gap-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Price Per Seat (INR)</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-black text-on-surface/40">₹</span>
                          <input
                            type="number"
                            className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface py-5 pl-12 pr-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                            placeholder="0"
                            value={tripForm.pricePerPerson}
                            onWheel={preventWheelNumberChange}
                            onChange={(e) => updateTripField("pricePerPerson", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Total Inventory (Seats)</label>
                        <input
                          type="number"
                          className="w-full rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                          placeholder="1"
                          value={tripForm.totalSeats}
                          onWheel={preventWheelNumberChange}
                          onChange={(e) => updateTripField("totalSeats", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-[2.5rem] border border-outline-variant/20 bg-surface p-6 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                          <span className="material-symbols-outlined">payments</span>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest">Instant Booking</h4>
                          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Allow travelers to pay online via BagPacker</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateTripField("paymentEnabled", !tripForm.paymentEnabled)}
                        className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${tripForm.paymentEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                      >
                        <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${tripForm.paymentEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {isEditMode && (
                      <div className="group relative">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Expedition Status</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none rounded-[2rem] border border-outline-variant/20 bg-surface p-5 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                            value={tripForm.status}
                            onChange={(e) => updateTripField("status", e.target.value)}
                          >
                            <option value="active">Active Listing</option>
                            <option value="completed">Expedition Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none">expand_more</span>
                        </div>
                      </div>
                    )}

                    <div className="group relative">
                      <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">Full Description</label>
                      <textarea
                        rows={6}
                        className="w-full rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 text-sm font-bold text-on-surface outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                        placeholder="Tell the story of this trip..."
                        value={tripForm.description}
                        onChange={(e) => updateTripField("description", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 3: Plan ── */}
                {currentStep === 3 && (
                  <div className="space-y-12">
                    <section className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <h3 className="font-headline text-lg font-black tracking-tight">Expedition <span className="text-secondary">Itinerary</span></h3>
                        <button
                          onClick={addItineraryRow}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Add Day
                        </button>
                      </div>
                      <div className="grid gap-4">
                        {itinerary.map((item, index) => (
                          <div key={`itinerary-${index}`} className="group flex flex-col gap-4 rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm transition hover:border-primary/20 md:flex-row md:items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container-low font-headline text-lg font-black text-primary">
                              {item.dayNumber}
                            </div>
                            <div className="flex-1 space-y-4 md:space-y-0 md:flex md:gap-4">
                              <input
                                className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-3.5 text-xs font-bold outline-none focus:border-primary/40"
                                placeholder="Main activities for this day..."
                                value={item.activities}
                                onChange={(e) => updateItinerary(index, "activities", e.target.value)}
                              />
                              <input
                                className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-3.5 text-xs font-bold outline-none focus:border-primary/40"
                                placeholder="Accommodation / Stay Details"
                                value={item.accommodation}
                                onChange={(e) => updateItinerary(index, "accommodation", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <h3 className="font-headline text-lg font-black tracking-tight">Pickup <span className="text-secondary">Points</span></h3>
                        <button
                          onClick={addPickupRow}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Add Point
                        </button>
                      </div>
                      <div className="grid gap-4">
                        {pickupPoints.map((item, index) => (
                          <div key={`pickup-${index}`} className="flex flex-col gap-4 rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm md:flex-row md:items-center">
                            <div className="flex-1">
                              <input
                                className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-3.5 text-xs font-bold outline-none focus:border-primary/40"
                                placeholder="Pickup location (e.g., Terminal 3, New Delhi)"
                                value={item.location}
                                onChange={(e) => updatePickupPoint(index, "location", e.target.value)}
                              />
                            </div>
                            <div className="flex gap-4 md:w-64">
                              <input
                                className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-3.5 text-xs font-bold outline-none focus:border-primary/40"
                                placeholder="Time (e.g., 08:00 AM)"
                                value={item.time}
                                onChange={(e) => updatePickupPoint(index, "time", e.target.value)}
                              />
                              <input
                                type="number"
                                className="w-20 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-3.5 text-xs font-bold text-center outline-none focus:border-primary/40"
                                value={item.sequence}
                                onChange={(e) => updatePickupPoint(index, "sequence", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {/* ── Step 4: Media ── */}
                {currentStep === 4 && (
                  <div className="space-y-10">
                    <article className="rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="font-headline text-lg font-black tracking-tight">Expedition <span className="text-secondary">Visuals</span></h3>
                          <p className="mt-1 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                            {isEditMode ? `${existingImages.length} saved images` : `${tripImages.length}/10 selected`}
                          </p>
                        </div>
                      </div>

                      {!isEditMode ? (
                        <div className="space-y-8">
                          <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest py-12 text-on-surface-variant transition hover:bg-surface-container">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                              <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-black uppercase tracking-widest">Choose Local Files</p>
                              <p className="mt-1 text-[10px] font-bold opacity-60">High resolution JPG/PNG/WEBP (Max 10)</p>
                            </div>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp"
                              multiple
                              onChange={onSelectTripImages}
                              className="hidden"
                            />
                          </label>

                          <div className="flex flex-col gap-3 md:flex-row">
                            <input
                              type="url"
                              value={onlineImageUrl}
                              onChange={(e) => setOnlineImageUrl(e.target.value)}
                              placeholder="Or paste an online image URL..."
                              className="flex-1 rounded-[2rem] border border-outline-variant/20 bg-surface px-6 py-4 text-xs font-bold outline-none focus:border-primary/40"
                            />
                            <button
                              type="button"
                              onClick={addTripImageByUrl}
                              disabled={isAddingImageUrl || !onlineImageUrl}
                              className="rounded-full bg-surface-container-high px-8 py-4 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-surface-container-highest disabled:opacity-30"
                            >
                              {isAddingImageUrl ? "Syncing..." : "Sync URL"}
                            </button>
                          </div>

                          {previewUrls.length > 0 && (
                            <div className="space-y-6">
                              <div className="relative aspect-video overflow-hidden rounded-[2.5rem] bg-surface-container-low shadow-xl">
                                <img
                                  src={previewUrls[previewIndex]}
                                  alt="Expedition preview"
                                  className="h-full w-full object-cover"
                                />
                                {previewUrls.length > 1 && (
                                  <div className="absolute inset-0 flex items-center justify-between px-6">
                                    <button
                                      onClick={() => setPreviewIndex(c => c === 0 ? previewUrls.length - 1 : c - 1)}
                                      className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
                                    >
                                      <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button
                                      onClick={() => setPreviewIndex(c => (c + 1) % previewUrls.length)}
                                      className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
                                    >
                                      <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-3 overflow-x-auto pb-4">
                                {previewUrls.map((url, idx) => (
                                  <div key={idx} className="group relative shrink-0">
                                    <button
                                      onClick={() => setPreviewIndex(idx)}
                                      className={`h-20 w-24 overflow-hidden rounded-2xl border-4 transition-all ${idx === previewIndex ? 'border-primary' : 'border-transparent'}`}
                                    >
                                      <img src={url} className="h-full w-full object-cover" />
                                    </button>
                                    <button
                                      onClick={() => removeTripImage(idx)}
                                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-error text-on-error shadow-lg"
                                    >
                                      <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {existingImages.map((image, idx) => (
                            <div key={idx} className="aspect-square overflow-hidden rounded-3xl bg-surface-container-low">
                              <img src={optimizeCloudinaryImage(image, "f_auto,q_auto,w_600")} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </article>

                    <article className="rounded-[2.5rem] bg-primary p-10 text-on-primary shadow-2xl shadow-primary/20">
                      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-headline text-2xl font-black">{isEditMode ? "Finalize Changes" : "Ready for Launch?"}</h3>
                          <p className="mt-2 text-sm font-bold opacity-80 max-w-md">
                            By publishing, you confirm that all logistics and safety measures are accurately represented for travelers.
                          </p>
                        </div>
                        <button
                          onClick={submitTrip}
                          disabled={isSubmitting}
                          className="rounded-[2rem] bg-secondary px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-on-secondary shadow-xl transition hover:scale-[1.03] disabled:opacity-50"
                        >
                          {isSubmitting ? (isEditMode ? "Updating..." : "Launching...") : (isEditMode ? "Save Evolution" : "Publish Expedition")}
                        </button>
                      </div>
                    </article>
                  </div>
                )}

                {/* ── Navigation Buttons (Bottom) ── */}
                <div className="flex items-center justify-between border-t border-outline-variant/10 pt-10">
                  <button
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary disabled:opacity-20"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Back
                  </button>
                  <div className="flex gap-2">
                    {steps.map(s => (
                      <div key={s.id} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${currentStep === s.id ? 'bg-primary w-12' : 'bg-outline-variant/30'}`} />
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                    disabled={currentStep === 4}
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary hover:underline disabled:opacity-20"
                  >
                    Next Step
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Modal: Image Cropper ── */}
      {activeCropFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-xl p-6">
          <div className="w-full max-w-4xl overflow-hidden rounded-[3rem] border border-outline-variant/20 bg-surface shadow-[0_32px_64px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-10 py-6">
              <div>
                <h2 className="font-headline text-xl font-black text-on-surface">Precision <span className="text-secondary">Cropper</span></h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Choose the focal point for your trip card</p>
              </div>
              <button
                onClick={skipCurrentImage}
                disabled={isCroppingImage}
                className="text-[10px] font-black uppercase tracking-widest text-error hover:underline"
              >
                Skip File
              </button>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px]">
              <div className="relative flex items-center justify-center bg-surface-container-low p-10">
                <div className="relative inline-block overflow-hidden rounded-3xl shadow-2xl">
                  <img
                    ref={cropImageRef}
                    src={activeCropUrl}
                    alt="Cropper"
                    onLoad={onCropImageLoad}
                    className="max-h-[50vh] w-auto select-none object-contain"
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
                        className={`absolute border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ${
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
              </div>

              <div className="flex flex-col border-l border-outline-variant/10 p-10">
                <div className="flex-1 space-y-8">
                  <div>
                    <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Focus Size</label>
                    <input
                      type="range"
                      min="1"
                      max={Math.max(1, Math.floor(Math.min(cropArea.width, cropArea.height)))}
                      value={Math.max(1, cropBox.size)}
                      onChange={onCropSizeChange}
                      className="w-full accent-primary"
                    />
                    <div className="mt-2 flex justify-between text-[9px] font-black uppercase text-on-surface-variant/40">
                      <span>Tight</span>
                      <span>Wide</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-surface-container-low p-5 text-[11px] font-bold text-on-surface-variant/80 leading-relaxed">
                    Choose a square crop to ensure your trip looks perfect on all search cards and carousels.
                  </div>
                </div>

                <div className="mt-10 space-y-3">
                  <button
                    onClick={applySquareCrop}
                    disabled={isCroppingImage || !cropBox.size}
                    className="w-full rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02]"
                  >
                    {isCroppingImage ? "Processing..." : "Apply Focus"}
                  </button>
                  <button
                    onClick={useOriginalImage}
                    disabled={isCroppingImage}
                    className="w-full rounded-2xl bg-surface-container-high py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant transition hover:bg-surface-container-highest"
                  >
                    Use Full Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
