// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;
import { useState } from "react";
import { Camera, Cloud, CloudOff, Check, Droplets, Sprout, Bug, UserRound } from "lucide-react";
import { GlassCard, Chip, PillButton } from "@/components/ui-kit";
import logo from "@/assets/logo.png";
import scanStreak from "@/assets/scan-streak.jpg";
import scanHealthy from "@/assets/scan-healthy.jpg";
import scanPest from "@/assets/scan-pest.jpg";



const recentScans = [
  { img: scanStreak, name: "Brown Streak", date: "12 Aug", status: "Treated" },
  { img: scanPest, name: "Mealybug", date: "09 Aug", status: "In progress" },
  { img: scanHealthy, name: "Healthy", date: "04 Aug", status: "Treated" },
];

const initialTasks = [
  { id: 1, label: "Spray Confidor on Plot B", when: "Today · 4:00 PM", icon: Droplets, done: false },
  { id: 2, label: "Scout for mealybugs, Plot C", when: "Tomorrow", icon: Bug, done: false },
  { id: 3, label: "Re-scan treated cassava rows", when: "Sat, 15 Aug", icon: Sprout, done: true },
];

function Dashboard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [online, setOnline] = useState(true);

  return (
    <div>
      <header className="glass-strong sticky top-0 z-30 flex items-center justify-between rounded-b-3xl px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Manna AgriSense logo" width={512} height={512} className="size-9" />
          <div>
            <p className="text-xs text-muted-foreground">Manna AgriSense</p>
            <h1 className="text-lg font-semibold">Hello, Yinka</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnline((v) => !v)}
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-medium"
          >
            {online ? (
              <>
                <Cloud className="size-3.5 text-primary" /> Synced
              </>
            ) : (
              <>
                <CloudOff className="size-3.5 text-warning" /> Offline
              </>
            )}
          </button>
          <Link
            to="/profile"
            aria-label="Profile and settings"
            className="glass flex size-9 items-center justify-center rounded-full"
          >
            <UserRound className="size-4" />
          </Link>
        </div>
      </header>


      <section className="px-5 pt-6">
        <Link to="/diagnosis" className="block">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary/90 px-6 py-7 text-primary-foreground shadow-[var(--shadow-glow)]">
            <div className="absolute -right-8 -top-10 size-32 rounded-full bg-white/20 blur-2xl" />
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-black/15">
                <Camera className="size-7" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold">Scan Crop</p>
                <p className="text-xs opacity-80">Point at a leaf — diagnosis in ~3 seconds</p>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="pt-7">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-base font-semibold">Recent Scans</h2>
          <span className="text-xs text-muted-foreground">Last 14 days</span>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
          {recentScans.map((s) => (
            <Link
              key={s.name}
              to="/diagnosis"
              className="glass w-40 shrink-0 rounded-3xl p-2.5 transition-transform active:scale-[0.98]"
            >
              <img
                src={s.img}
                alt={`${s.name} cassava scan`}
                loading="lazy"
                width={640}
                height={640}
                className="h-24 w-full rounded-2xl object-cover"
              />
              <p className="mt-2.5 text-sm font-semibold">{s.name}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[0.65rem] text-muted-foreground">{s.date}</span>
                <Chip
                  className={
                    s.status === "Treated"
                      ? "border-primary/30 text-primary"
                      : "border-warning/30 text-warning"
                  }
                >
                  {s.status}
                </Chip>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 pt-7">
        <h2 className="text-base font-semibold">Upcoming Tasks</h2>
        <GlassCard className="mt-3 divide-y divide-white/5">
          {tasks.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() =>
                  setTasks((prev) =>
                    prev.map((p) => (p.id === t.id ? { ...p, done: !p.done } : p)),
                  )
                }
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="glass flex size-9 items-center justify-center rounded-full">
                  <Icon className="size-4 text-accent" />
                </span>
                <span className="flex-1">
                  <span
                    className={`block text-sm font-medium ${t.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {t.label}
                  </span>
                  <span className="block text-[0.68rem] text-muted-foreground">{t.when}</span>
                </span>
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${
                    t.done
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_-2px_var(--primary)]"
                      : "border-glass-border"
                  }`}
                >
                  {t.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </GlassCard>
      </section>

      <section className="px-5 pt-6">
        <GlassCard className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">Cassava price is up 6.2%</p>
            <p className="text-[0.7rem] text-muted-foreground">₦248,000 / tonne · Ibadan depot</p>
          </div>
          <Link to="/market">
            <PillButton variant="glass" className="px-4 py-2 text-xs">
              View market
            </PillButton>
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}

export default Dashboard;
