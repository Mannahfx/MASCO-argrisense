import { Link } from "@/components/Link";
import { useState } from "react";
import {
  ChevronLeft,
  ShoppingCart,
  SprayCan,
  FlaskConical,
  Shield,
  Leaf,
  PlayCircle,
  X,
  MapPin
} from "lucide-react";
import { GlassCard, PillButton, Chip } from "@/components/ui-kit";
import mapImg from "@/assets/map.jpg";

const steps = [
  {
    title: "Rogue infected plants",
    body: "Uproot and burn every cassava stand showing mosaic mottling. Do not leave stems in the field.",
  },
  {
    title: "Control the whitefly vector",
    body: "Spray Confidor 200 SL at 100 ml/ha in 200 L water, early morning or after 5 PM.",
  },
  {
    title: "Disinfect tools & hands",
    body: "Soak cutlasses and hoes in Virkon S solution between rows to stop mechanical spread.",
  },
  {
    title: "Replant clean material",
    body: "Use certified disease-free cuttings (TME 419, TMS 30572) in the gaps you created.",
  },
  {
    title: "Re-scan after 10 days",
    body: "Run a follow-up scan on Plot B to confirm the infection curve is falling.",
  },
];

const products = [
  { name: "Confidor 200 SL", sub: "Insecticide · 1 L", price: "₦9,800", icon: SprayCan },
  { name: "Virkon S", sub: "Disinfectant · 500 g", price: "₦6,400", icon: FlaskConical },
  { name: "Neem Guard Bio", sub: "Botanical spray · 1 L", price: "₦4,200", icon: Leaf },
  { name: "TME 419 Cuttings", sub: "Clean stems · bundle", price: "₦12,000", icon: Shield },
];

function TreatmentScreen() {
  const [cart, setCart] = useState([]);
  const [showMap, setShowMap] = useState(false);

  return (
    <div>
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl px-4 py-4">
        <Link to="/diagnosis" className="glass flex size-9 items-center justify-center rounded-full">
          <ChevronLeft className="size-4.5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Treatment Plan</h1>
          <p className="text-[0.68rem] text-muted-foreground">Cassava Mosaic Disease · Plot B</p>
        </div>
        <span className="glass relative flex size-9 items-center justify-center rounded-full">
          <ShoppingCart className="size-4" />
          {cart.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground">
              {cart.length}
            </span>
          ) : null}
        </span>
      </header>

      <section className="px-5 pt-5">
        <Link to="/video">
          <GlassCard className="flex items-center gap-3 p-4">
            <PlayCircle className="size-8 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Watch the AI walkthrough</p>
              <p className="text-[0.68rem] text-muted-foreground">
                4:12 · AI agronomist demonstrates each step
              </p>
            </div>
            <Chip className="border-accent/30 text-accent">New</Chip>
          </GlassCard>
        </Link>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Step-by-step cure</h2>
        <div className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <GlassCard key={s.title} className="flex gap-3 p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="px-5 pt-7">
        <h2 className="text-base font-semibold">Recommended products</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {products.map((p) => {
            const Icon = p.icon;
            const inCart = cart.includes(p.name);
            return (
              <GlassCard key={p.name} className="flex flex-col p-4">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/15">
                  <Icon className="size-5 text-accent" />
                </span>
                <p className="mt-3 text-sm font-semibold leading-tight">{p.name}</p>
                <p className="text-[0.65rem] text-muted-foreground">{p.sub}</p>
                <p className="mt-2 font-display text-base font-semibold text-primary">{p.price}</p>
                <PillButton
                  variant={inCart ? "glass" : "primary"}
                  onClick={() => setCart((c) => (inCart ? c.filter((x) => x !== p.name) : [...c, p.name]))}
                  className="mt-3 w-full px-3 py-2 text-[0.7rem]"
                >
                  {inCart ? "In cart" : "Add to Cart"}
                </PillButton>
                <button 
                  onClick={() => setShowMap(true)}
                  className="mt-3 text-[0.65rem] text-muted-foreground underline-offset-2 hover:underline"
                >
                  Find dealer nearby
                </button>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-strong h-[85vh] w-full rounded-t-[2rem] p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nearby Agro-Dealers</h2>
              <button 
                onClick={() => setShowMap(false)}
                className="flex size-8 items-center justify-center rounded-full bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-4 border border-glass-border">
              <img src={mapImg} alt="Map of nearby dealers" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
              {[
                { name: "Saro AgroSciences Hub", dist: "2.4 km away", inStock: true },
                { name: "Jubaili Agrotec Store", dist: "4.1 km away", inStock: true },
                { name: "Local Coop Farm Store", dist: "6.8 km away", inStock: false },
              ].map((dealer, i) => (
                <GlassCard key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                      <MapPin className="size-4 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{dealer.name}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{dealer.dist}</p>
                    </div>
                  </div>
                  <Chip className={dealer.inStock ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}>
                    {dealer.inStock ? "In Stock" : "Out of Stock"}
                  </Chip>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TreatmentScreen;
