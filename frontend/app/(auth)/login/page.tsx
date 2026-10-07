"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  AUTH_INPUT,
  AuthAltLink,
  AuthCard,
  AuthField,
  AuthSubmit,
  EmailInput,
} from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/common/password-input";
import { Form } from "@/components/ui/form";
import { useAuth } from "@/contexts/auth.context";
import { getErrorMessage } from "@/lib/utils";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const busy = form.formState.isSubmitting;

  const onSubmit = async ({ email, password }: LoginValues) => {
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Sign in failed. Please try again."));
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to Pulse Analytics."
      error={error}
      footer={
        <>
          <AuthAltLink
            prompt="No account?"
            href="/register"
            label="Create one"
          />
          <p className="mt-2">
            <AuthAltLink
              prompt="Just looking?"
              href="/demo"
              label="Try the live demo"
            />
          </p>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <AuthField control={form.control} name="email" label="Email">
            {(field) => <EmailInput disabled={busy} {...field} />}
          </AuthField>

          <AuthField control={form.control} name="password" label="Password">
            {(field) => (
              <PasswordInput
                autoComplete="current-password"
                placeholder="Your password"
                disabled={busy}
                className={AUTH_INPUT}
                {...field}
              />
            )}
          </AuthField>

          <AuthSubmit loading={busy} idle="Sign in" busy="Signing in…" />
        </form>
      </Form>
    </AuthCard>
  );
}
