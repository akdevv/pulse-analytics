"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GoCheckCircleFill } from "react-icons/go";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/password-input";
import { useAuth } from "@/contexts/auth.context";
import api from "@/lib/api/client";

// Mirrors the backend rule in backend/src/modules/auth/auth.types.ts
function passwordError(password: string, confirm: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export default function AccountPage() {
  // The dashboard layout only renders children once the user is loaded,
  // so there is no loading or error state to handle here.
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const profileDirty = name !== (user.name ?? "") || email !== user.email;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch("/auth/me", { name, email });
      await refreshUser();
      toast.success("Profile updated.");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const error = passwordError(password, confirmPassword);
    if (error) {
      toast.error(error);
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch("/auth/me", { password });
      setPassword("");
      setConfirmPassword("");
      toast.success("Password changed.");
    } catch {
      toast.error("Failed to change password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 p-1">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground truncate text-sm">
          Manage your profile and password.
        </p>
      </div>

      {/* Profile */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-4 border-b">
          <CardTitle className="text-sm font-semibold">Profile</CardTitle>
          <CardDescription className="text-xs">
            Update your name and email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={savingProfile || !profileDirty}
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-4 border-b">
          <CardTitle className="text-sm font-semibold">Password</CardTitle>
          <CardDescription className="text-xs">
            Must be at least 8 characters, with an uppercase letter and a
            number.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium">
              New Password
            </Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-medium">
              Confirm Password
            </Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={savingPassword || !password || !confirmPassword}
            >
              {savingPassword ? "Saving..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-4 border-b">
          <CardTitle className="text-sm font-semibold">
            Account Details
          </CardTitle>
          <CardDescription className="text-xs">
            Read-only information about this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 space-y-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">User ID</p>
            <code className="font-mono text-xs break-all">{user.id}</code>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Status</p>
            <p className="flex items-center gap-1.5 text-sm">
              {user.isVerified ? (
                <>
                  <GoCheckCircleFill className="size-3.5 text-green-500" />
                  Verified
                </>
              ) : (
                "Unverified"
              )}
            </p>
          </div>
          {user.lastLoginAt && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Last Login</p>
              <p className="text-sm">
                {new Date(user.lastLoginAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
