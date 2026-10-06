import { clsx, type ClassValue } from "clsx";
import { isAxiosError } from "axios";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The server's own wording, when it sent one. Beats "Request failed with
 * status code 429" from axios, and beats a hardcoded "please try again" that
 * hides what actually went wrong.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(err)) {
    return err.response?.data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
