/* eslint-disable @typescript-eslint/no-explicit-any */
// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  useEffect(() => {
    // Redirect to the main page since we've integrated dashboard there
    redirect("/");
  }, []);

  // Fallback UI while redirecting
  return <p>Redirecting...</p>;
}
