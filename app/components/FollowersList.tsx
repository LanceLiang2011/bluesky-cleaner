/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Search, UserCheck, UserX } from "lucide-react";

export default function FollowersList({
  following,
  followers,
  selected,
  setSelected,
  detailedProfiles,
  loadingDetailedProfiles,
  onFetchDetailedProfiles,
}: {
  following: any[];
  followers: any[];
  selected: string[];
  setSelected: (selected: string[]) => void;
  detailedProfiles: any[];
  loadingDetailedProfiles: boolean;
  onFetchDetailedProfiles: () => void;
}) {
  const [showNonFollowers, setShowNonFollowers] = useState(false);
  const [maxPostCount, setMaxPostCount] = useState([100]); // Array for Slider value
  const [enablePostFilter, setEnablePostFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [showBlockedFilter, setShowBlockedFilter] = useState(false); // Default false - show all users

  const followerHandles = new Set(followers.map((f: any) => f.handle));

  // Create a map of detailed profiles for quick lookup
  const detailedProfilesMap = new Map(
    (detailedProfiles || []).map((profile: any) => [profile.handle, profile])
  );

  // Calculate loading progress and completion status
  const totalUsers = following.length;
  const loadedUsers = detailedProfiles?.length || 0;
  const loadingProgress =
    totalUsers > 0 ? Math.round((loadedUsers / totalUsers) * 100) : 0;

  // Determine if detailed data loading is complete
  const isDetailedDataComplete =
    !enablePostFilter ||
    (!loadingDetailedProfiles &&
      detailedProfiles &&
      detailedProfiles.length > 0);

  // Show loading state when post filter is enabled AND we're actively loading OR have incomplete data
  const shouldShowLoadingState =
    enablePostFilter &&
    (loadingDetailedProfiles || (detailedProfiles?.length || 0) < totalUsers);

  console.log("Loading state debug:", {
    enablePostFilter,
    totalUsers,
    loadedUsers,
    loadingProgress,
    isDetailedDataComplete,
    shouldShowLoadingState,
    loadingDetailedProfiles,
    hasDetailedProfiles: !!detailedProfiles,
  });

  const filtered = following
    .filter((f: any) =>
      showNonFollowers ? !followerHandles.has(f.handle) : true
    )
    .filter((f: any) => {
      if (!enablePostFilter) return true;

      // Check if we have detailed profile data for this user
      const detailedProfile = detailedProfilesMap.get(f.handle);
      if (!detailedProfile) {
        // If we don't have detailed data, we can't determine post count, so include them
        return true;
      }

      // Check if user's post count is within the filter range
      const postCount = detailedProfile.postsCount || 0;
      return postCount <= maxPostCount[0];
    })
    .filter((f: any) => {
      if (!showBlockedFilter) return true;

      // Only filter out blocked users when showBlockedFilter is true
      const detailedProfile = detailedProfilesMap.get(f.handle);
      return !detailedProfile?.viewer?.blocking;
    })
    .filter((f: any) => new RegExp(search, "i").test(f.handle));

  const toggleSelect = (handle: string) => {
    const updatedSelected = selected.includes(handle)
      ? selected.filter((h) => h !== handle)
      : [...selected, handle];
    setSelected(updatedSelected);
  };

  const selectAll = () => {
    const all = filtered.map((f: any) => f.handle);
    setSelected(all);
  };

  const unselectAll = () => {
    // Remove filtered users from selection
    const filteredHandles = new Set(filtered.map((f: any) => f.handle));
    const remainingSelected = selected.filter(
      (handle) => !filteredHandles.has(handle)
    );
    setSelected(remainingSelected);
  };

  // Check if all filtered users are already selected
  const isAllSelected =
    filtered.length > 0 &&
    filtered.every((f: any) => selected.includes(f.handle));

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showNonFollowers ? (
              <UserX className="h-5 w-5 text-rose-500" />
            ) : (
              <UserCheck className="h-5 w-5 text-emerald-500" />
            )}
            {showNonFollowers ? "Non-Followers" : "All Following"}
          </div>
          <Badge variant="outline">
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
          </Badge>
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="filter-mode"
                checked={showNonFollowers}
                onCheckedChange={setShowNonFollowers}
              />
              <label
                htmlFor="filter-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Only show non-followers
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="blocked-filter"
                checked={showBlockedFilter}
                onCheckedChange={(checked) => {
                  setShowBlockedFilter(checked);
                  if (checked && detailedProfiles.length === 0) {
                    onFetchDetailedProfiles();
                  }
                }}
              />
              <label
                htmlFor="blocked-filter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Hide blocked users
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="post-count-filter"
                checked={enablePostFilter}
                onCheckedChange={(checked) => {
                  setEnablePostFilter(checked);
                  if (checked && detailedProfiles.length === 0) {
                    onFetchDetailedProfiles();
                  }
                }}
              />
              <label
                htmlFor="post-count-filter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Filter by post count
              </label>
            </div>
            {enablePostFilter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Show users with ≤ {maxPostCount[0]} posts
                  </span>
                  {detailedProfiles?.length ? (
                    <span className="text-xs text-muted-foreground">
                      {filtered.length} users match
                    </span>
                  ) : null}
                </div>
                <Slider
                  value={maxPostCount}
                  onValueChange={setMaxPostCount}
                  max={1000}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>1000</span>
                </div>
              </div>
            )}
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full sm:w-[200px]"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllSelected ? unselectAll : selectAll}
            className="text-sm"
          >
            {isAllSelected ? "Unselect All" : "Select All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md h-80 overflow-y-auto">
          {shouldShowLoadingState ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <div className="text-center">
                  <div className="font-medium">
                    Loading detailed profiles...
                  </div>
                  <div className="text-sm mt-1">
                    {loadedUsers} / {totalUsers} profiles loaded (
                    {loadingProgress}%)
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    Please wait while we fetch all user details
                  </div>
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No users found
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((user: any) => {
                const detailedProfile = detailedProfilesMap.get(user.handle);
                const isBlocked = detailedProfile?.viewer?.blocking;

                return (
                  <li
                    key={user.handle}
                    className={`flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer ${
                      isBlocked ? "opacity-50" : ""
                    }`}
                    onClick={() => toggleSelect(user.handle)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://bsky.app/profile/${user.handle}`,
                            "_blank"
                          );
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={user.avatar}
                            alt={user.displayName || user.handle}
                          />
                          <AvatarFallback>
                            {user.displayName
                              ? getInitials(user.displayName)
                              : user.handle.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://bsky.app/profile/${user.handle}`,
                              "_blank"
                            );
                          }}
                          className="cursor-pointer hover:text-blue-600 transition-colors inline-block"
                        >
                          <p className="font-medium">
                            {user.displayName || user.handle}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://bsky.app/profile/${user.handle}`,
                                "_blank"
                              );
                            }}
                            className="cursor-pointer hover:text-blue-600 transition-colors inline-block"
                          >
                            <p className="text-sm text-muted-foreground hover:text-blue-600 transition-colors">
                              @{user.handle}
                            </p>
                          </div>
                          {detailedProfile && (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {detailedProfile.postsCount || 0} posts
                              </Badge>
                              {isBlocked && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Blocked
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="cursor-pointer p-2"
                    >
                      <Checkbox
                        id={`select-${user.handle}`}
                        checked={selected.includes(user.handle)}
                        onCheckedChange={() => toggleSelect(user.handle)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
