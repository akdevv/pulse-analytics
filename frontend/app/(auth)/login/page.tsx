"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  ACCENT,
  BG,
  LOGO_FONT,
  PulseLogo,
  SURFACE,
} from "@/components/landing/shared";
import { PasswordInput } from "@/components/common/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth.context";
import { useRouter } from "next/navigation";
import { useState } from "react";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      setLoading(true);
      setError("");
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="dark relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: BG }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Ambient orange glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 48%, ${ACCENT}14 0%, transparent 68%)`,
        }}
      />

      {/* Logo — top left */}
      <div className="relative z-10 p-6">
        <Link href="/" className="group inline-flex items-center gap-2">
          <PulseLogo size={26} />
          <span
            className="text-[15px] text-white/80 transition-colors group-hover:text-white"
            style={LOGO_FONT}
          >
            Pulse
          </span>
        </Link>
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[380px]">
          <div
            className="animate-fade-in overflow-hidden rounded-2xl"
            style={{
              background: SURFACE,
              border: "1px solid oklch(0.3 0.005 285)",
              boxShadow: [
                `0 0 0 1px ${ACCENT}10`,
                "0 2px 4px rgba(0,0,0,0.3)",
                "0 12px 32px -4px rgba(0,0,0,0.5)",
                "0 32px 64px -8px rgba(0,0,0,0.4)",
                `0 0 80px -16px ${ACCENT}22`,
              ].join(", "),
            }}
          >
            {/* Top accent line */}
            <div
              style={{
                height: "1px",
                background: `linear-gradient(90deg, transparent 8%, ${ACCENT}80 50%, transparent 92%)`,
              }}
            />

            <div className="px-8 py-8">
              {/* Heading */}
              <div className="mb-8">
                <h1
                  className="mb-1.5 text-[24px] text-white"
                  style={{ ...LOGO_FONT, fontWeight: 700 }}
                >
                  Welcome back
                </h1>
                <p className="text-[14px] leading-snug text-white/40">
                  Sign in to continue to Pulse Analytics
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mb-5 rounded-xl px-4 py-3 text-[13px] text-red-300"
                  style={{
                    background: "oklch(0.35 0.1 25 / 0.2)",
                    border: "1px solid oklch(0.5 0.15 25 / 0.3)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-medium text-white/55">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            disabled={loading}
                            className="h-10 border-white/10 bg-white/5 text-[14px] text-white placeholder:text-white/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[12px] text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-[13px] font-medium text-white/55">
                            Password
                          </FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-[12px] text-white/30 transition-colors hover:text-white/65"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <PasswordInput
                            placeholder="••••••••"
                            disabled={loading}
                            className="h-10 border-white/10 bg-white/5 text-[14px] text-white placeholder:text-white/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[12px] text-red-400" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-opacity hover:opacity-85 active:opacity-75 disabled:opacity-50"
                      style={{ background: ACCENT, color: BG }}
                    >
                      {loading ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </button>
                  </div>
                </form>
              </Form>

              {/* Footer */}
              <div
                className="mt-7 pt-6 text-center text-[13px] text-white/30"
                style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}
              >
                No account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-white/60 transition-colors hover:text-white"
                >
                  Create one
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
