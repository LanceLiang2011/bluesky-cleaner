// app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { handleLogin } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    await handleLogin(formData);
    router.push("/dashboard");
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          name="handle"
          required
          placeholder="Bluesky handle"
          className="border p-2"
        />

        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
            className="border p-2 pr-10"
          />
          <span
            className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        <Button disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </main>
  );
}
