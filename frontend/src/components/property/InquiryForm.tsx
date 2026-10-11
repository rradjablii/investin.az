"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { ApiError, postInquiry } from "@/lib/api";
import { PrimaryButton } from "@/components/ui/StateMessage";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().min(1, "Please enter your email").email("Enter a valid email address").max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000, "Message is too long (max 2000 characters)"),
  website: z.string().optional(), // honeypot
});
type Values = z.infer<typeof schema>;

export default function InquiryForm({ listingId, title }: { listingId: string; title: string }) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", message: `Hello, I am interested in "${title}". Please send me more information.`, website: "" },
  });

  if (done) {
    return (
      <div role="status" className="rounded-lg border border-accent/30 bg-accent-soft p-4">
        <p className="flex items-center gap-2 font-medium text-accent"><CheckCircle2 className="h-5 w-5" aria-hidden /> Inquiry sent</p>
        <p className="mt-1 text-sm text-ink-2">Your message has been recorded. The seller or agency will reply to the email address you provided.</p>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm";
  return (
    <form noValidate onSubmit={handleSubmit(async (v) => {
      setServerError(null);
      try {
        await postInquiry({ listingId, name: v.name, email: v.email, phone: v.phone || undefined, message: v.message, website: v.website });
        setDone(true);
      } catch (e) {
        setServerError(e instanceof ApiError && e.status === 429 ? "Too many inquiries from your connection. Please try again later."
          : e instanceof ApiError && e.status === 404 ? "This listing is no longer available."
          : "We couldn't send your inquiry. Please try again.");
      }
    })} className="space-y-3">
      <div>
        <label htmlFor="inq-name" className="text-sm font-medium">Your name</label>
        <input id="inq-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "inq-name-err" : undefined} className={field} {...register("name")} />
        {errors.name && <p id="inq-name-err" className="mt-1 text-sm text-danger">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="inq-email" className="text-sm font-medium">Email</label>
        <input id="inq-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "inq-email-err" : undefined} className={field} {...register("email")} />
        {errors.email && <p id="inq-email-err" className="mt-1 text-sm text-danger">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="inq-phone" className="text-sm font-medium">Phone <span className="font-normal text-ink-3">(optional)</span></label>
        <input id="inq-phone" type="tel" autoComplete="tel" className={field} {...register("phone")} />
      </div>
      <div>
        <label htmlFor="inq-message" className="text-sm font-medium">Message</label>
        <textarea id="inq-message" rows={4} aria-invalid={!!errors.message} aria-describedby={errors.message ? "inq-message-err" : undefined} className={field} {...register("message")} />
        {errors.message && <p id="inq-message-err" className="mt-1 text-sm text-danger">{errors.message.message}</p>}
      </div>
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label>
      </div>
      {serverError && <p role="alert" className="rounded-md bg-danger-soft p-2 text-sm text-danger">{serverError}</p>}
      <PrimaryButton type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Sending…" : "Send inquiry"}</PrimaryButton>
      <p className="text-xs text-ink-3">Your details are stored so the seller or agency can reply. They are never shown publicly.</p>
    </form>
  );
}
