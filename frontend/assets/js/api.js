const API_BASE_URL = "https://optipesa-fms.onrender.com";

/* ----------------------------
   Token helpers
---------------------------- */
function getAccessToken() {
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

function saveTokens(access, refresh) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_user");
}

function forceLogout() {
  clearTokens();
  if (!window.location.pathname.endsWith("login.html")) {
    window.location.href = "login.html";
  }
}

/* ----------------------------
   Safely read response
---------------------------- */
async function readResponse(res) {
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await res.json().catch(() => ({}));
  }

  const text = await res.text().catch(() => "");
  return text ? { detail: text } : {};
}

/* ----------------------------
   Refresh access token
---------------------------- */
async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await readResponse(res);

    if (data?.access) {
      saveTokens(data.access, null);
      return data.access;
    }

    clearTokens();
    return null;
  } catch (err) {
    console.error("Token refresh failed:", err);
    clearTokens();
    return null;
  }
}

/* ----------------------------
   Build request headers
---------------------------- */
function buildHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers["Content-Type"] = "application/json";

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/* ----------------------------
   Main request helper
---------------------------- */
async function apiRequest(path, method = "GET", body = null, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isJson = options.isJson !== false;

  const headers = buildHeaders(isJson);
  const fetchOptions = {
    method,
    headers,
  };

  if (body !== null && body !== undefined) {
    fetchOptions.body = isJson ? JSON.stringify(body) : body;
  }

  let res;

  try {
    res = await fetch(url, fetchOptions);
  } catch (err) {
    console.error("Network error:", err);
    throw new Error("Unable to reach server. Please check your connection.");
  }

  if (res.status === 401) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      fetchOptions.headers["Authorization"] = `Bearer ${newToken}`;
      try {
        res = await fetch(url, fetchOptions);
      } catch (err) {
        console.error("Retry after refresh failed:", err);
        throw new Error("Unable to reach server. Please check your connection.");
      }
    } else {
      forceLogout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  const data = await readResponse(res);

  if (!res.ok) {
    let msg =
      data?.detail ||
      data?.message ||
      data?.error ||
      null;

    if (!msg && data && typeof data === "object") {
      const firstKey = Object.keys(data)[0];
      const firstVal = data[firstKey];

      if (Array.isArray(firstVal)) {
        msg = `${firstKey}: ${firstVal[0]}`;
      } else if (typeof firstVal === "string") {
        msg = `${firstKey}: ${firstVal}`;
      }
    }

    if (!msg) msg = `Request failed (${res.status})`;

    console.error("API ERROR:", method, url, res.status, data);
    throw new Error(msg);
  }

  return data;
}