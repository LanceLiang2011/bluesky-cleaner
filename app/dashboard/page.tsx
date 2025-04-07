/* eslint-disable @typescript-eslint/no-explicit-any */
// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getFollowerState, handleUnfollow } from "../actions";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FollowersList from "../components/FollowersList";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    getFollowerState().then(setData);
  }, []);

  const unfollowSelected = async () => {
    setLoading(true);
    await handleUnfollow(selected);
    toast.success("Unfollowed successfully!");
    setLoading(false);
  };

  if (!data) return <p>Loading...</p>;

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <FollowersList
        followers={data.followers}
        following={data.following}
        selected={selected}
        setSelected={setSelected}
      />
      <Button
        onClick={unfollowSelected}
        disabled={loading || selected.length === 0}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white"
      >
        {loading ? "Unfollowing..." : `Unfollow ${selected.length} Selected`}
      </Button>
      <ToastContainer />
    </main>
  );
}
