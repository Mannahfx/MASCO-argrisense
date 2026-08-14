import { Link } from "@/components/Link";
import { AlertTriangle, ChevronLeft, Sparkle, MapPin, CalendarClock, ShieldCheck } from "lucide-react";
import { GlassCard, Chip, PillButton, ConfidenceRing } from "@/components/ui-kit";
import scanStreak from "@/assets/scan-streak.jpg";
import scanHealthy from "@/assets/scan-healthy.jpg";
import scanPest from "@/assets/scan-pest.jpg";
import leafScan from "@/assets/leaf-scan.jpg";

const detectableConditions = [
  { short: "CMD", name: "Cassava Mosaic Disease", healthy: false },
  { short: "CBSD", name: "Cassava Brown Streak Disease", healthy: false },
  { short: "CBB", name: "Cassava Bacterial Blight", healthy: false },
  { short: "CGM", name: "Cassava Green Mite", healthy: false },
  { short: "OK", name: "Healthy Plant", healthy: true },
];

const getImageForDisease = (diseaseId) => {
  if (diseaseId === 'healthy') return scanHealthy;
  if (diseaseId === 'cgm') return scanPest;
  if (diseaseId === 'cbsd') return scanStreak;
  return leafScan; // cmd, cbb
};

const getNameForDisease = (diseaseId) => {
  if (diseaseId === 'cmd') return 'Cassava Mosaic Disease';
  if (diseaseId === 'cbb') return 'Cassava Bacterial Blight';
  if (diseaseId === 'cgm') return 'Cassava Green Mite';
  if (diseaseId === 'cbsd') return 'Cassava Brown Streak Disease';
  return 'Healthy Plant';
};

const getDescForDisease = (diseaseId) => {
  if (diseaseId === 'cmd') return 'Viral · spread by whitefly vectors';
  if (diseaseId === 'cbb') return 'Bacterial · spreads rapidly in rain';
  if (diseaseId === 'cgm') return 'Pest · extracts fluid from leaves';
  if (diseaseId === 'cbsd') return 'Viral · causes root necrosis';
  return 'No issues detected';
};

function DiagnosisScreen({ profile, params = {} }) {
  const { diseaseId = 'cmd', aiConfidence = 94, allScores = { cbsd: 4, healthy: 2 } } = params;
  
  const isHealthy = diseaseId === 'healthy';
  
  // Get other scores sorted
  const otherMatches = Object.entries(allScores)
    .filter(([id]) => id !== diseaseId)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([id, score]) => ({ name: getNameForDisease(id), score }));

  return (
    <div>
      <div className="relative">
        <img
          src={getImageForDisease(diseaseId)}
          alt="Scanned cassava leaf"
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
            <Sparkle className="size-3" /> Scan #{params.scanId?.slice(-4) || 'A-1042'}
          </Chip>
        </div>
      </div>

      <div className="-mt-8 px-5 pb-20">
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              {isHealthy ? (
                <Chip className="border-primary/40 text-primary">
                  <ShieldCheck className="size-3" /> Status: Optimal
                </Chip>
              ) : (
                <Chip className="border-destructive/40 text-destructive">
                  <AlertTriangle className="size-3" /> Severity: High
                </Chip>
              )}
              <h1 className="mt-3 text-xl font-semibold leading-tight">{getNameForDisease(diseaseId)}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {getDescForDisease(diseaseId)}
              </p>
            </div>
            <ConfidenceRing value={aiConfidence} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                <MapPin className="size-3" /> Plot
              </p>
              <p className="text-sm font-semibold truncate">{profile?.location || 'Plot B'} · {(Math.random() * 2 + 0.5).toFixed(1)} ha</p>
            </div>
            <div className="glass rounded-2xl px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                <CalendarClock className="size-3" /> Scanned
              </p>
              <p className="text-sm font-semibold truncate">Today · {new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit'})}</p>
            </div>
          </div>

          {!isHealthy && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Detected visual anomalies matching {diseaseId.toUpperCase()} pathology across sampled canopy. Left
              untreated, expect significant yield loss. Act within 72 hours.
            </p>
          )}
        </GlassCard>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link to="/treatment">
            <PillButton variant="glass" className="w-full">
              {isHealthy ? "View Nutrition Plan" : "View Treatment Plan"}
            </PillButton>
          </Link>
          <Link to="/chat">
            <PillButton className="w-full">Chat with AI</PillButton>
          </Link>
        </div>

        <GlassCard className="mt-4 p-4">
          <p className="text-sm font-semibold">Other possible matches</p>
          <div className="mt-3 space-y-2.5">
            {otherMatches.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="flex-1 text-xs text-muted-foreground">{m.name}</span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${m.score}%` }}
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
