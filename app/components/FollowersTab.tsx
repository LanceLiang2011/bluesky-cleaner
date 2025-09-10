/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Search, Users } from "lucide-react";

export default function FollowersTab({
  followers,
  selected,
  setSelected,
  session,
  onFetchDetailedProfiles,
}: {
  followers: any[];
  selected: string[];
  setSelected: (selected: string[]) => void;
  session: any;
  onFetchDetailedProfiles: (session: any, handles: string[]) => Promise<any[]>;
}) {
  const [maxPostCount, setMaxPostCount] = useState([100]); // Array for Slider value
  const [enablePostFilter, setEnablePostFilter] = useState(false);
  const [showOnlyNonBlocked, setShowOnlyNonBlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [detailedProfiles, setDetailedProfiles] = useState<any[]>([]);
  const [loadingDetailedProfiles, setLoadingDetailedProfiles] = useState(false);
  const [detailedProfilesError, setDetailedProfilesError] = useState<
    string | null
  >(null);

  const fetchDetailedProfiles = useCallback(async () => {
    if (!session || loadingDetailedProfiles) return;

    setLoadingDetailedProfiles(true);
    setDetailedProfilesError(null);

    try {
      const handles = followers.map((f: any) => f.handle);
      console.log(
        `Fetching detailed profiles for ${handles.length} followers...`
      );

      const profiles = await onFetchDetailedProfiles(session, handles);
      setDetailedProfiles(profiles);
      console.log(
        `Successfully loaded ${profiles.length} detailed follower profiles`
      );
    } catch (error) {
      console.error("Failed to fetch detailed follower profiles:", error);
      setDetailedProfilesError(
        "Failed to load detailed profiles. Please try again."
      );
    } finally {
      setLoadingDetailedProfiles(false);
    }
  }, [session, loadingDetailedProfiles, followers, onFetchDetailedProfiles]);

  // Fetch detailed profiles when post filter or blocked filter is enabled
  useEffect(() => {
    if (
      (enablePostFilter || showOnlyNonBlocked) &&
      detailedProfiles.length === 0 &&
      !loadingDetailedProfiles
    ) {
      fetchDetailedProfiles();
    }
  }, [
    enablePostFilter,
    showOnlyNonBlocked,
    detailedProfiles.length,
    loadingDetailedProfiles,
    fetchDetailedProfiles,
  ]);

  // Debug logging
  console.log("Followers sample:", followers[0]);
  console.log("Detailed follower profiles sample:", detailedProfiles?.[0]);
  console.log("Total followers:", followers.length);
  console.log(
    "Total detailed follower profiles:",
    detailedProfiles?.length || 0
  );

  // Create a map of detailed profiles for quick lookup
  const detailedProfilesMap = new Map(
    (detailedProfiles || []).map((profile: any) => [profile.handle, profile])
  );

  const filtered = followers
    .filter((f: any) => {
      if (!enablePostFilter) return true;

      // Check if we have detailed profile data for this user
      const detailedProfile = detailedProfilesMap.get(f.handle);
      if (!detailedProfile) {
        // If we don't have detailed data, we can't determine post count, so include them
        console.log(`No detailed profile for ${f.handle}`);
        return true;
      }

      // Check if user's post count is within the filter range
      const postCount = detailedProfile.postsCount || 0;
      const isWithinRange = postCount <= maxPostCount[0];
      console.log(
        `Follower ${f.handle}: postsCount = ${postCount}, maxAllowed = ${maxPostCount[0]}, included = ${isWithinRange}`
      );
      return isWithinRange;
    })
    .filter((f: any) => {
      if (!showOnlyNonBlocked) return true;

      // Check if user is blocked
      const detailedProfile = detailedProfilesMap.get(f.handle);
      if (!detailedProfile) {
        // If we don't have detailed data, assume not blocked
        return true;
      }

      // Check viewer.blocking status - if true, user is blocked
      const isBlocked = detailedProfile.viewer?.blocking;
      return !isBlocked; // Only include if NOT blocked
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
            <Users className="h-5 w-5 text-blue-500" />
            People Follow You
          </div>
          <Badge variant="outline">
            {filtered.length} {filtered.length === 1 ? "follower" : "followers"}
          </Badge>
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="post-count-filter-followers"
                checked={enablePostFilter}
                onCheckedChange={setEnablePostFilter}
              />
              <label
                htmlFor="post-count-filter-followers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Filter by post count
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="blocked-filter-followers"
                checked={showOnlyNonBlocked}
                onCheckedChange={setShowOnlyNonBlocked}
              />
              <label
                htmlFor="blocked-filter-followers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Only show non-blocked users
              </label>
            </div>
            {enablePostFilter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Show followers with ≤ {maxPostCount[0]} posts
                  </span>
                  {detailedProfiles?.length ? (
                    <span className="text-xs text-muted-foreground">
                      {filtered.length} followers match
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
            {detailedProfilesError && (
              <div className="text-xs text-red-500">
                {detailedProfilesError}
              </div>
            )}
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search followers..."
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
          {(enablePostFilter || showOnlyNonBlocked) &&
          loadingDetailedProfiles &&
          !detailedProfiles?.length ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span>Loading detailed profiles to enable filtering...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No followers found
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((user: any) => (
                <li
                  key={user.handle}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
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
                        {detailedProfilesMap.get(user.handle) && (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              {detailedProfilesMap.get(user.handle).postsCount ||
                                0}{" "}
                              posts
                            </Badge>
                            {detailedProfilesMap.get(user.handle).viewer?.blocking && (
                              <Badge variant="destructive" className="text-xs">
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
                      id={`select-follower-${user.handle}`}
                      checked={selected.includes(user.handle)}
                      onCheckedChange={() => toggleSelect(user.handle)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
