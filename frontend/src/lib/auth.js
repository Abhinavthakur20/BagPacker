const TOKEN_KEY = "bagpacker_token";
const USER_KEY = "bagpacker_user";
const AUTH_FLAG_KEY = "bagpacker_auth";

export function getAuthToken() {
    return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
    const rawUser = window.localStorage.getItem(USER_KEY);
    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch {
        return null;
    }
}

export function isAuthenticated() {
    return Boolean(getAuthToken());
}

export function getDashboardPath(role) {
    if (role === "admin") return "/admin";
    if (role === "organizer") return "/dashboard/organizer";
    return "/dashboard/traveler";
}

export function persistAuth(token, user) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.localStorage.setItem(AUTH_FLAG_KEY, "true");
}

export function updateStoredUser(user) {
    const currentToken = getAuthToken();
    if (!currentToken) return;
    persistAuth(currentToken, user);
}

export function clearAuth() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(AUTH_FLAG_KEY);
}
