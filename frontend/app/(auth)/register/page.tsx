"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import {
  AUTH_INPUT,
  AuthAltLink,
  AuthCard,
  AuthField,
  AuthSubmit,
  EmailInput,
} from "@/components/auth/auth-ui";
import { PasswordRules } from "@/components/auth/password-rules";
import { PasswordInput } from "@/components/common/password-input";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth.context";
import { passwordSchema } from "@/lib/password";
import { isPersonalEmail } from "@/lib/personal-email";
import { getErrorMessage } from "@/lib/utils";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z
      .email("Please enter a valid email address.")
      .refine(
        isPersonalEmail,
        "Please use a personal email (Gmail, Outlook, iCloud, etc.). Work emails aren't supported."
      ),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState("");

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });
  const busy = form.formState.isSubmitting;

  const onSubmit = async ({ name, email, password }: RegisterValues) => {
    setError("");
    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Could not create your account."));
    }
  };

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <AuthField control={form.control} name="name" label="Name">
            {(field) => (
              <Input
                autoComplete="name"
                placeholder="Ada Lovelace"
                disabled={busy}
                className={AUTH_INPUT}
                {...field}
              />
            )}
          </AuthField>

          <AuthField
            control={form.control}
            name="email"
            label="Email"
            description="Personal email only. Gmail, Outlook, iCloud and the like."
          >
            {(field) => <EmailInput disabled={busy} {...field} />}
          </AuthField>

          <AuthField
            control={form.control}
            name="password"
            label="Password"
            after={<PasswordRules value={password} />}
          >
            {(field) => (
              <PasswordInput
                autoComplete="new-password"
                placeholder="Pick something strong"
                disabled={busy}
                className={AUTH_INPUT}
                {...field}
              />
            )}
          </AuthField>

          <AuthField
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
          >
            {(field) => (
              <PasswordInput
                autoComplete="new-password"
                placeholder="Repeat password"
                disabled={busy}
                className={AUTH_INPUT}
                {...field}
              />
            )}
          </AuthField>

          <AuthSubmit
            loading={busy}
            idle="Create account"
            busy="Creating account…"
          />
        </form>
      </Form>
    </AuthCard>
  );
}
