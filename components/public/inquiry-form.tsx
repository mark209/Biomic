"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Upload } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { airconTypes, serviceTypes } from "@/lib/constants";
import { makeDateScopedReference } from "@/lib/reference";
import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";
import { inquirySchema } from "@/lib/validation";

type InquiryFormValues = z.infer<typeof inquirySchema>;

export function InquiryForm({ compact = false, hidePhotoUpload = false }: { compact?: boolean; hidePhotoUpload?: boolean }) {
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const configured = supabaseEnv().configured;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      service_type: "Aircon Cleaning",
      aircon_type: "Wall-mounted Split"
    }
  });

  async function onSubmit(values: InquiryFormValues) {
    setSubmitError(null);
    setSuccessRef(null);

    if (!configured) {
      setSubmitError("Supabase is not configured yet. Add the environment variables before accepting live inquiries.");
      return;
    }

    const supabase = createClient();
    const reference = makeDateScopedReference("DAI");
    let photoPath: string | null = null;

    if (photo) {
      const extension = photo.name.split(".").pop() ?? "jpg";
      photoPath = `${reference}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("inquiry-photos").upload(photoPath, photo, {
        cacheControl: "3600",
        upsert: false
      });
      if (error) {
        setSubmitError(error.message);
        return;
      }
    }

    const { error } = await (supabase as any).from("inquiries").insert({
      reference_number: reference,
      customer_name: values.customer_name,
      contact_number: values.contact_number,
      email: values.email || null,
      address: values.address,
      service_type: values.service_type,
      aircon_type: values.aircon_type,
      brand_model: values.brand_model || null,
      problem_description: values.problem_description,
      preferred_schedule: values.preferred_schedule || null,
      photo_path: photoPath,
      status: "New"
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSuccessRef(reference);
    setPhoto(null);
    reset();
  }

  if (successRef) {
    return (
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-6">
        <h2 className="text-2xl font-bold text-primary-900">Service request received</h2>
        <p className="mt-2 text-muted">Your reference number is:</p>
        <p className="mt-3 rounded-md bg-white px-4 py-3 text-xl font-extrabold text-primary-800">{successRef}</p>
        <p className="mt-3 text-sm text-muted">Our dispatch team will review your inquiry and contact you using the details provided.</p>
        <Button className="mt-5" variant="secondary" onClick={() => setSuccessRef(null)}>
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
      {submitError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger">{submitError}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Customer name" placeholder="Juan Dela Cruz" {...register("customer_name")} error={errors.customer_name?.message} />
        <Input label="Contact number" placeholder="+63 900 000 0000" {...register("contact_number")} error={errors.contact_number?.message} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Email optional" type="email" placeholder="customer@email.com" {...register("email")} error={errors.email?.message} />
        <Input label="Preferred schedule optional" type="date" {...register("preferred_schedule")} error={errors.preferred_schedule?.message} />
      </div>
      <Input label="Address" placeholder="Complete service address" {...register("address")} error={errors.address?.message} />
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Service type" {...register("service_type")} error={errors.service_type?.message}>
          {serviceTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Select>
        <Select label="Aircon type" {...register("aircon_type")} error={errors.aircon_type?.message}>
          {airconTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Select>
      </div>
      <Input label="Brand/model optional" placeholder="Daikin FTKC, VRV, etc." {...register("brand_model")} error={errors.brand_model?.message} />
      <Textarea
        label="Problem description"
        placeholder="Describe symptoms, error codes, cooling issue, noise, leaks, or installation requirements."
        {...register("problem_description")}
        error={errors.problem_description?.message}
      />
      {!hidePhotoUpload ? (
        <label className="grid gap-2 rounded-lg border border-dashed border-line bg-slate-50 p-4 text-sm font-semibold text-ink">
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary-700" />
            Photo upload optional
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            className="min-h-11 w-full max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:font-bold file:text-primary-900"
          />
        </label>
      ) : null}
      <div className={compact ? "flex justify-end" : "grid gap-3 border-t border-line pt-2 md:flex md:items-center md:justify-between"}>
        {!compact ? <p className="mb-3 text-sm font-medium text-muted md:mb-0">Your information is securely submitted to the service desk.</p> : null}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit service request"}
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
