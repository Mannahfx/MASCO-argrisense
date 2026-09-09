import { Link } from "@/components/Link";
import { useState, useContext } from "react";
import { NavContext } from "../AppNew";
import {
  ChevronLeft,
  SprayCan,
  FlaskConical,
  Shield,
  Leaf,
  PlayCircle,
  MapPin,
  X,
  Check,
  ShieldAlert,
  AlertTriangle,
  Info,
  ExternalLink
} from "lucide-react";
import { saveLocalScan, triggerSync } from "../utils/sync";
import { GlassCard, PillButton, Chip } from "@/components/ui-kit";

const diseaseData = {
  cmd: {
    name: "Cassava Mosaic Disease",
    subtitle: "Viral · spread by whiteflies",
    severity: "High",
    icon: ShieldAlert,
    symptoms: [
      "Yellow-green mosaic patterns on leaves",
      "Leaf distortion and puckering",
      "Stunted plant growth",
      "Reduced tuber size and yield"
    ],
    steps: [
      { title: "Rogue infected plants", body: "Uproot and burn every cassava stand showing mosaic mottling." },
      { title: "Control vectors", body: "Deploy yellow sticky traps and apply Confidor 200 SL to control whiteflies." },
      { title: "Support healthy plants", body: "Apply Harvest More Foliar to help asymptomatic plants recover vigour." },
      { title: "Weed control", body: "Maintain a weed-free field to remove alternative hosts." }
    ],
    prevention: "Use certified disease-free, CMD-resistant cuttings for the next season. Continuously control whitefly populations.",
    products: ["Confidor 200 SL", "Harvest More Foliar"]
  },
  cbsd: {
    name: "Cassava Brown Streak Disease",
    subtitle: "Viral · causes root necrosis",
    severity: "Critical",
    icon: AlertTriangle,
    symptoms: [
      "Yellow-green chlorosis on leaves",
      "Brown necrotic streaks on stems",
      "Corky rot inside tubers",
      "Premature leaf drop"
    ],
    steps: [
      { title: "Immediate destruction", body: "Uproot and burn symptomatic plants immediately. Do not sell affected tubers." },
      { title: "Strict sanitation", body: "Disinfect all cutting tools with Virkon S (1% solution) between plants." },
      { title: "Vector control", body: "Apply Confidor 200 SL to control insect vectors." }
    ],
    prevention: "Plant CBSD-tolerant varieties. Enforce strict tool sanitation protocols using Virkon S.",
    products: ["Virkon S", "Confidor 200 SL"]
  },
  cbb: {
    name: "Cassava Bacterial Blight",
    subtitle: "Bacterial · spreads in rain",
    severity: "High",
    icon: ShieldAlert,
    symptoms: [
      "Angular water-soaked leaf spots",
      "Leaf wilting and yellowing",
      "Stem cankers and gum exudate",
      "Shoot tip dieback"
    ],
    steps: [
      { title: "Rogue and burn", body: "Rogue heavily blighted plants and completely burn crop debris." },
      { title: "Dry field operations", body: "Avoid working in the field when leaves are wet to prevent bacterial spread." },
      { title: "Tool sanitation", body: "Disinfect all farming tools with Virkon S." },
      { title: "Boost resilience", body: "Apply Golden Fertilizer NPK (200kg/ha) to strengthen plant cell walls." }
    ],
    prevention: "Use resistant varieties and practice strict tool hygiene. Implement crop rotation with legumes.",
    products: ["Virkon S", "Golden Fertilizer NPK"]
  },
  cgm: {
    name: "Cassava Green Mite",
    subtitle: "Pest · extracts fluid",
    severity: "Moderate",
    icon: Info,
    symptoms: [
      "Green mottling on young leaves",
      "Mild leaf distortion",
      "Reduced plant vigour",
      "Some yield reduction"
    ],
    steps: [
      { title: "Remove affected plants", body: "Remove and destroy stunted or heavily mottled plants." },
      { title: "Select clean stems", body: "Do not use stems from affected plants for propagation." },
      { title: "Boost immunity", body: "Apply Harvest More Foliar spray and Golden Fertilizer NPK to neighboring plants." }
    ],
    prevention: "Use certified clean planting material. Ensure adequate soil nutrition to maintain strong plants.",
    products: ["Harvest More Foliar", "Golden Fertilizer NPK"]
  },
  healthy: {
    name: "Healthy Plant",
    subtitle: "No issues detected",
    severity: "Good",
    icon: Shield,
    symptoms: [
      "Deep green uniform leaf colouration",
      "No spots, streaks, or distortion",
      "Strong upright stem growth",
      "Good canopy coverage"
    ],
    steps: [
      { title: "Maintain practices", body: "Continue current farming practices." },
      { title: "Routine nutrition", body: "Apply Harvest More Foliar spray monthly." },
      { title: "Field maintenance", body: "Maintain a weed-free environment and ensure adequate soil moisture." },
      { title: "Weekly inspection", body: "Inspect fields weekly to catch any early signs of pests or disease." }
    ],
    prevention: "Keep plants healthy by maintaining soil nutrients and proper watering.",
    products: ["Harvest More Foliar", "Golden Fertilizer NPK"]
  }
};

import confidorImg from "../assets/products/confidor.jpg";
import virkonImg from "../assets/products/virkon.jpg";
import harvestMoreImg from "../assets/products/harvest_more.jpg";

const allProducts = [
  { name: "Confidor 200 SL", desc: "Insecticide · 1 L", price: "₦9,800", img: confidorImg },
  { name: "Virkon S", desc: "Disinfectant · 500 g", price: "₦6,400", img: virkonImg },
  { name: "Harvest More Foliar", desc: "Nutrient spray · 1 L", price: "₦4,200", img: harvestMoreImg },
  { name: "Golden Fertilizer NPK", desc: "Soil enhancer · 50 kg", price: "₦22,000", img: "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?w=400&h=400&fit=crop" },
];

function TreatmentScreen({ params = {} }) {
  const { profile, scans, setScans } = useContext(NavContext);
  const [showMap, setShowMap] = useState(false);
  const [activeDealer, setActiveDealer] = useState(null);

  const diseaseId = params.diseaseId || 'cmd';
  const data = diseaseData[diseaseId] || diseaseData['cmd'];
  
  const recommendedProducts = allProducts.filter(p => data.products.includes(p.name));

  const currentScan = scans?.find(s => s.id === params.scanId);
  const completedSteps = currentScan?.completedSteps || [];

  const handleToggleStep = (stepTitle) => {
    if (!currentScan) return;
    
    let newCompleted;
    if (completedSteps.includes(stepTitle)) {
      newCompleted = completedSteps.filter(t => t !== stepTitle);
    } else {
      newCompleted = [...completedSteps, stepTitle];
    }
    
    const updatedScan = { ...currentScan, completedSteps: newCompleted };
    const newScans = saveLocalScan(updatedScan);
    setScans(newScans);
    triggerSync();
  };

  const handleMapRedirect = (dealer) => {
    setActiveDealer(dealer);
    setShowMap(true);
  };

  return (
    <div className="pb-8">
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl px-4 py-4">
        <Link to="/" className="glass flex size-9 items-center justify-center rounded-full">
          <ChevronLeft className="size-4.5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Treatment Plan</h1>
          <p className="text-[0.68rem] text-muted-foreground">{data.name} · {profile?.location || 'Your Farm'}</p>
        </div>
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
        <GlassCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <data.icon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-primary">{data.severity === 'Good' ? 'Healthy Status' : 'Immediate Action'}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {data.subtitle}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Symptoms & Indicators</h2>
        <div className="mt-3 space-y-2">
          {data.symptoms.map((sym, i) => (
            <GlassCard key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="size-1.5 rounded-full bg-accent shrink-0" />
              <p className="text-sm text-foreground/90">{sym}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Step-by-step Action</h2>
        <div className="mt-3 space-y-3">
          {data.steps.map((s, i) => {
            const isDone = completedSteps.includes(s.title);
            return (
              <GlassCard 
                key={s.title} 
                className="flex gap-3 p-4 cursor-pointer transition-all active:scale-[0.98] select-none"
                onClick={() => handleToggleStep(s.title)}
              >
                <div className="relative flex size-7 shrink-0 items-center justify-center">
                  <span className={`absolute inset-0 rounded-full transition-colors ${isDone ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}`}>
                  </span>
                  <span className={`relative z-10 text-xs font-bold transition-opacity ${isDone ? 'opacity-0' : 'opacity-100'}`}>
                    {i + 1}
                  </span>
                  <Check className={`absolute z-10 size-4 transition-opacity ${isDone ? 'opacity-100 text-background' : 'opacity-0'}`} strokeWidth={3} />
                </div>
                <div>
                  <p className={`text-sm font-semibold transition-all ${isDone ? 'text-muted-foreground line-through opacity-60' : ''}`}>
                    {s.title}
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed transition-all ${isDone ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}`}>
                    {s.body}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Prevention</h2>
        <GlassCard className="mt-3 p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.prevention}
          </p>
        </GlassCard>
      </section>

      <section className="px-5 pt-7">
        <h3 className="text-base font-semibold">Recommended Agrochemicals</h3>
        <p className="mb-4 mt-1 text-[0.68rem] text-muted-foreground">
          Purchase directly from verified local suppliers
        </p>

        <div className="space-y-4">
          {recommendedProducts.map((p) => {
            return (
              <GlassCard key={p.name} className="flex gap-4 p-4">
                <img
                  src={p.img}
                  alt={p.name}
                  className="size-20 rounded-2xl object-cover bg-accent/10"
                />
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm leading-tight">{p.name}</h4>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {p.desc}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-display font-semibold text-primary">{p.price}</p>
                    <PillButton 
                      variant="glass" 
                      onClick={() => handleMapRedirect(p.name)}
                      className="px-3 py-1.5 text-[0.65rem]"
                    >
                      Locate
                    </PillButton>
                  </div>
                </div>
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
            <p className="mb-4 text-sm text-muted-foreground">Showing suppliers for {activeDealer}</p>

            <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-4 border border-glass-border">
              <iframe 
                src={`https://maps.google.com/maps?q=${encodeURIComponent(activeDealer + ' agro dealer near me')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all"
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
              {[
                { name: "Saro AgroSciences Hub", dist: "2.4 km away", inStock: true },
                { name: "Jubaili Agrotec Store", dist: "4.1 km away", inStock: true },
                { name: "Local Coop Farm Store", dist: "6.8 km away", inStock: false },
              ].map((dealer, i) => (
                <a 
                  key={i} 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dealer.name + ' near me')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <GlassCard className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <MapPin className="size-4 text-primary" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          {dealer.name} <ExternalLink className="size-3 text-muted-foreground opacity-50" />
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground">{dealer.dist} · Tap for directions</p>
                      </div>
                    </div>
                    <Chip className={dealer.inStock ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}>
                      {dealer.inStock ? "In Stock" : "Out of Stock"}
                    </Chip>
                  </GlassCard>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TreatmentScreen;
