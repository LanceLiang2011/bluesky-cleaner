/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { handleLogin, getFollowerState, handleUnfollow } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FollowersList from "./components/FollowersList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");

  // Dashboard states
  const [data, setData] = useState<any>(null);
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  // Check if user is already logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const result = await getFollowerState();
        if (result) {
          setData(result);
          setIsLoggedIn(true);
        }
      } catch (error) {
        // Not logged in or session expired
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      // Save the credentials
      setHandle((formData.get("handle") as string) || "");
      setPassword((formData.get("password") as string) || "");

      const result = await handleLogin(formData);

      if (result.success) {
        const followerData = await getFollowerState();
        setData(followerData);
        setIsLoggedIn(true);
        toast.success("Successfully logged in!");
      } else {
        toast.error(
          result.error || "Incorrect username or password. Please try again."
        );
      }
    } catch (error: any) {
      toast.error(
        error.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false);
    setData(null);
    setSelected([]);
    // We don't clear handle and password so they're preserved for next login
  };

  const unfollowSelected = async () => {
    setUnfollowLoading(true);
    try {
      await handleUnfollow(selected);
      toast.success("Unfollowed successfully!");

      // Update local state instead of refetching all data
      if (data) {
        // Create a new following array without the unfollowed users
        const updatedFollowing = data.following.filter(
          (user: any) => !selected.includes(user.handle)
        );

        // Update the data state with the modified following list
        setData({
          ...data,
          following: updatedFollowing,
        });
      }

      // Clear selected users after successful unfollow
      setSelected([]);
    } catch (error) {
      toast.error("Failed to unfollow. Please try again.");
    } finally {
      setUnfollowLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Bluesky Cleaner</h1>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
        {/* Login Card - Always visible but can be hidden with CSS if needed */}
        <div
          className={`transition-all duration-300 ${
            isLoggedIn ? "md:opacity-70 md:hover:opacity-100" : ""
          }`}
        >
          <Card className="w-full">
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
                    disabled={loading || isLoggedIn}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
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
                      disabled={loading || isLoggedIn}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading || isLoggedIn}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {!isLoggedIn ? (
                  <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full mt-2"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Card - Only visible when logged in on mobile, always visible on desktop */}
        <div
          className={`transition-all duration-300 ${
            !isLoggedIn ? "hidden md:block md:opacity-50" : ""
          }`}
        >
          <Card className="w-full h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Your Followers</CardTitle>
              <CardDescription>
                Manage who you follow on Bluesky
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isLoggedIn ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>Login to see and manage your followers</p>
                </div>
              ) : !data ? (
                <p className="text-center py-8">Loading your data...</p>
              ) : (
                <>
                  <FollowersList
                    followers={data.followers}
                    following={data.following}
                    selected={selected}
                    setSelected={setSelected}
                  />
                  <Button
                    onClick={unfollowSelected}
                    disabled={unfollowLoading || selected.length === 0}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white w-full"
                  >
                    {unfollowLoading
                      ? "Unfollowing..."
                      : `Unfollow ${selected.length} Selected`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer />
    </main>
  );
}
