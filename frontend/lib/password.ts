import * as z from "zod";

export const PASSWORD_RULES = [
  {
    label: "8+ characters",
    message: "at least 8 characters",
    test: (v: string) => v.length >= 8,
  },
  {
    label: "Uppercase",
    message: "an uppercase letter",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    label: "Lowercase",
    message: "a lowercase letter",
    test: (v: string) => /[a-z]/.test(v),
  },
  {
    label: "Number",
    message: "a number",
    test: (v: string) => /[0-9]/.test(v),
  },
  {
    label: "Special character",
    message: "a special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export function passwordProblem(password: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? `Password must contain ${failed.message}.` : null;
}

export const passwordSchema = z.string().superRefine((value, ctx) => {
  const problem = passwordProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});
