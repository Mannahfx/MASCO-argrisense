import { Link } from "@/components/Link";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ArrowUp } from "lucide-react";
import { Chip } from "@/components/ui-kit";
import logo from "@/assets/logo.png";

const seed = [
  { id: 1, role: "ai", text: "Hello! I'm your Manna AgriSense AI Agronomist. How can I help you today?" },
  { id: 2, role: "ai", text: "You can ask me about cassava diseases, treatment plans, or farming best practices." },
];

function ChatScreen() {
  const [messages, setMessages] = useState(seed);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const userText = input.toLowerCase();
    setInput("");

    setTimeout(() => {
      let reply = "I'm analyzing your request...";
      if (userText.includes("treat") || userText.includes("cure") || userText.includes("help")) {
        reply = "For cassava diseases, I recommend: 1) Remove and burn infected plants, 2) Apply Manna BioGuard to healthy plants, 3) Use resistant varieties like TME 419. Would you like more details?";
      } else if (userText.includes("yes") || userText.includes("dealer")) {
        reply = "Great! You can find verified Manna stockists near you from the Market tab. They carry all recommended treatment products.";
      } else if (userText.includes("mosaic") || userText.includes("cmd")) {
        reply = "Cassava Mosaic Disease (CMD) is spread by whiteflies. Key steps: rogue infected plants, apply neem-based insecticide to control whiteflies, and plant CMD-resistant varieties.";
      } else if (userText.includes("brown") || userText.includes("cbsd")) {
        reply = "Cassava Brown Streak Disease (CBSD) causes root necrosis. Harvest early (before 12 months), use CBSD-tolerant varieties, and control whitefly vectors.";
      } else {
        reply = "I understand. Let me know if you need specific treatment guidance, disease identification help, or farming best practices.";
      }
      setMessages((prev) => [...prev, { id: Date.now(), role: "ai", text: reply }]);
    }, 1000);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl px-5 py-4">
        <Link to="/" className="glass flex size-10 items-center justify-center rounded-full">
          <ChevronLeft className="size-5" />
        </Link>
        <img src={logo} alt="AI" className="size-8 rounded-full object-contain" />
        <div className="flex-1">
          <p className="text-sm font-semibold">AI Agronomist</p>
          <p className="text-[0.62rem] text-primary">● Online</p>
        </div>
        <Chip className="border-primary/30 text-primary">AI Chat</Chip>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "ai"
                ? "self-start glass rounded-bl-sm"
                : "self-end ml-auto bg-primary text-primary-foreground rounded-br-sm"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="glass-strong flex items-center gap-3 rounded-t-3xl px-5 py-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question..."
          className="flex-1 rounded-full bg-white/5 border border-glass-border px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
        />
        <button
          onClick={handleSend}
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] active:scale-95 transition-transform"
        >
          <ArrowUp className="size-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatScreen;
