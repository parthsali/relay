"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      router.replace("/login?error=auth_failed");
      return;
    }
    const maxAge = 60 * 60 * 24; // 24 hours
    document.cookie = `relay_token=${token}; path=/; max-age=${maxAge}; samesite=lax`;
    router.replace("/");
  }, [searchParams, router]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 76 65"
          fill="currentColor"
          className="animate-pulse text-foreground"
        >
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
