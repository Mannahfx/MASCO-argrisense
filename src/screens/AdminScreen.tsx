// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;
import { useState } from "react";
import {
  Users,
  Activity,
  TrendingUp,
  Radio,
  Boxes,
  ShieldCheck,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import { GlassCard, Chip, PillButton } from "@/components/ui-kit";

// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;




const stats = [
  { label: "Active farmers", value: "2,481", delta: "+126 this week", icon: Users },
  { label: "Diagnoses this week", value: "3,907", delta: "+18% vs last", icon: Activity },
  { label: "Trending disease", value: "CMD", delta: "42% of scans", icon: TrendingUp },
];

const farmers = [
  { name: "Adaeze Nwosu", location: "Oyo, Ibadan North", size: "8 ha", joined: "2h ago" },
  { name: "Musa Bello", location: "Benue, Gboko", size: "22 ha", joined: "5h ago" },
  { name: "Tolu Adebayo", location: "Ogun, Abeokuta", size: "15 ha", joined: "Yesterday" },
  { name: "Chinedu Okeke", location: "Enugu, Nsukka", size: "6 ha", joined: "Yesterday" },
];

const outbreak = [
  { name: "Cassava Mosaic Disease (CMD)", pct: 42 },
  { name: "Cassava Brown Streak (CBSD)", pct: 23 },
  { name: "Cassava Bacterial Blight (CBB)", pct: 16 },
  { name: "Cassava Green Mottle (CGM)", pct: 9 },
  { name: "Healthy plants", pct: 10 },
];

function AdminScreen() {
  const [sent, setSent] = useState(false);

  return (
    <div className="pb-6">
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl px-5 py-4">
        <Link to="/auth" className="glass flex size-9 items-center justify-center rounded-full">
          <ChevronLeft className="size-4.5" />
        </Link>
        <div className="flex-1">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-accent">Control Center</p>
          <h1 className="text-lg font-semibold">Manna Admin</h1>
        </div>
        <Chip className="border-accent/40 text-accent">
          <ShieldCheck className="size-3" /> Admin
        </Chip>
      </header>

      <section className="grid grid-cols-2 gap-3 px-5 pt-5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} className={`p-4 ${i === 2 ? "col-span-2" : ""}`}>
              <Icon className="size-4 text-primary" />
              <p className="mt-2.5 font-display text-2xl font-semibold">{s.value}</p>
              <p className="text-[0.68rem] text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-[0.62rem] text-primary">{s.delta}</p>
            </GlassCard>
          );
        })}
      </section>

      <section className="px-5 pt-5">
        <GlassCard className="p-4">
          <p className="text-sm font-semibold">Diagnosis mix · last 7 days</p>
          <div className="mt-3 space-y-2.5">
            {outbreak.map((o) => (
              <div key={o.name} className="flex items-center gap-3">
                <span className="flex-1 text-[0.7rem] text-muted-foreground">{o.name}</span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${o.pct}%` }}
                  />
                </span>
                <span className="w-8 text-right text-[0.65rem]">{o.pct}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent sign-ups</h2>
          <span className="text-xs text-muted-foreground">User management</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {farmers.map((f) => (
            <GlassCard key={f.name} className="flex items-center gap-3 p-3.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
                {f.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{f.name}</p>
                <p className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                  <MapPin className="size-3" /> {f.location}
                </p>
              </div>
              <div className="text-right">
                <Chip className="border-accent/30 text-accent">{f.size}</Chip>
                <p className="mt-1 text-[0.6rem] text-muted-foreground">{f.joined}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 px-5 pt-5">
        <PillButton onClick={() => setSent(true)} className="w-full">
          <Radio className="size-4" />
          {sent ? "Alert broadcast to 2,481 farmers" : "Broadcast Alert to Farmers"}
        </PillButton>
        <PillButton variant="accent" className="w-full">
          <Boxes className="size-4" /> Manage Inventory
        </PillButton>
      </section>
    </div>
  );
}

export default AdminScreen;
