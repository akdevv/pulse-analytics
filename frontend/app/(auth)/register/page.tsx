"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { ACCENT, BG, LOGO_FONT, PulseLogo, SURFACE } from "@/components/landing/shared";
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

const PERSONAL_EMAIL_DOMAINS = new Set([
  // Google
  "gmail.com", "googlemail.com",
  // Microsoft
  "outlook.com", "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de",
  "live.com", "live.co.uk", "live.fr", "live.de", "msn.com",
  // Apple
  "icloud.com", "me.com", "mac.com",
  // Yahoo
  "yahoo.com", "yahoo.co.uk", "yahoo.fr", "yahoo.de", "yahoo.es",
  "yahoo.it", "yahoo.co.in", "yahoo.ca", "yahoo.com.au", "yahoo.com.br",
  "yahoo.com.mx", "yahoo.co.jp", "rocketmail.com", "ymail.com",
  // Privacy-focused
  "protonmail.com", "protonmail.ch", "proton.me", "pm.me",
  "tutanota.com", "tutamail.com", "tuta.io",
  // Other established
  "aol.com", "aol.co.uk",
  "mail.com", "email.com",
  "gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch",
  "yandex.com", "yandex.ru",
  "fastmail.com", "fastmail.fm",
  "hey.com",
  "zoho.com",
  "inbox.com",
  "mailfence.com",
]);

function isPersonalEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z
      .email("Please enter a valid email address.")
      .refine(isPersonalEmail, "Please use a personal email (Gmail, Outlook, iCloud, etc.). Work emails aren't supported."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Must contain at least one number.")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: RegisterFormValues) {
    try {
      setLoading(true);
      setError("");
      await register(data.name, data.email, data.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="dark min-h-screen flex flex-col relative overflow-hidden"
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
        <Link href="/" className="inline-flex items-center gap-2 group">
          <PulseLogo size={26} />
          <span
            className="text-white/80 group-hover:text-white transition-colors text-[15px]"
            style={LOGO_FONT}
          >
            Pulse
          </span>
        </Link>
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-[380px]">
          <div
            className="rounded-2xl overflow-hidden animate-fade-in"
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
                  className="text-white text-[24px] mb-1.5"
                  style={{ ...LOGO_FONT, fontWeight: 700 }}
                >
                  Create account
                </h1>
                <p className="text-[14px] text-white/40 leading-snug">
                  Get started with Pulse Analytics for free
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-medium text-white/55">
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            disabled={loading}
                            className="h-10 text-[14px] text-white placeholder:text-white/20 bg-white/5 border-white/10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-[12px]" />
                      </FormItem>
                    )}
                  />

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
                            className="h-10 text-[14px] text-white placeholder:text-white/20 bg-white/5 border-white/10"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-[11px] text-white/25 leading-snug">
                          Personal email only — Gmail, Outlook, iCloud, etc.
                        </p>
                        <FormMessage className="text-red-400 text-[12px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-medium text-white/55">
                          Password
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Min. 8 characters"
                            disabled={loading}
                            className="h-10 text-[14px] text-white placeholder:text-white/20 bg-white/5 border-white/10"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-[11px] text-white/25 leading-snug">
                          8+ chars · uppercase · lowercase · number · special character
                        </p>
                        <FormMessage className="text-red-400 text-[12px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-medium text-white/55">
                          Confirm password
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Repeat password"
                            disabled={loading}
                            className="h-10 text-[14px] text-white placeholder:text-white/20 bg-white/5 border-white/10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-[12px]" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 rounded-xl text-[14px] font-semibold transition-opacity hover:opacity-85 active:opacity-75 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      style={{ background: ACCENT, color: BG }}
                    >
                      {loading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        "Create account"
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
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-white/60 font-medium hover:text-white transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
