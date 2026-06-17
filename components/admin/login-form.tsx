"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Snowflake } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { getSafeErrorMessage, safeInternalRedirect } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";

const schema = z.object({
  email: z.string().email("Enter your staff email"),
  password: z.string().min(6, "Password is required")
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const configured = supabaseEnv().configured;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    if (!configured) {
      setError("Supabase environment variables are missing.");
      return;
    }

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword(values);
      if (signInError) {
        setError("Invalid email or password.");
        return;
      }

      router.replace(safeInternalRedirect(params.get("next")));
      router.refresh();
    } catch {
      setError(getSafeErrorMessage("sign in"));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-primary-700 text-white">
            <Snowflake className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Admin Login</h1>
            <p className="text-sm font-medium text-muted">Daikin Service Portal</p>
          </div>
        </div>
        {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
        <div className="grid gap-4">
          <Input label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" autoComplete="current-password" {...register("password")} error={errors.password?.message} />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            <LockKeyhole className="h-4 w-4" />
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </main>
  );
}
