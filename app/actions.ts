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
    const totpCode = formData.get("totpCode") as string;

    // Check if we have the required credentials
    if (!handle || !password) {
      console.error("Missing credentials:", {
        handle: !!handle,
        password: !!password,
      });
      return {
        success: false,
        error: "Username and password are required",
      };
    }

    // Remove leading @ if present
    if (handle.startsWith("@")) {
      handle = handle.slice(1);
    }

    const result = await loginAndFetch(handle, password, totpCode || undefined);

    if (result.requires2FA) {
      return {
        success: false,
        requires2FA: true,
        error: "Two-factor authentication code required",
      };
    }

    // Only cache the session and data, not the credentials
    sessionCache = result.session;
    stateCache = {
      handle, // We need to keep the handle for API calls
      followers: result.followers,
      following: result.following,
    };

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Login error:", error.message, error.status, error.error);

    // Improved error handling for 2FA-related errors
    if (
      (error.status === 401 || error.status === 400) &&
      (error.message?.toLowerCase().includes("authentication") ||
        error.message?.toLowerCase().includes("verification") ||
        error.message?.toLowerCase().includes("2fa") ||
        error.message?.toLowerCase().includes("totp") ||
        error.message?.toLowerCase().includes("email"))
    ) {
      return {
        success: false,
        requires2FA: true,
        error: "Two-factor authentication code required",
      };
    }

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
