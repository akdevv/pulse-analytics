"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import {
  AUTH_INPUT,
  AUTH_LABEL,
  AuthAltLink,
  AuthCard,
  AuthSubmit,
} from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/common/password-input";
import { POWDER } from "@/components/landing/tokens";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth.context";

const PERSONAL_EMAIL_DOMAINS = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "live.com",
  "live.co.uk",
  "live.fr",
  "live.de",
  "msn.com",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.co.in",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.com.br",
  "yahoo.com.mx",
  "yahoo.co.jp",
  "rocketmail.com",
  "ymail.com",
  // Privacy-focused
  "protonmail.com",
  "protonmail.ch",
  "proton.me",
  "pm.me",
  "tutanota.com",
  "tutamail.com",
  "tuta.io",
  // Other established
  "aol.com",
  "aol.co.uk",
  "mail.com",
  "email.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "gmx.at",
  "gmx.ch",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "fastmail.fm",
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
      .refine(
        isPersonalEmail,
        "Please use a personal email (Gmail, Outlook, iCloud, etc.). Work emails aren't supported."
      ),
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

/* The password has five rules. Listing them as one grey sentence and
   then rejecting the whole field on submit makes the user guess which
   one they missed, so each rule reports itself as they type. Same
   source of truth as the schema above. */
const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "Uppercase", test: (v) => /[A-Z]/.test(v) },
  { label: "Lowercase", test: (v) => /[a-z]/.test(v) },
  { label: "Number", test: (v) => /[0-9]/.test(v) },
  { label: "Special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordRules({ value }: { value: string }) {
  const { formDescriptionId } = useFormField();
  return (
    <ul
      id={formDescriptionId}
      className="mt-2.5 flex flex-wrap gap-1.5"
    >
      {PASSWORD_RULES.map(({ label, test }) => {
        const met = value.length > 0 && test(value);
        return (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[11px] leading-none transition-colors duration-150 ease-[var(--ease-out)]"
            style={
              met
                ? {
                    borderColor: `color-mix(in oklab, ${POWDER} 30%, transparent)`,
                    background: `color-mix(in oklab, ${POWDER} 9%, transparent)`,
                    color: POWDER,
                  }
                : {
                    borderColor: "rgba(229,227,210,0.1)",
                    color: "rgba(229,227,210,0.38)",
                  }
            }
          >
            {met ? (
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
                aria-hidden
              >
                <path d="M4 12.5 9.5 18 20 6.5" />
              </svg>
            ) : (
              <span
                aria-hidden
                className="h-[3px] w-[3px] shrink-0 rounded-full bg-current"
              />
            )}
            <span className="sr-only">{met ? "Met:" : "Not met:"}</span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

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
  const password = useWatch({ control: form.control, name: "password" });

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
    <AuthCard
      title="Create account"
      subtitle="Free, and it stays free. There is nothing to sell you."
      error={error}
      footer={
        <AuthAltLink
          prompt="Already have an account?"
          href="/login"
          label="Sign in"
        />
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className={AUTH_LABEL}>Name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    disabled={loading}
                    className={AUTH_INPUT}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className={AUTH_LABEL}>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@example.com"
                    disabled={loading}
                    className={AUTH_INPUT}
                    {...field}
                  />
                </FormControl>
                {/* FormDescription lands in aria-describedby; the raw <p>
                    this replaces was never announced. */}
                <FormDescription className="text-[11px] leading-snug text-ink/35">
                  Personal email only. Gmail, Outlook, iCloud and the like.
                </FormDescription>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className={AUTH_LABEL}>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Pick something strong"
                    disabled={loading}
                    className={AUTH_INPUT}
                    {...field}
                  />
                </FormControl>
                <PasswordRules value={password} />
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className={AUTH_LABEL}>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    disabled={loading}
                    className={AUTH_INPUT}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <AuthSubmit
            loading={loading}
            idle="Create account"
            busy="Creating account…"
          />
        </form>
      </Form>
    </AuthCard>
  );
}
