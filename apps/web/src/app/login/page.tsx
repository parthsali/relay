"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

const ERRORS: Record<string, string> = {
  not_activated:
    "Your account is not activated. Contact the administrator to get access.",
  auth_failed: "Authentication failed. Please try again.",
};

function ErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = error ? (ERRORS[error] ?? ERRORS.auth_failed) : null;
  if (!message) return null;
  return (
    <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-2.5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 76 65"
          fill="currentColor"
          className="text-foreground"
        >
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
        <span className="text-base font-semibold tracking-tight">Relay</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-85 rounded-xl border border-border bg-card p-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your Google account to continue.
          </p>
        </div>

        {/* Error banner */}
        <Suspense>
          <ErrorBanner />
        </Suspense>

        {/* Google OAuth — browser follows backend redirect */}
        <a
          href={`${API_URL}/auth/google`}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </a>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in you agree to our{" "}
          <span className="underline underline-offset-2 cursor-pointer">
            Terms of Service
          </span>
          .
        </p>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Relay — Control your display from anywhere.
      </p>
    </div>
  );
}
