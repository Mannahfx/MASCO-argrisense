import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  ScanLine,
  MessageCircle,
  ShoppingBag,
  LineChart,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/diagnosis", label: "Diagnose", icon: ScanLine },
  { to: "/chat", label: "AI", icon: MessageCircle },
  { to: "/treatment", label: "Store", icon: ShoppingBag },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chromeless = pathname.startsWith("/auth") || pathname.startsWith("/admin");

  return (
    <div className="aurora min-h-screen bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[26rem] flex-col">
        <main className={cn("flex-1", chromeless ? "pb-4" : "pb-28")}>{children}</main>

        {chromeless ? null : (
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[26rem] -translate-x-1/2 px-4 pb-4">
          <div className="glass-strong flex items-center justify-between rounded-full px-2 py-2">

            {tabs.map((tab) => {
              const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-label={tab.label}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[0.62rem] font-medium transition-all",
                    active
                      ? "bg-primary/15 text-primary shadow-[0_0_24px_-6px_var(--primary)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-[1.15rem]" strokeWidth={active ? 2.4 : 1.8} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
        )}

      </div>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="glass-strong sticky top-0 z-30 flex items-center justify-between gap-3 rounded-b-3xl px-5 py-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
