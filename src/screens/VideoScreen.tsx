// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;
import { useState } from "react";
import { ChevronLeft, Play, Pause, Volume2, Maximize2, Captions } from "lucide-react";
import { GlassCard, Chip } from "@/components/ui-kit";
import poster from "@/assets/avatar-poster.jpg";



const chapters = [
  { t: "00:00", title: "Why mosaic spreads so fast", len: "0:48" },
  { t: "00:48", title: "Roguing infected stands safely", len: "1:05" },
  { t: "01:53", title: "Mixing & spraying Confidor", len: "1:22" },
  { t: "03:15", title: "Replanting clean cuttings", len: "0:57" },
];

function VideoScreen() {
  const [playing, setPlaying] = useState(false);

  return (
    <div>
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl px-4 py-4">
        <Link to="/treatment" className="glass flex size-9 items-center justify-center rounded-full">
          <ChevronLeft className="size-4.5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">AI Video Treatment</h1>
          <p className="text-[0.68rem] text-muted-foreground">Guided by your AI agronomist</p>
        </div>
        <Chip className="border-accent/30 text-accent">Beta</Chip>
      </header>

      <section className="px-5 pt-5">
        <div className="glass relative overflow-hidden rounded-[1.75rem] p-2">
          <div className="relative overflow-hidden rounded-[1.4rem]">
            <img
              src={poster}
              alt="AI avatar agronomist presenting the treatment steps"
              width={1024}
              height={576}
              className="aspect-video w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />

            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause video" : "Play video"}
              className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_50px_-4px_var(--primary)] active:scale-95"
            >
              {playing ? (
                <Pause className="size-6" />
              ) : (
                <Play className="ml-0.5 size-6" fill="currentColor" />
              )}
            </button>

            <div className="glass-strong absolute inset-x-3 bottom-3 rounded-2xl px-3 py-2.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
                  style={{ width: playing ? "34%" : "12%" }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[0.65rem] text-muted-foreground">
                <span>{playing ? "01:24" : "00:31"} / 04:12</span>
                <span className="flex items-center gap-3">
                  <Captions className="size-3.5" />
                  <Volume2 className="size-3.5" />
                  <Maximize2 className="size-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <GlassCard className="p-4">
          <p className="text-sm font-semibold">Curing Cassava Mosaic Disease</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Generated for Plot B from scan #A-1042. Your AI presenter adapts dosage, timing and
            local product names to your farm — available in English, Yoruba and Hausa.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip className="text-muted-foreground">English</Chip>
            <Chip className="text-muted-foreground">Yorùbá</Chip>
            <Chip className="text-muted-foreground">Hausa</Chip>
          </div>
        </GlassCard>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Chapters</h2>
        <GlassCard className="mt-3 divide-y divide-white/5">
          {chapters.map((c) => (
            <div key={c.t} className="flex items-center gap-3 px-4 py-3">
              <span className="font-display text-xs text-accent">{c.t}</span>
              <span className="flex-1 text-sm">{c.title}</span>
              <span className="text-[0.65rem] text-muted-foreground">{c.len}</span>
            </div>
          ))}
        </GlassCard>
      </section>
    </div>
  );
}

export default VideoScreen;
