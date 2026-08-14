import { Link } from "@/components/Link";
import { useState } from "react";
import { Camera, Cloud, CloudOff, Check, Droplets, Sprout, Bug, UserRound } from "lucide-react";
import { GlassCard, Chip, PillButton } from "@/components/ui-kit";
import logo from "@/assets/logo.png";
import scanStreak from "@/assets/scan-streak.jpg";
import scanHealthy from "@/assets/scan-healthy.jpg";
import scanPest from "@/assets/scan-pest.jpg";
import leafScan from "@/assets/leaf-scan.jpg";

const initialTasks = [
  { id: 1, label: "Spray Confidor on Plot B", when: "Today · 4:00 PM", icon: Droplets, done: false },
  { id: 2, label: "Scout for mealybugs, Plot C", when: "Tomorrow", icon: Bug, done: false },
  { id: 3, label: "Re-scan treated cassava rows", when: "Sat, 15 Aug", icon: Sprout, done: true },
];

const getImageForDisease = (diseaseId) => {
  if (diseaseId === 'healthy') return scanHealthy;
  if (diseaseId === 'cgm') return scanPest;
  if (diseaseId === 'cbsd') return scanStreak;
  return leafScan;
};

const getNameForDisease = (diseaseId) => {
  if (diseaseId === 'cmd') return 'Mosaic Disease';
  if (diseaseId === 'cbb') return 'Bacterial Blight';
  if (diseaseId === 'cgm') return 'Green Mite';
  if (diseaseId === 'cbsd') return 'Brown Streak';
  return 'Healthy';
};

function Dashboard({ profile, scans = [], reminders = [] }) {
  const [online, setOnline] = useState(true);

  return (
    <div>
      <header className="glass-strong sticky top-0 z-30 flex items-center justify-between rounded-b-3xl px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Manna AgriSense logo" width={512} height={512} className="size-9" />
          <div>
            <p className="text-xs text-muted-foreground">Manna AgriSense</p>
            <h1 className="text-lg font-semibold">Hello, {profile?.full_name?.split(' ')[0] || 'Farmer'}</h1>
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
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
          {scans.length > 0 ? (
            scans.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                to="/treatment"
                state={{ scan: s }}
                className="glass w-40 shrink-0 rounded-3xl p-2.5 transition-transform active:scale-[0.98]"
              >
                <img
                  src={getImageForDisease(s.diseaseId)}
                  alt={`${s.diseaseId} cassava scan`}
                  loading="lazy"
                  width={640}
                  height={640}
                  className="h-24 w-full rounded-2xl object-cover"
                />
                <p className="mt-2.5 text-sm font-semibold">{getNameForDisease(s.diseaseId)}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[0.65rem] text-muted-foreground">{s.date}</span>
                  <Chip
                    className={
                      s.treated
                        ? "border-primary/30 text-primary"
                        : "border-warning/30 text-warning"
                    }
                  >
                    {s.treated ? "Treated" : "Needs Action"}
                  </Chip>
                </div>
              </Link>
            ))
          ) : (
            <div className="glass flex w-full flex-col items-center justify-center rounded-3xl p-6 text-center text-muted-foreground">
              <Camera className="size-8 opacity-50 mb-2" />
              <p className="text-sm">No recent scans</p>
              <p className="text-xs mt-1">Tap 'Scan Crop' to get started</p>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 pt-7">
        <h2 className="text-base font-semibold">Upcoming Tasks</h2>
        <GlassCard className="mt-3 divide-y divide-white/5">
          {reminders.length > 0 ? reminders.slice(0, 5).map((t) => {
            const Icon = t.icon === 'Sprout' ? Sprout : t.icon === 'Droplets' ? Droplets : Bug;
            
            // extract diseaseId from title using a heuristic or just pass default cmd
            let detectedDisease = 'cmd';
            if (t.title.includes('CBSD')) detectedDisease = 'cbsd';
            else if (t.title.includes('CBB')) detectedDisease = 'cbb';
            else if (t.title.includes('CGM')) detectedDisease = 'cgm';
            
            return (
              <Link key={t.id} to="/treatment" state={{ diseaseId: detectedDisease }} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5 active:bg-white/10">
                <span className="glass flex size-9 items-center justify-center rounded-full">
                  <Icon className="size-4 text-accent" />
                </span>
                <span className="flex-1">
                  <span className={`block text-sm font-medium ${!t.enabled ? "text-muted-foreground line-through" : ""}`}>
                    {t.title}
                  </span>
                  <span className="block text-[0.68rem] text-muted-foreground">{t.time}</span>
                </span>
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${
                    !t.enabled
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_-2px_var(--primary)]"
                      : "border-glass-border"
                  }`}
                >
                  {!t.enabled ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </Link>
            );
          }) : (
            <div className="p-5 text-center text-sm text-muted-foreground">No pending treatment tasks.</div>
          )}
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
