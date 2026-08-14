// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;
import { useState } from "react";
import { Bell, CloudDownload, Moon, LifeBuoy, LogOut, MapPin, Ruler, Leaf } from "lucide-react";
import { GlassCard, Chip, PillButton } from "@/components/ui-kit";
import logo from "@/assets/logo.png";

// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;




function Toggle({
  label,
  icon: Icon,
  defaultOn = false,
}: {
  label: string;
  icon: typeof Bell;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5"
    >
      <Icon className={`size-4 ${on ? "text-primary" : "text-muted-foreground"}`} />
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-all ${
          on ? "bg-primary shadow-[var(--shadow-glow)]" : "bg-white/10"
        }`}
      >
        <span
          className={`size-5 rounded-full bg-background transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}

const fields = [
  { label: "Farm Location", value: "Ikorodu, Lagos State", icon: MapPin },
  { label: "Farm Size", value: "15 Hectares", icon: Ruler },
  { label: "Crop Type", value: "Cassava (TME 419)", icon: Leaf },
];

function ProfileScreen() {
  return (
    <div className="pb-6">
      <header className="glass-strong sticky top-0 z-30 flex items-center justify-between rounded-b-3xl px-5 py-4">
        <h1 className="text-lg font-semibold">Profile</h1>
        <Chip className="border-primary/30 text-primary">Farmer</Chip>
      </header>

      <section className="flex flex-col items-center px-5 pt-7">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
          <img
            src={logo}
            alt="Yinka Olayinka profile avatar"
            width={512}
            height={512}
            className="glass relative size-24 rounded-full object-cover p-3"
          />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">Yinka Olayinka</h2>
        <Chip className="mt-2 border-primary/30 text-primary">15 Hectares · Cassava</Chip>
      </section>

      <section className="px-5 pt-7">
        <h3 className="text-base font-semibold">Farm details</h3>
        <div className="mt-3 space-y-2.5">
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <label key={f.label} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block text-[0.62rem] text-muted-foreground">{f.label}</span>
                  <input
                    defaultValue={f.value}
                    maxLength={80}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-7">
        <h3 className="text-base font-semibold">App settings</h3>
        <div className="mt-3 space-y-2.5">
          <Toggle label="Push Notifications" icon={Bell} defaultOn />
          <Toggle label="Offline Mode Sync" icon={CloudDownload} defaultOn />
          <Toggle label="Dark Theme" icon={Moon} defaultOn />
        </div>
      </section>

      <section className="space-y-3 px-5 pt-7">
        <PillButton variant="glass" className="w-full">
          <LifeBuoy className="size-4" /> Contact Manna Support
        </PillButton>
        <Link to="/auth" className="block">
          <button className="w-full rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground shadow-[0_10px_40px_-8px_var(--destructive)] transition-all active:scale-[0.97]">
            <span className="inline-flex items-center gap-2">
              <LogOut className="size-4" /> Sign Out
            </span>
          </button>
        </Link>
      </section>
    </div>
  );
}

export default Toggle;
