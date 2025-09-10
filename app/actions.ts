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

    // Log original handle for debugging
    console.log("Original handle:", JSON.stringify(handle));

    // Remove leading @ if present
    if (handle.startsWith("@")) {
      handle = handle.slice(1);
    }

    // Clean handle carefully to preserve domain integrity
    // Only remove truly problematic invisible characters that break URLs
    handle = handle
      .trim()
      // Remove zero-width spaces and similar invisible characters
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Remove directional formatting characters
      .replace(/[\u2060-\u2069]/g, "")
      .trim();

    // Don't lowercase or do other modifications - let BskyAgent handle domain resolution

    // Log cleaned handle for debugging
    console.log("Cleaned handle:", JSON.stringify(handle));

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

    // Handle specific error types with more helpful messages
    if (error.status === 429) {
      return {
        success: false,
        error:
          "Too many login attempts. Please wait a few minutes and try again.",
      };
    }

    if (error.status === 401) {
      // More specific error messages for authentication failures
      if (error.message?.toLowerCase().includes("app password")) {
        return {
          success: false,
          error:
            "Please use an App Password instead of your regular password. Generate one in your Bluesky settings.",
        };
      }

      return {
        success: false,
        error:
          "Invalid username or password. Make sure you're using an App Password if you have 2FA enabled.",
      };
    }

    if (error.status === 400) {
      // Check if it's a handle resolution issue
      if (
        error.message?.toLowerCase().includes("handle") ||
        error.message?.toLowerCase().includes("identifier") ||
        error.message?.toLowerCase().includes("invalid")
      ) {
        return {
          success: false,
          error:
            "Invalid handle format. For custom domains like example.com, make sure the domain is properly configured for Bluesky.",
        };
      }
      return {
        success: false,
        error: "Invalid request format. Please check your username format.",
      };
    }

    // Handle network errors
    if (error.message?.includes("network") || error.name === "NetworkError") {
      return {
        success: false,
        error: "Network error. Please check your connection and try again.",
      };
    }

    if (error.message?.includes("fetch")) {
      return {
        success: false,
        error: "Connection failed. Please check your internet connection.",
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
