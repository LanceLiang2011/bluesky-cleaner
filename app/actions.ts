// app/actions.ts
"use server";

import { loginAndFetch, unfollowUsers } from "@/lib/bsk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sessionCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stateCache: any = null;

export async function handleLogin(formData: FormData) {
  const handle = formData.get("handle") as string;
  const password = formData.get("password") as string;

  const { followers, following, session } = await loginAndFetch(
    handle,
    password
  );
  sessionCache = session;
  stateCache = { handle, followers, following };
  return { ok: true };
}

export async function getFollowerState() {
  return stateCache;
}

export async function handleUnfollow(handles: string[]) {
  await unfollowUsers(sessionCache, handles);
}
