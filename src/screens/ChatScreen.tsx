import { useState, useRef, useEffect } from "react";
import { ChevronLeft, CheckCircle2, ArrowUp } from "lucide-react";
import { Chip } from "@/components/ui-kit";
import logo from "@/assets/logo.png";

// Replaced Link
const Link = ({to, children, className, onClick}) => <a href="#" className={className} onClick={(e) => { e.preventDefault(); if(onClick) onClick(e); window.dispatchEvent(new CustomEvent('navigate', {detail: to})) }}>{children}</a>;






type Msg = { id: number; role: "ai" | "user"; text: string };

const seed: Msg[] = [
  {
    id: 1,
    role: "ai",
    text: "I reviewed scan #A-1042 — Cassava Mosaic Disease, high severity on Plot B. Whiteflies are the vector, so we treat the pest and remove infected stems.",
  },
  { id: 2, role: "user", text: "How much Confidor should I use per hectare?" },
  {
    id: 3,
    role: "ai",
    text: "Use Confidor 200 SL at 100 ml per hectare in 200 L of water. Spray early morning or after 5 PM to avoid leaf burn and protect pollinators. Repeat after 10 days if whitefly counts stay above 5 per leaf.",
  },
];

const replies = [
  "Rogue and burn every plant showing mosaic symptoms — do not compost them. Then plant only certified disease-free cuttings such as TME 419 or TMS 30572.",
  "Yes, intercropping with maize on the field border lowers whitefly landing rates. Keep the border at least 2 metres wide.",
  "Based on Plot B's 1.4 ha, budget about ₦14,500 for the full spray programme. I can add the products to your cart.",
];

function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [treated, setTreated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: "ai", text: replies[m.length % replies.length] ?? replies[0]! },
      ]);
    }, 1100);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl px-4 py-3.5">
        <Link to="/diagnosis" className="glass flex size-9 items-center justify-center rounded-full">
          <ChevronLeft className="size-4.5" />
        </Link>
        <img src={logo} alt="" width={512} height={512} className="size-8" />
        <div className="flex-1">
          <p className="text-sm font-semibold">AI Agronomist</p>
          <p className="text-[0.65rem] text-primary">Online · cassava specialist</p>
        </div>
        <button
          onClick={() => setTreated(true)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.68rem] font-semibold transition-all ${
            treated
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
              : "glass text-foreground"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          {treated ? "Treated" : "Mark as Treated"}
        </button>
      </header>

      <div className="flex-1 space-y-3 px-4 py-5">
        <div className="flex justify-center">
          <Chip className="text-muted-foreground">Context: Scan #A-1042 · Plot B</Chip>
        </div>
        {messages.map((m) =>
          m.role === "ai" ? (
            <div key={m.id} className="glass max-w-[85%] rounded-3xl rounded-tl-lg px-4 py-3">
              <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
            </div>
          ) : (
            <div
              key={m.id}
              className="ml-auto max-w-[85%] rounded-3xl rounded-tr-lg bg-primary px-4 py-3 shadow-[var(--shadow-glow)]"
            >
              <p className="text-sm leading-relaxed text-primary-foreground">{m.text}</p>
            </div>
          ),
        )}
        {typing ? (
          <div className="glass flex w-20 items-center justify-center gap-1 rounded-3xl rounded-tl-lg px-4 py-4">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="size-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="glass-strong sticky bottom-24 z-30 mx-4 mb-2 flex items-center gap-2 rounded-full py-2 pl-4 pr-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about dosage, timing, prevention…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] active:scale-95"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}

export default ChatScreen;
