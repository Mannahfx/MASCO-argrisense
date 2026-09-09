import { Link } from "@/components/Link";
import {
  Home,
  ScanLine,
  MessageCircle,
  ShoppingBag,
  LineChart,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/diagnosis", label: "Diagnose", icon: ScanLine },
  { to: "/chat", label: "AI", icon: MessageCircle },
  { to: "/treatment", label: "Store", icon: ShoppingBag },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function MobileShell({ children, activeScreen = "home" }) {
  const pathMap = { home: "/", scan: "/diagnosis", chat: "/chat", treatment: "/treatment", market: "/market", profile: "/profile" };
  const currentPath = pathMap[activeScreen] || "/";
  const chromeless = activeScreen === "auth" || activeScreen === "admin";

  return (
    <div className="aurora min-h-screen bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-full md:max-w-2xl lg:max-w-4xl flex-col shadow-2xl bg-background/50">
        <main className={cn("flex-1", chromeless ? "pb-4" : "pb-28")}>{children}</main>

        {!chromeless && (
          <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-full md:max-w-2xl lg:max-w-4xl rounded-t-3xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 border-t border-glass-border">
            <ul className="flex items-center justify-around">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = t.to === currentPath;
                return (
                  <li key={t.to}>
                    <Link
                      to={t.to}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-3 py-2 text-[0.62rem] font-medium transition-colors",
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn("size-5 transition-all", active && "drop-shadow-[0_0_8px_var(--primary)]")}
                      />
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
