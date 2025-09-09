/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import {
  loginAndFetch,
  unfollowUsers,
  blockUsers,
  getDetailedProfiles,
} from "@/lib/bsk";

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

    // Only store in the response, not in cache
    // Disabled caching - don't store in sessionCache/stateCache
    return {
      success: true,
      session: result.session,
      handle,
      followers: result.followers,
      following: result.following,
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

export async function handleUnfollow(session: any, handles: string[]) {
  try {
    // Since we're not using caching, we need the session to be passed explicitly
    if (!handles || !handles.length) {
      throw new Error("No handles provided to unfollow.");
    }

    if (!session) {
      throw new Error("Session not provided. Please login again.");
    }

    // Pass the session token and handles to unfollow
    await unfollowUsers(session, handles);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to unfollow users. Please try again.",
    };
  }
}

export async function handleBlock(session: any, handles: string[]) {
  try {
    // Since we're not using caching, we need the session to be passed explicitly
    if (!handles || !handles.length) {
      throw new Error("No handles provided to block.");
    }

    if (!session) {
      throw new Error("Session not provided. Please login again.");
    }

    // Pass the session token and handles to block
    await blockUsers(session, handles);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to block users. Please try again.",
    };
  }
}

// Add a function to clear session data on logout - not needed since we're not caching
export async function clearSession() {
  // No need to clear cache as we're not using it
  return { success: true };
}

export async function handleGetDetailedProfiles(
  session: any,
  handles: string[]
) {
  try {
    if (!handles || !handles.length) {
      return { success: true, profiles: [] };
    }

    if (!session) {
      throw new Error("Session not provided. Please login again.");
    }

    const profiles = await getDetailedProfiles(session, handles);
    return { success: true, profiles };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch detailed profiles.",
      profiles: [],
    };
  }
}
