import { Link } from "@/components/Link";
import { useState, useContext, useEffect } from "react";
import { NavContext } from "../AppNew";
import { saveLocalProfile, triggerSync } from "../utils/sync";
import { Bell, CloudDownload, Moon, LifeBuoy, LogOut, MapPin, Ruler, Leaf, Check } from "lucide-react";
import { GlassCard, Chip, PillButton } from "@/components/ui-kit";
import logo from "@/assets/logo.png";


function Toggle({
  label,
  icon: Icon,
  on,
  onChange,
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
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

function ProfileScreen({ profile, onLogout }) {
  const { isDark, toggleTheme } = useContext(NavContext);
  
  // Local state for editable fields
  const [formData, setFormData] = useState({
    location: profile?.location || "",
    farm_size: profile?.farm_size || "",
    crops: profile?.crops || "",
    avatar: profile?.avatar || ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync state if profile prop updates
  useEffect(() => {
    if (profile) {
      setFormData({
        location: profile.location || "",
        farm_size: profile.farm_size || "",
        crops: profile.crops || "",
        avatar: profile.avatar || ""
      });
    }
  }, [profile]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange("avatar", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsSaving(true);
    const updated = { ...profile, ...formData };
    saveLocalProfile(updated);
    triggerSync();
    
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  const fields = [
    { key: "location", label: "Farm Location", icon: MapPin, placeholder: "e.g. Ikorodu, Lagos State" },
    { key: "farm_size", label: "Farm Size", icon: Ruler, placeholder: "e.g. 15 Hectares" },
    { key: "crops", label: "Crop Type", icon: Leaf, placeholder: "e.g. Cassava (TME 419)" },
  ];

  return (
    <div className="pb-6">
      <header className="glass-strong sticky top-0 z-30 flex items-center justify-between rounded-b-3xl px-5 py-4">
        <h1 className="text-lg font-semibold">Profile</h1>
        <Chip className="border-primary/30 text-primary">Farmer</Chip>
      </header>

      <section className="flex flex-col items-center px-5 pt-7">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
          <label className="relative block cursor-pointer">
            <img
              src={formData.avatar || logo}
              alt={`${profile?.full_name || 'Farmer'} profile avatar`}
              width={512}
              height={512}
              className="glass relative size-24 rounded-full object-cover p-1"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <span className="text-xs font-semibold text-white">Edit</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">{profile?.full_name || 'AgriSense Farmer'}</h2>
        <Chip className="mt-2 border-primary/30 text-primary">{formData.farm_size || 'N/A'} · {formData.crops || 'N/A'}</Chip>
      </section>

      <section className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Farm details</h3>
          {(formData.location !== (profile?.location || "") ||
            formData.farm_size !== (profile?.farm_size || "") ||
            formData.crops !== (profile?.crops || "")) && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs font-semibold text-primary"
            >
              {isSaving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2.5">
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <label key={f.key} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block text-[0.62rem] text-muted-foreground">{f.label}</span>
                  <input
                    value={formData[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
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
          <Toggle label="Push Notifications" icon={Bell} on={true} onChange={() => {}} />
          <Toggle label="Offline Mode Sync" icon={CloudDownload} on={true} onChange={() => {}} />
          <Toggle label="Dark Theme" icon={Moon} on={isDark} onChange={toggleTheme} />
        </div>
      </section>

      <section className="space-y-3 px-5 pt-7">
        <PillButton variant="glass" className="w-full">
          <LifeBuoy className="size-4" /> Contact Manna Support
        </PillButton>
        <button onClick={onLogout} className="block w-full">
          <div className="w-full rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground shadow-[0_10px_40px_-8px_var(--destructive)] transition-all active:scale-[0.97]">
            <span className="inline-flex items-center justify-center w-full gap-2">
              <LogOut className="size-4" /> Sign Out
            </span>
          </div>
        </button>
      </section>
    </div>
  );
}

export default ProfileScreen;
