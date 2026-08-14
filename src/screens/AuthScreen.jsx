import { Link } from "@/components/Link";
import { useState } from "react";
import { Mail, Lock, Sprout, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { GlassCard, PillButton } from "@/components/ui-kit";
import logo from "@/assets/logo.png";



function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState("farmer");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const to = role === "admin" && mode === "signup" ? "/admin" : "/";
    window.dispatchEvent(new CustomEvent('navigate', {detail: to}));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="relative mb-7 flex flex-col items-center">
        <div className="absolute size-32 rounded-full bg-primary/25 blur-3xl" />
        <img
          src={logo}
          alt="Manna AgriSense logo"
          width={512}
          height={512}
          className="relative size-20 drop-shadow-[0_0_28px_var(--primary)]"
        />
        <h1 className="relative mt-4 font-display text-2xl font-semibold">Manna AgriSense</h1>
        <p className="relative mt-1 text-xs text-muted-foreground">
          AI diagnosis & market intelligence for cassava
        </p>
      </div>

      <GlassCard className="w-full p-5">
        <div className="glass flex rounded-full p-1">
          {(["signin", "signup"]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all ${
                mode === m
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {mode === "signup" ? (
          <div className="mt-5">
            <p className="text-[0.68rem] font-medium text-muted-foreground">Select your role</p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {(
                [
                  { key: "farmer", label: "I am a Farmer", sub: "Client", icon: Sprout },
                  { key: "admin", label: "I am a Manna", sub: "Admin", icon: ShieldCheck },
                ]
              ).map((r) => {
                const Icon = r.icon;
                const active = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={`rounded-2xl px-3 py-3 text-left transition-all ${
                      active
                        ? "border border-primary/50 bg-primary/15 shadow-[0_0_28px_-10px_var(--primary)]"
                        : "glass"
                    }`}
                  >
                    <Icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-2 text-xs font-semibold leading-tight">{r.label}</p>
                    <p className="text-[0.62rem] text-muted-foreground">{r.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <Mail className="size-4 text-muted-foreground" />
            <input
              type="email"
              required
              maxLength={255}
              placeholder="Email address"
              autoComplete="email"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <Lock className="size-4 text-muted-foreground" />
            <input
              type={showPass ? "text" : "password"}
              required
              minLength={6}
              maxLength={72}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label={showPass ? "Hide password" : "Show password"}
              onClick={() => setShowPass((v) => !v)}
              className="text-muted-foreground"
            >
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </label>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-all ${
                  remember ? "bg-primary shadow-[var(--shadow-glow)]" : "bg-white/10"
                }`}
              >
                <span
                  className={`size-4 rounded-full bg-background transition-transform ${
                    remember ? "translate-x-4" : ""
                  }`}
                />
              </span>
              Remember me
            </button>
            <span className="text-xs text-accent">Forgot password?</span>
          </div>

          <PillButton className="mt-2 w-full" type="submit">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </PillButton>
        </form>
      </GlassCard>

      <p className="mt-5 text-center text-[0.68rem] text-muted-foreground">
        Admins can jump straight to the{" "}
        <Link to="/admin" className="text-accent">
          control center
        </Link>
      </p>
    </div>
  );
}

export default AuthScreen;
