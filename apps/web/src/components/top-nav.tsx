"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface JwtUser {
  name: string;
  email: string;
  avatar_url: string;
}

function getTokenCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|;\s*)relay_token=([^;]+)/);
  return m?.[1];
}

function decodeJwt(token: string): JwtUser | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)) as JwtUser;
  } catch {
    return null;
  }
}

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<JwtUser | null>(null);

  useEffect(() => {
    const token = getTokenCookie();
    if (token) setUser(decodeJwt(token));
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  function handleLogout() {
    document.cookie = "relay_token=; Max-Age=0; path=/";
    router.push("/login");
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <svg width="16" height="16" viewBox="0 0 76 65" fill="currentColor" className="text-foreground">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
        <span className="text-sm font-semibold tracking-tight">Relay</span>
      </Link>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Online indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Online
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Theme */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-6">
              {/* referrerPolicy="no-referrer" is required for Google profile photos */}
              <AvatarImage
                src={user?.avatar_url}
                alt={user?.name ?? ""}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-[9px] font-semibold bg-muted">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* User info header */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="size-8">
                <AvatarImage
                  src={user?.avatar_url}
                  alt={user?.name ?? ""}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm font-medium">{user?.name ?? "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => {}}>
              <User className="size-3.5" />
              <Link href="/settings">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="size-3.5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
