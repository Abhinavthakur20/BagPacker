import { getAuthToken } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.startsWith("http") ? new URL(API_BASE_URL).origin : "";

async function request(path, options = {}) {
    const { method = "GET", body, headers = {}, token } = options;
    const resolvedToken = token ?? getAuthToken();

    const requestHeaders = { ...headers };
    let payload = body;

    if (body && !(body instanceof FormData)) {
        requestHeaders["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    if (resolvedToken) {
        requestHeaders.Authorization = `Bearer ${resolvedToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
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

    return data;
}

export const api = {
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) =>
        request(path, { ...options, method: "POST", body }),
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
