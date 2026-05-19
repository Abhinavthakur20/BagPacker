import { getAuthToken, clearAuth } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.startsWith("http") ? new URL(API_BASE_URL).origin : "";
const responseCache = new Map();
const inFlightRequests = new Map();
const RESPONSE_CACHE_MAX_ENTRIES = 200;

// Will be set by the Redux store after it initialises
let _reduxLogout = null;
export function setLogoutDispatcher(fn) {
    _reduxLogout = typeof fn === "function" ? fn : null;
}

const cloneData = (value) => {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const getTokenFingerprint = (token) => {
    if (!token) return "";
    // Use last 8 chars as a short fingerprint to avoid leaking full token in memory keys
    return token.slice(-8);
};

const getRequestCacheKey = ({ method, path, token, body }) =>
    `${method}:${path}:t=${getTokenFingerprint(token)}:body=${body ? JSON.stringify(body) : ""}`;

const pruneResponseCache = () => {
    const now = Date.now();
    for (const [cacheKey, cacheValue] of responseCache.entries()) {
        if (!cacheValue || cacheValue.expireAt <= now) {
            responseCache.delete(cacheKey);
        }
    }

    if (responseCache.size <= RESPONSE_CACHE_MAX_ENTRIES) {
        return;
    }

    const overflow = responseCache.size - RESPONSE_CACHE_MAX_ENTRIES;
    let removed = 0;
    for (const cacheKey of responseCache.keys()) {
        responseCache.delete(cacheKey);
        removed += 1;
        if (removed >= overflow) {
            break;
        }
    }
};

const getPersistedData = (key) => {
    try {
        const item = localStorage.getItem(`api_cache_${key}`);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed.expireAt && parsed.expireAt < Date.now()) {
            localStorage.removeItem(`api_cache_${key}`);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
};

const setPersistedData = (key, data, ttl) => {
    try {
        const cacheValue = {
            data,
            expireAt: Date.now() + ttl,
        };
        localStorage.setItem(`api_cache_${key}`, JSON.stringify(cacheValue));
    } catch {
        // LocalStorage might be full
    }
};

async function request(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        token,
        cacheTtlMs = 0,
        forceRefresh = false,
        persistCache = false,
    } = options;
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

        if (persistCache) {
            const persisted = getPersistedData(requestKey);
            if (persisted) {
                // Return persisted data immediately, but we might want to refresh it in the background
                // if we don't return here. For simplicity, we return it if it's fresh enough.
                return persisted;
            }
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

            // Auto-logout on 401: expired or invalid token
            if (response.status === 401) {
                clearAuth();
                responseCache.clear();
                if (_reduxLogout) {
                    _reduxLogout();
                }
            }

            throw new Error(errorMessage);
        }

        if (normalizedMethod === "GET" && cacheTtlMs > 0) {
            pruneResponseCache();
            responseCache.set(requestKey, {
                data: cloneData(data),
                expireAt: Date.now() + cacheTtlMs,
            });

            if (persistCache) {
                setPersistedData(requestKey, data, cacheTtlMs);
            }
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
