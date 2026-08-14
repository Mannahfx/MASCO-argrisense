import { Link } from "@/components/Link";
import { AlertTriangle, ChevronLeft, Sparkle, MapPin, CalendarClock } from "lucide-react";
import { GlassCard, Chip, PillButton, ConfidenceRing } from "@/components/ui-kit";
import leafScan from "@/assets/leaf-scan.jpg";


const detectableConditions = [
  { short: "CMD", name: "Cassava Mosaic Disease", healthy: false },
  { short: "CBSD", name: "Cassava Brown Streak Disease", healthy: false },
  { short: "CBB", name: "Cassava Bacterial Blight", healthy: false },
  { short: "CGM", name: "Cassava Green Mottle", healthy: false },
  { short: "OK", name: "Healthy Plant", healthy: true },
];

function DiagnosisScreen() {
  return (
    <div>
      <div className="relative">
        <img
          src={leafScan}
          alt="Scanned cassava leaf showing mosaic disease"
          width={1024}
          height={1024}
          className="h-72 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-5">
          <Link to="/" className="glass flex size-10 items-center justify-center rounded-full">
            <ChevronLeft className="size-5" />
          </Link>
          <Chip className="border-primary/30 text-primary">
            <Sparkle className="size-3" /> Scan #A-1042
          </Chip>
        </div>
      </div>

      <div className="-mt-8 px-5">
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Chip className="border-destructive/40 text-destructive">
                <AlertTriangle className="size-3" /> Severity: High
              </Chip>
              <h1 className="mt-3 text-xl font-semibold leading-tight">Cassava Mosaic Disease</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Viral · spread by whitefly vectors
              </p>
            </div>
            <ConfidenceRing value={94} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                <MapPin className="size-3" /> Plot
              </p>
              <p className="text-sm font-semibold">Plot B · 1.4 ha</p>
            </div>
            <div className="glass rounded-2xl px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                <CalendarClock className="size-3" /> Scanned
              </p>
              <p className="text-sm font-semibold">Today · 3:02 PM</p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Yellow-green mosaic mottling with leaf distortion across 38% of sampled canopy. Left
            untreated, expect 20–40% yield loss. Act within 72 hours.
          </p>
        </GlassCard>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link to="/treatment">
            <PillButton variant="glass" className="w-full">
              View Treatment Plan
            </PillButton>
          </Link>
          <Link to="/chat">
            <PillButton className="w-full">Chat with AI Agronomist</PillButton>
          </Link>
        </div>

        <GlassCard className="mt-4 p-4">
          <p className="text-sm font-semibold">Other possible matches</p>
          <div className="mt-3 space-y-2.5">
            {[
              { name: "Cassava Brown Streak", score: 4 },
              { name: "Nutrient deficiency (N)", score: 2 },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="flex-1 text-xs text-muted-foreground">{m.name}</span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${m.score * 10}%` }}
                  />
                </span>
                <span className="w-7 text-right text-[0.65rem] text-muted-foreground">
                  {m.score}%
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mt-4 p-4">
          <p className="text-sm font-semibold">Conditions this model detects</p>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">
            Manna AgriSense is trained on five cassava classes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {detectableConditions.map((c) => (
              <Chip
                key={c.short}
                className={
                  c.healthy ? "border-primary/30 text-primary" : "border-glass-border text-foreground"
                }
              >
                {c.short} · {c.name}
              </Chip>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default DiagnosisScreen;
