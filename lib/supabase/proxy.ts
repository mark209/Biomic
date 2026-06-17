import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const protectedPrefixes = ["/admin"];
const publicAdminRoutes = ["/admin/login"];
const allowedAdminRoles = new Set(["admin", "staff"]);
type StaffProfile = { role: string | null };

function roleFromClaims(claims: Record<string, unknown> | undefined) {
  const appMetadata = claims?.app_metadata as { role?: unknown; roles?: unknown } | undefined;
  const userMetadata = claims?.user_metadata as { role?: unknown; roles?: unknown } | undefined;
  const role = typeof appMetadata?.role === "string" ? appMetadata.role : typeof userMetadata?.role === "string" ? userMetadata.role : null;
  const roles = Array.isArray(appMetadata?.roles) ? appMetadata.roles : Array.isArray(userMetadata?.roles) ? userMetadata.roles : [];

  if (role && allowedAdminRoles.has(role)) {
    return role;
  }

  return roles.find((item): item is string => typeof item === "string" && allowedAdminRoles.has(item)) ?? null;
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isPublicAdmin = publicAdminRoutes.some((route) => pathname.startsWith(route));

  if (!url || !key) {
    if (isProtected && !isPublicAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (isProtected && !isPublicAdmin && !claims) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtected && !isPublicAdmin && claims && !roleFromClaims(claims as Record<string, unknown>)) {
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    let profile: StaffProfile | null = null;

    if (userId) {
      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      profile = profileData as StaffProfile | null;
    }

    if (!profile?.role || !allowedAdminRoles.has(profile.role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.delete("next");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
