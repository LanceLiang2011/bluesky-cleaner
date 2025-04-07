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
import { Search, UserCheck, UserX } from "lucide-react";

export default function FollowersList({
  following,
  followers,
  selected,
  setSelected,
}: {
  following: any[];
  followers: any[];
  selected: string[];
  setSelected: (selected: string[]) => void;
}) {
  const [showNonFollowers, setShowNonFollowers] = useState(true);
  const [search, setSearch] = useState("");

  const followerHandles = new Set(followers.map((f: any) => f.handle));

  const filtered = following
    .filter((f: any) =>
      showNonFollowers ? !followerHandles.has(f.handle) : true
    )
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
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No users found
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((user: any) => (
                <li
                  key={user.handle}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
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
                    <div>
                      <p className="font-medium">
                        {user.displayName || user.handle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{user.handle}
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    id={`select-${user.handle}`}
                    checked={selected.includes(user.handle)}
                    onCheckedChange={() => toggleSelect(user.handle)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
