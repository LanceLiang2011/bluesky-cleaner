/* eslint-disable @typescript-eslint/no-explicit-any */
import { BskyAgent, AtpSessionData } from "@atproto/api";

export async function loginAndFetch(
  handle: string,
  password: string,
  totpCode?: string
) {
  const agent = new BskyAgent({ service: "https://bsky.social" });

  try {
    // Login to get session, now with optional 2FA/TOTP code
    const loginResponse = await agent.login({
      identifier: handle,
      password,

      ...(totpCode ? { authFactorToken: totpCode } : {}), // Include TOTP if provided
    });

    // Log the login response to help debug 2FA issues
    console.log("Login response:", JSON.stringify(loginResponse, null, 2));

    // Create a clean session object that doesn't contain the password
    const session = {
      did: agent.session?.did,
      handle: agent.session?.handle,
      accessJwt: agent.session?.accessJwt,
      refreshJwt: agent.session?.refreshJwt,
      // No password or other sensitive data
    };

    // Log session info for debugging (without sensitive tokens)
    console.log(
      "Session established for:",
      session.handle,
      "with DID:",
      session.did
    );

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

    return {
      followers,
      following,
      session, // Return only the filtered session data
      requires2FA: false,
    };
  } catch (error: any) {
    // Log the full error details to better understand the issue
    console.error("Login error details:", {
      status: error.status,
      message: error.message,
      error: error.error,
      stack: error.stack,
      fullError: error,
    });

    // Enhanced 2FA detection - check for known patterns in different types of 2FA responses
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
        // Some specific error messages seen with email-based 2FA
        error.message?.toLowerCase().includes("email") ||
        error.message?.toLowerCase().includes("verify"))
    ) {
      console.log("2FA requirement detected");
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
  const agent = new BskyAgent({ service: "https://bsky.social" });

  // Resume session using only the tokens, not credentials
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
