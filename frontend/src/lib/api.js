import { getAuthToken } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.startsWith("http") ? new URL(API_BASE_URL).origin : "";
const responseCache = new Map();
const inFlightRequests = new Map();

const cloneData = (value) => {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const getRequestCacheKey = ({ method, path, token, body }) =>
    `${method}:${path}:token=${token || ""}:body=${body ? JSON.stringify(body) : ""}`;

async function request(path, options = {}) {
    const { method = "GET", body, headers = {}, token, cacheTtlMs = 0, forceRefresh = false } = options;
    const resolvedToken = token ?? getAuthToken();
    const normalizedMethod = String(method || "GET").toUpperCase();
    const requestKey = getRequestCacheKey({
        method: normalizedMethod,
        path,
        token: resolvedToken,
        body,
    });

    if (normalizedMethod === "GET" && cacheTtlMs > 0 && !forceRefresh) {
        const cachedResponse = responseCache.get(requestKey);
        if (cachedResponse && cachedResponse.expireAt > Date.now()) {
            return cloneData(cachedResponse.data);
        }
    }

    if (inFlightRequests.has(requestKey)) {
        return inFlightRequests.get(requestKey);
    }

    const requestHeaders = { ...headers };
    let payload = body;

    if (body && !(body instanceof FormData)) {
        requestHeaders["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    if (resolvedToken) {
        requestHeaders.Authorization = `Bearer ${resolvedToken}`;
    }

    const requestPromise = (async () => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: normalizedMethod,
            headers: requestHeaders,
            body: payload,
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const errorMessage =
                typeof data === "object" && data?.message
                    ? data.message
                    : "Request failed. Please try again.";
            throw new Error(errorMessage);
        }

        if (normalizedMethod === "GET" && cacheTtlMs > 0) {
            responseCache.set(requestKey, {
                data: cloneData(data),
                expireAt: Date.now() + cacheTtlMs,
            });
        }

        return data;
    })();

    inFlightRequests.set(requestKey, requestPromise);
    try {
        return await requestPromise;
    } finally {
        inFlightRequests.delete(requestKey);
    }
}

export const api = {
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) =>
        request(path, { ...options, method: "POST", body }),
    patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
    put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
    del: (path, options) => request(path, { ...options, method: "DELETE" }),
};

export const resolveMediaUrl = (mediaPath = "") => {
    if (!mediaPath) {
        return "";
    }

    if (/^https?:\/\//i.test(mediaPath)) {
        return mediaPath;
    }

    if (mediaPath.startsWith("/") && API_ORIGIN) {
        return `${API_ORIGIN}${mediaPath}`;
    }

    return mediaPath;
};

export const optimizeCloudinaryImage = (mediaPath = "", transformations = "f_auto,q_auto,w_1200") => {
    const resolvedUrl = resolveMediaUrl(mediaPath);
    if (!resolvedUrl.includes("res.cloudinary.com") || !resolvedUrl.includes("/upload/")) {
        return resolvedUrl;
    }

    return resolvedUrl.replace("/upload/", `/upload/${transformations}/`);
};
