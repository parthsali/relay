"use client";

import { Grip } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

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
        <Grip className="size-5 animate-pulse text-foreground" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
