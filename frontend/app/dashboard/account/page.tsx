"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/common/password-input";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth.context";
import * as authApi from "@/lib/api/auth.api";
import { passwordProblem } from "@/lib/password";
import type { User } from "@/lib/types/user.types";
import { getErrorMessage } from "@/lib/utils";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ProfileCard({ user }: { user: User }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const dirty = name !== (user.name ?? "") || email !== user.email;

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({ name, email });
      await refreshUser();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Profile"
      description="Update your name and email address."
    >
      <Field id="name" label="Name">
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          autoComplete="name"
          className="h-9 text-sm"
        />
      </Field>
      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-9 text-sm"
        />
      </Field>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SectionCard>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const problem =
      passwordProblem(password) ??
      (password !== confirm ? "Passwords do not match." : null);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(password);
      setPassword("");
      setConfirm("");
      toast.success("Password changed.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to change password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Password"
      description="At least 8 characters, with upper and lowercase letters, a number and a special character."
    >
      <Field id="password" label="New Password">
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          className="h-9 text-sm"
        />
      </Field>
      <Field id="confirmPassword" label="Confirm Password">
        <PasswordInput
          id="confirmPassword"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
          className="h-9 text-sm"
        />
      </Field>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={save}
          disabled={saving || !password || !confirm}
        >
          {saving ? "Saving..." : "Change Password"}
        </Button>
      </div>
    </SectionCard>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-[var(--seam)] px-5 py-4">
        <h1 className="figure text-[20px]">Account</h1>
        <span className="font-mono text-[11px] text-foreground/45">
          {user.email}
        </span>
      </div>

      <div className="max-w-2xl space-y-5 p-5">
        <ProfileCard user={user} />
        <PasswordCard />

        <SectionCard
          title="Account Details"
          description="Read-only information about this account."
        >
          <Detail label="User ID">
            <code className="font-mono text-xs break-all">{user.id}</code>
          </Detail>
          <Detail label="Status">
            <p className="flex items-center gap-1.5 text-sm">
              {user.isVerified && (
                <CircleCheck className="size-3.5 text-success" />
              )}
              {user.isVerified ? "Verified" : "Unverified"}
            </p>
          </Detail>
          {user.lastLoginAt && (
            <Detail label="Last Login">
              <p className="text-sm">
                {new Date(user.lastLoginAt).toLocaleString()}
              </p>
            </Detail>
          )}
        </SectionCard>
      </div>
    </>
  );
}
