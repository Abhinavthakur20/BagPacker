const crypto = require("crypto");

const buildSignature = (paramsToSign, apiSecret) => {
  const serialized = Object.entries(paramsToSign)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const signature = crypto
    .createHash("sha256")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");

  console.log("[cloudinary] algorithm=sha256 sigLength=%s stringToSign=%s", signature.length, serialized);

  return signature;
};

const TRANSFORMATION_KEY_MAP = {
  angle: "a",
  background: "b",
  crop: "c",
  dpr: "dpr",
  effect: "e",
  fetch_format: "f",
  gravity: "g",
  height: "h",
  opacity: "o",
  quality: "q",
  radius: "r",
  width: "w",
  x: "x",
  y: "y",
};

const serializeTransformation = (transformations = {}) =>
  Object.entries(transformations)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${TRANSFORMATION_KEY_MAP[key] || key}_${value}`)
    .join(",");

const uploadBufferToCloudinary = async ({
  buffer,
  originalname,
  folder,
  resourceType = "auto",
  transformations = {},
}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration is missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const transformation = serializeTransformation(transformations);
  const paramsToSign = {
    folder,
    timestamp,
    transformation,
    unique_filename: "true",
    use_filename: "true",
  };
  const signature = buildSignature(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("file", new Blob([buffer]), originalname || `upload-${timestamp}`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("use_filename", "true");
  formData.append("unique_filename", "true");
  if (transformation) {
    formData.append("transformation", transformation);
  }
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  return data;
};

module.exports = {
  uploadBufferToCloudinary,
};
