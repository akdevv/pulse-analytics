"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createSite } from "@/lib/api/sites.api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  domain: z
    .string()
    .min(2, "Domain is required")
    .transform((v) => v.trim().toLowerCase())
    .refine(
      (v) => /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v),
      { message: "Enter a valid domain (e.g. example.com)" },
    ),
});

type FormData = z.infer<typeof formSchema>;

export function NewSiteForm() {
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", domain: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await createSite(data);
      toast.success(res.message ?? "Site created successfully!");
      router.push(`/dashboard/sites/${res.data.site.id}`);
    } catch (err: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ?? "Failed to create site";
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Site Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Website" {...field} />
              </FormControl>
              <FormDescription>
                A name for your reference in the dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Domain <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="example.com" {...field} />
              </FormControl>
              <FormDescription>
                Root domain only, without https:// (e.g. example.com).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={form.formState.isSubmitting}
          >
            Reset
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Add Site"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
