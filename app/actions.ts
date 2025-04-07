/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { loginAndFetch, unfollowUsers } from "@/lib/bsk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sessionCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Cache the session and state
    sessionCache = session;
    stateCache = { handle, followers, following };

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

    await unfollowUsers(sessionCache, handles);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to unfollow users. Please try again.",
    };
  }
}
