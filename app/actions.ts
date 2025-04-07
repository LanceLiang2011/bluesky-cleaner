/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { loginAndFetch, unfollowUsers } from "@/lib/bsk";

// Store only the session, not user credentials
let sessionCache: any = null;
// Store followers/following data but not credentials
let stateCache: any = null;

export async function handleLogin(formData: FormData) {
  try {
    let handle = formData.get("handle") as string;
    const password = formData.get("password") as string;

    if (!handle || !password) {
      return {
        success: false,
        error: "Username and password are required",
      };
    }

    // Remove leading @ if present
    if (handle.startsWith("@")) {
      handle = handle.slice(1);
    }

    const { followers, following, session } = await loginAndFetch(
      handle,
      password
    );

    // Only cache the session and data, not the credentials
    sessionCache = session;
    stateCache = {
      handle, // We need to keep the handle for API calls
      followers,
      following,
    };

    return {
      success: true,
    };
  } catch (error: any) {
    // Handle specific error types based on error message or code
    if (error.status === 401 || error.message?.includes("authentication")) {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }

    // Handle network errors
    if (error.message?.includes("network") || error.name === "NetworkError") {
      return {
        success: false,
        error: "Network error. Please check your connection and try again.",
      };
    }

    // Generic error handling
    return {
      success: false,
      error: error.message || "Login failed. Please try again.",
    };
  }
}

export async function getFollowerState() {
  return stateCache;
}

export async function handleUnfollow(handles: string[]) {
  try {
    if (!sessionCache) {
      throw new Error("Session expired. Please login again.");
    }

    // Pass only the session token and handles to unfollow, no credentials
    await unfollowUsers(sessionCache, handles);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to unfollow users. Please try again.",
    };
  }
}

// Add a function to clear session data on logout
export async function clearSession() {
  sessionCache = null;
  stateCache = null;
  return { success: true };
}
