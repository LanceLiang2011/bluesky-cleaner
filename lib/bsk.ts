import { BskyAgent, AtpSessionData } from "@atproto/api";

export async function loginAndFetch(handle: string, password: string) {
  const agent = new BskyAgent({ service: "https://bsky.social" });

  await agent.login({
    identifier: handle,
    password,
  });

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
    session: agent.session,
  };
}

export async function unfollowUsers(
  agentSession: AtpSessionData,
  handlesToUnfollow: string[]
) {
  const agent = new BskyAgent({ service: "https://bsky.social" });
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
