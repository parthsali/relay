"use client";

import Link from "next/link";
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

// Placeholder — replace with real session data from your auth context/cookie
const user = {
  name: "Parth Sali",
  email: "parth@example.com",
  image: "",
};

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleLogout() {
    // Clear token/session then redirect
    document.cookie = "token=; Max-Age=0; path=/";
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
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background">
            <Avatar className="size-7">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => {}}>
              <User className="size-3.5" />
              <Link href="/settings" className="flex items-center gap-2">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
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
