/* eslint-disable @typescript-eslint/no-explicit-any */
import { BskyAgent, AtpSessionData } from "@atproto/api";

export async function loginAndFetch(
  handle: string,
  password: string,
  totpCode?: string
) {
  const agent = new BskyAgent({ service: "https://bsky.social" });

  try {
    // SECURITY: We directly pass the credentials to the API without storing them
    await agent.login({
      identifier: handle,
      password,
      ...(totpCode ? { authFactorToken: totpCode } : {}),
    });

    // SECURITY: Create a clean session object without the password or any sensitive data
    const session = {
      did: agent.session?.did,
      handle: agent.session?.handle,
      accessJwt: agent.session?.accessJwt,
      refreshJwt: agent.session?.refreshJwt,
    };

    // Fetch data with authenticated session
    const following = [];
    let cursor: string | undefined;
    while (true) {
      const res = await agent.api.app.bsky.graph.getFollows({
        actor: handle,
        cursor,
      });
      following.push(...res.data.follows);
      if (!res.data.cursor) break;
      cursor = res.data.cursor;
    }

    // Log a sample of following data structure
    if (following.length > 0) {
      console.log(
        "Sample following user data:",
        JSON.stringify(following[0], null, 2)
      );
    }

    const followers = [];
    cursor = undefined;
    while (true) {
      const res = await agent.api.app.bsky.graph.getFollowers({
        actor: handle,
        cursor,
      });
      followers.push(...res.data.followers);
      if (!res.data.cursor) break;
      cursor = res.data.cursor;
    }

    // Automatically fetch detailed profiles for all following users
    console.log(`Fetching detailed profiles for ${following.length} users...`);
    const detailedProfiles = [];

    // Batch requests in chunks to avoid overwhelming the API
    const chunkSize = 25; // Reasonable batch size
    const handles = following.map((f) => f.handle);

    for (let i = 0; i < handles.length; i += chunkSize) {
      const chunk = handles.slice(i, i + chunkSize);
      const promises = chunk.map(async (handle) => {
        try {
          const profile = await agent.api.app.bsky.actor.getProfile({
            actor: handle,
          });

          // Log the first detailed profile to see the structure
          if (detailedProfiles.length === 0) {
            console.log(
              "Sample detailed profile data:",
              JSON.stringify(profile.data, null, 2)
            );
          }

          // Create a serializable version of the profile data
          // This function aggressively converts any problematic objects to strings
          const sanitizeForSerialization = (obj: any): any => {
            if (obj === null || obj === undefined) {
              return obj;
            }

            // Handle primitive types
            if (typeof obj !== "object") {
              return obj;
            }

            // Handle arrays
            if (Array.isArray(obj)) {
              return obj.map(sanitizeForSerialization);
            }

            // For all objects, check if they have any problematic properties
            // that would indicate they're not plain objects
            if (
              obj.constructor?.name === "CID" ||
              obj.constructor?.name !== "Object" ||
              typeof obj.toJSON === "function" ||
              obj.code !== undefined ||
              obj.version !== undefined ||
              obj.multihash !== undefined ||
              obj.asCID !== undefined ||
              (typeof obj.toString === "function" && 
               typeof obj.toString() === "string" && 
               obj.toString().length > 10 && 
               (obj.toString().startsWith("baf") || obj.toString().startsWith("bafy")))
            ) {
              // Convert problematic objects to strings
              try {
                return String(obj);
              } catch {
                return "[Unparseable Object]";
              }
            }

            // For plain objects, recursively sanitize all properties
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
              try {
                sanitized[key] = sanitizeForSerialization(value);
              } catch {
                // If sanitization fails for a property, convert it to string
                sanitized[key] = String(value);
              }
            }
            return sanitized;
          };

          const serializedProfile = sanitizeForSerialization(profile.data);
          return serializedProfile;
        } catch (error) {
          console.error(`Failed to fetch profile for ${handle}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      detailedProfiles.push(...results.filter((profile) => profile !== null));

      // Add a small delay between batches to be respectful to the API
      if (i + chunkSize < handles.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // SECURITY: We only return what's needed, no credentials
    return {
      followers: followers.map((f) => ({
        ...f,
        avatar: f.avatar ? String(f.avatar) : undefined,
      })),
      following: following.map((f) => ({
        ...f,
        avatar: f.avatar ? String(f.avatar) : undefined,
      })),
      detailedProfiles, // Include detailed profiles in the initial response
      session, // Clean session object without password
      requires2FA: false,
    };
  } catch (error: any) {
    // SECURITY: Don't log the full error which might contain sensitive info
    console.error("Login error:", {
      status: error.status,
      message: error.message,
      type: error.name,
    });

    // 2FA detection logic
    if (
      error.status === 401 &&
      (error.message?.toLowerCase().includes("totp") ||
        error.message?.toLowerCase().includes("authentication code") ||
        error.message?.toLowerCase().includes("verification") ||
        error.message?.toLowerCase().includes("2fa") ||
        error.message?.toLowerCase().includes("two-factor") ||
        error.message?.toLowerCase().includes("two factor") ||
        error.error?.toLowerCase().includes("totp") ||
        (error.data &&
          error.data.error?.toLowerCase().includes("authentication")) ||
        error.message?.toLowerCase().includes("email") ||
        error.message?.toLowerCase().includes("verify"))
    ) {
      return {
        followers: [],
        following: [],
        session: null,
        requires2FA: true,
      };
    }
    throw error; // Re-throw for other errors
  }
}

export async function unfollowUsers(
  agentSession: AtpSessionData,
  handlesToUnfollow: string[]
) {
  // SECURITY: We only use the session tokens, never credentials
  const agent = new BskyAgent({ service: "https://bsky.social" });

  // SECURITY: Only use the pre-established session
  await agent.resumeSession(agentSession);

  for (const handle of handlesToUnfollow) {
    const profile = await agent.api.app.bsky.actor.getProfile({
      actor: handle,
    });
    const followUri = profile.data.viewer?.following;

    if (!followUri) continue;

    const parts = followUri.split("/");
    const rkey = parts.pop()!;
    const repo = parts[2]; // did

    await agent.api.com.atproto.repo.deleteRecord({
      repo,
      collection: "app.bsky.graph.follow",
      rkey,
    });
  }
}

export async function getDetailedProfiles(
  agentSession: AtpSessionData,
  handles: string[]
) {
  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.resumeSession(agentSession);

  const detailedProfiles = [];

  // Batch requests in chunks to avoid overwhelming the API
  const chunkSize = 25; // Reasonable batch size
  for (let i = 0; i < handles.length; i += chunkSize) {
    const chunk = handles.slice(i, i + chunkSize);
    const promises = chunk.map(async (handle) => {
      try {
        const profile = await agent.api.app.bsky.actor.getProfile({
          actor: handle,
        });

        // Log the first detailed profile to see the structure
        if (detailedProfiles.length === 0) {
          console.log(
            "Sample detailed profile data:",
            JSON.stringify(profile.data, null, 2)
          );
        }

        // Create a serializable version of the profile data
        // This function aggressively converts any problematic objects to strings
        const sanitizeForSerialization = (obj: any): any => {
          if (obj === null || obj === undefined) {
            return obj;
          }

          // Handle primitive types
          if (typeof obj !== "object") {
            return obj;
          }

          // Handle arrays
          if (Array.isArray(obj)) {
            return obj.map(sanitizeForSerialization);
          }

          // For all objects, check if they have any problematic properties
          // that would indicate they're not plain objects
          if (
            obj.constructor?.name === "CID" ||
            obj.constructor?.name !== "Object" ||
            typeof obj.toJSON === "function" ||
            obj.code !== undefined ||
            obj.version !== undefined ||
            obj.multihash !== undefined ||
            obj.asCID !== undefined ||
            (typeof obj.toString === "function" && 
             typeof obj.toString() === "string" && 
             obj.toString().length > 10 && 
             (obj.toString().startsWith("baf") || obj.toString().startsWith("bafy")))
          ) {
            // Convert problematic objects to strings
            try {
              return String(obj);
            } catch {
              return "[Unparseable Object]";
            }
          }

          // For plain objects, recursively sanitize all properties
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            try {
              sanitized[key] = sanitizeForSerialization(value);
            } catch {
              // If sanitization fails for a property, convert it to string
              sanitized[key] = String(value);
            }
          }
          return sanitized;
        };
        const serializedProfile = sanitizeForSerialization(profile.data);
        return serializedProfile;
      } catch (error) {
        console.error(`Failed to fetch profile for ${handle}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    detailedProfiles.push(...results.filter((profile) => profile !== null));

    // Add a small delay between batches to be respectful to the API
    if (i + chunkSize < handles.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return detailedProfiles;
}
