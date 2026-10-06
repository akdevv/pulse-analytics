"use client";

import { useFormField } from "@/components/ui/form";
import { PASSWORD_RULES } from "@/lib/password";

export function PasswordRules({ value }: { value: string }) {
  const { formDescriptionId } = useFormField();

  return (
    <ul id={formDescriptionId} className="mt-1 flex flex-wrap gap-1.5">
      {PASSWORD_RULES.map(({ label, test }) => {
        const met = value.length > 0 && test(value);
        return (
          <li
            key={label}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[11px] leading-none transition-colors duration-150 ease-out ${
              met
                ? "border-powder/30 bg-powder/9 text-powder"
                : "border-ink/12 text-ink/50"
            }`}
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
                className="size-[3px] shrink-0 rounded-full bg-current"
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
