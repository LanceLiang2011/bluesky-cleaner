/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  handleLogin,
  handleUnfollow,
  handleBlock,
  clearSession,
  handleGetDetailedProfiles,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FollowersList from "./components/FollowersList";
import FollowersTab from "./components/FollowersTab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);

  // Dashboard states
  const [data, setData] = useState<any>(null);
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailedProfiles, setDetailedProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("following");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Only update handle and password if we're not in 2FA mode
      // This prevents erasing them when submitting the 2FA code
      if (!requires2FA) {
        setHandle((formData.get("handle") as string) || "");
        setPassword((formData.get("password") as string) || "");
      }

      // When in 2FA mode, ensure we preserve the username and password
      if (requires2FA) {
        // Make sure we have the handle and password in the form data
        formData.set("handle", handle);
        formData.set("password", password);
        formData.set("totpCode", totpCode);
      }

      const result = await handleLogin(formData);

      if (result.success) {
        // Use the data returned directly from the login response
        setData({
          followers: result.followers,
          following: result.following,
          handle: result.handle,
          session: result.session,
        });
        setIsLoggedIn(true);
        setRequires2FA(false); // Reset 2FA mode
        setTotpCode(""); // Clear TOTP code
        toast.success("Successfully logged in!");
      } else if (result.requires2FA) {
        setRequires2FA(true);
        toast.info(
          "Please enter the verification code sent to your email or authentication app"
        );
      } else {
        toast.error(
          result.error || "Incorrect username or password. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Login error in UI:", error);
      toast.error(
        error.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await clearSession();
    setIsLoggedIn(false);
    setData(null);
    setSelected([]);
    setDetailedProfiles([]);
    setHandle("");
    setPassword("");
    setTotpCode("");
    setRequires2FA(false);
    setActiveTab("following");
    toast.success("Successfully logged out!");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelected([]); // Clear selection when switching tabs
  };

  const fetchDetailedProfiles = async (session: any, handles: string[]) => {
    try {
      const result = await handleGetDetailedProfiles(session, handles);
      if (result.success) {
        return result.profiles;
      } else {
        throw new Error(result.error || "Failed to fetch detailed profiles");
      }
    } catch (error: any) {
      console.error("Error fetching detailed profiles:", error);
      toast.error("Failed to load detailed profiles");
      throw error;
    }
  };
  const unfollowSelected = async () => {
    setUnfollowLoading(true);
    try {
      // Pass the session from the data state
      if (!data || !data.session) {
        toast.error("Session expired. Please login again.");
        return;
      }

      await handleUnfollow(data.session, selected);
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

  const blockSelected = async () => {
    setBlockLoading(true);
    try {
      // Pass the session from the data state
      if (!data || !data.session) {
        toast.error("Session expired. Please login again.");
        return;
      }

      await handleBlock(data.session, selected);
      toast.success("Blocked successfully!");

      // Simple refetch: just re-login to get fresh data
      const formData = new FormData();
      formData.set("handle", handle);
      formData.set("password", password);

      const result = await handleLogin(formData);
      if (result.success) {
        setData({
          followers: result.followers,
          following: result.following,
          handle: result.handle,
          session: result.session,
        });
      }

      // Clear selected users after successful block
      setSelected([]);
    } catch (error) {
      toast.error("Failed to block. Please try again.");
    } finally {
      setBlockLoading(false);
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
                {requires2FA ? (
                  // When in 2FA mode, show a summarized view of credentials
                  <div className="bg-muted p-3 rounded mb-2">
                    <p className="text-sm font-medium">
                      Account: <span className="font-normal">{handle}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the verification code below to complete login
                    </p>
                  </div>
                ) : (
                  // Normal login form fields
                  <>
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
                        disabled={loading || isLoggedIn || requires2FA}
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
                          disabled={loading || isLoggedIn || requires2FA}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading || isLoggedIn || requires2FA}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <a
                        href="https://bsky.app/settings/app-passwords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center mt-1"
                      >
                        You can use an App Password instead of your main
                        password for better security
                      </a>
                    </div>
                  </>
                )}

                {requires2FA && (
                  <div className="space-y-2">
                    <label htmlFor="totpCode" className="text-sm font-medium">
                      Verification Code
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Enter the verification code sent to your email or from
                      your authentication app
                    </p>
                    <Input
                      id="totpCode"
                      name="totpCode"
                      required
                      placeholder="Enter your verification code"
                      className="w-full"
                      disabled={loading || isLoggedIn}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>
                )}

                {!isLoggedIn ? (
                  <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={loading}
                  >
                    {loading
                      ? "Logging in..."
                      : requires2FA
                      ? "Verify Code"
                      : "Login"}
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

                {requires2FA && (
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full mt-2"
                    onClick={() => {
                      setRequires2FA(false);
                      setTotpCode("");
                    }}
                  >
                    Cancel
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
              <CardTitle className="text-2xl">Account Management</CardTitle>
              <CardDescription>
                Manage your following and followers on Bluesky
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isLoggedIn ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>Login to see and manage your account</p>
                </div>
              ) : !data ? (
                <p className="text-center py-8">Loading your data...</p>
              ) : (
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="following">Following</TabsTrigger>
                    <TabsTrigger value="followers">Followers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="following" className="space-y-4">
                    <FollowersList
                      followers={data.followers}
                      following={data.following}
                      selected={selected}
                      setSelected={setSelected}
                      session={data.session}
                      onFetchDetailedProfiles={fetchDetailedProfiles}
                    />
                    <div className="space-y-2">
                      <Button
                        onClick={unfollowSelected}
                        disabled={
                          unfollowLoading ||
                          blockLoading ||
                          selected.length === 0
                        }
                        className="bg-red-600 hover:bg-red-700 text-white w-full"
                      >
                        {unfollowLoading
                          ? "Unfollowing..."
                          : `Unfollow ${selected.length} Selected`}
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            disabled={
                              unfollowLoading ||
                              blockLoading ||
                              selected.length === 0
                            }
                            variant="destructive"
                            className="bg-gray-800 hover:bg-gray-900 text-white w-full"
                          >
                            {blockLoading
                              ? "Blocking..."
                              : `Block ${selected.length} Selected`}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Block Action</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to block {selected.length}{" "}
                              selected user{selected.length > 1 ? "s" : ""}?
                              This action will prevent them from seeing your
                              posts and interacting with you.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={blockSelected}
                              disabled={blockLoading}
                            >
                              {blockLoading ? "Blocking..." : "Block Users"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>

                  <TabsContent value="followers" className="space-y-4">
                    <FollowersTab
                      followers={data.followers}
                      selected={selected}
                      setSelected={setSelected}
                      session={data.session}
                      onFetchDetailedProfiles={fetchDetailedProfiles}
                    />
                    <div className="space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            disabled={blockLoading || selected.length === 0}
                            variant="destructive"
                            className="bg-gray-800 hover:bg-gray-900 text-white w-full"
                          >
                            {blockLoading
                              ? "Blocking..."
                              : `Block ${selected.length} Selected Follower${
                                  selected.length > 1 ? "s" : ""
                                }`}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Block Action</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to block {selected.length}{" "}
                              selected follower{selected.length > 1 ? "s" : ""}?
                              This action will prevent them from seeing your
                              posts and interacting with you.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={blockSelected}
                              disabled={blockLoading}
                            >
                              {blockLoading ? "Blocking..." : "Block Users"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer />
    </main>
  );
}
