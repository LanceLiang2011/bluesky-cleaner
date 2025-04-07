/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { handleLogin } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await handleLogin(formData);

      if (result.success) {
        router.push("/dashboard");
      } else {
        toast.error("Login failed", {
          description:
            result.error || "Incorrect username or password. Please try again.",
        });
      }
    } catch (error: any) {
      toast.error("Login failed", {
        description:
          error.message || "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Sign in to your Bluesky account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <label htmlFor="handle" className="text-sm font-medium">
                Bluesky Handle
              </label>
              <Input
                id="handle"
                name="handle"
                required
                placeholder="username.bsky.social"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Do not have an account?{" "}
            <a
              href="https://bsky.app/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Sign up for Bluesky
            </a>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
