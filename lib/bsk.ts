/* eslint-disable @typescript-eslint/no-explicit-any */
import { BskyAgent, AtpSessionData } from "@atproto/api";
import { sanitizeForSerialization } from "./utils";

export async function loginAndFetch(
  handle: string,
  password: string,
  totpCode?: string
) {
  const agent = new BskyAgent({ service: "https://bsky.social" });

  try {
    console.log("Attempting login with handle:", JSON.stringify(handle));

    // SECURITY: We directly pass the credentials to the API without storing them
    await agent.login({
      identifier: handle,
      password,
      ...(totpCode ? { authFactorToken: totpCode } : {}),
    });

    console.log("Login successful for handle:", handle);

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
        limit: 100,
      });
      following.push(...res.data.follows);
      if (!res.data.cursor) break;
      cursor = res.data.cursor;
    }

    // Log a sample of 10 following data structure
    if (following.length > 0) {
      console.log(
        "Sample following user data:",
        JSON.stringify(following.slice(0, 10), null, 2)
      );
    }

    const followers = [];
    cursor = undefined;
    while (true) {
      const res = await agent.api.app.bsky.graph.getFollowers({
        actor: handle,
        cursor,
        limit: 100,
      });
      followers.push(...res.data.followers);
      if (!res.data.cursor) break;
      cursor = res.data.cursor;
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

export async function blockUsers(
  agentSession: AtpSessionData,
  handlesToBlock: string[]
) {
  // SECURITY: We only use the session tokens, never credentials
  const agent = new BskyAgent({ service: "https://bsky.social" });

  // SECURITY: Only use the pre-established session
  await agent.resumeSession(agentSession);

  for (const handle of handlesToBlock) {
    const profile = await agent.api.app.bsky.actor.getProfile({
      actor: handle,
    });

    const did = profile.data.did;

    // Create a block record
    await agent.api.com.atproto.repo.createRecord({
      repo: agentSession.did,
      collection: "app.bsky.graph.block",
      record: {
        subject: did,
        createdAt: new Date().toISOString(),
      },
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
  const failedHandles = new Set();

  // Optimized batch processing using getProfiles API (up to 25 actors per call)
  const BATCH_SIZE = 25; // Maximum allowed by getProfiles API
  const CONCURRENT_BATCHES = 6; // Number of concurrent API calls
  const MAX_RETRIES = 3; // Maximum retry attempts for failed batches

  // Split handles into batches of 25
  const batches = [];
  for (let i = 0; i < handles.length; i += BATCH_SIZE) {
    batches.push(handles.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Processing ${handles.length} profiles in ${batches.length} batches of up to ${BATCH_SIZE} profiles each using getProfiles API`
  );

  // Function to process a single batch with retry logic
  const processBatchWithRetry = async (
    batchHandles: string[],
    batchIndex: number,
    retryCount = 0
  ): Promise<any[]> => {
    try {
      // Use getProfiles API to fetch multiple profiles at once
      const response = await agent.api.app.bsky.actor.getProfiles({
        actors: batchHandles,
      });

      // Log the first detailed profile to see the structure (only once)
      if (detailedProfiles.length === 0 && response.data.profiles.length > 0) {
        console.log(
          "Sample detailed profile data from getProfiles:",
          JSON.stringify(response.data.profiles[0], null, 2)
        );
      }

      // Serialize all profiles from this batch
      const serializedProfiles = response.data.profiles.map((profile) =>
        sanitizeForSerialization(profile)
      );

      console.log(
        `✓ Completed batch ${batchIndex + 1}/${batches.length}: ${
          serializedProfiles.length
        }/${batchHandles.length} profiles`
      );

      return serializedProfiles;
    } catch (error) {
      console.error(
        `✗ Failed to fetch batch ${batchIndex + 1} (attempt ${
          retryCount + 1
        }):`,
        error
      );

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(
          `Retrying batch ${batchIndex + 1} in ${(retryCount + 1) * 1000}ms...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return processBatchWithRetry(batchHandles, batchIndex, retryCount + 1);
      }

      // If retries exhausted, fall back to individual requests
      console.log(
        `All retries exhausted for batch ${
          batchIndex + 1
        }, falling back to individual requests`
      );

      const fallbackResults = [];
      for (const handle of batchHandles) {
        try {
          const profile = await agent.api.app.bsky.actor.getProfile({
            actor: handle,
          });
          const serializedProfile = sanitizeForSerialization(profile.data);
          fallbackResults.push(serializedProfile);
        } catch (individualError) {
          console.error(
            `Failed to fetch individual profile for ${handle}:`,
            individualError
          );
          failedHandles.add(handle);
        }
      }
      return fallbackResults;
    }
  };

  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);

    // Process multiple batches concurrently
    const batchPromises = currentBatches.map((batchHandles, localIndex) =>
      processBatchWithRetry(batchHandles, i + localIndex)
    );

    // Wait for all current batches to complete
    const batchesResults = await Promise.all(batchPromises);

    // Add all results to the main array
    for (const batchResult of batchesResults) {
      detailedProfiles.push(...batchResult);
    }

    // Progress update
    const processedBatches = Math.min(i + CONCURRENT_BATCHES, batches.length);
    const processedProfiles = detailedProfiles.length;
    console.log(
      `Progress: ${processedBatches}/${batches.length} batches completed, ${processedProfiles}/${handles.length} profiles loaded`
    );

    // Add a small delay between batch groups to be respectful to the API
    if (i + CONCURRENT_BATCHES < batches.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Final summary
  const successCount = detailedProfiles.length;
  const failureCount = failedHandles.size;

  console.log(
    `✓ Profile loading complete: ${successCount}/${handles.length} profiles loaded successfully`
  );

  if (failureCount > 0) {
    console.warn(
      `⚠ Failed to load ${failureCount} profiles:`,
      Array.from(failedHandles)
    );
  }

  return detailedProfiles;
}
