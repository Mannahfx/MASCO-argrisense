
import { useState } from "react";
import { TrendingUp, Radio } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis, XAxis } from "recharts";
import { GlassCard, Chip, PillButton } from "@/components/ui-kit";



const series = [
  { d: "Mon", p: 226 },
  { d: "Tue", p: 231 },
  { d: "Wed", p: 228 },
  { d: "Thu", p: 238 },
  { d: "Fri", p: 241 },
  { d: "Sat", p: 236 },
  { d: "Sun", p: 248 },
];

const depots = [
  { name: "Ibadan depot", price: "₦248,000", change: "+6.2%", up: true },
  { name: "Abeokuta market", price: "₦241,500", change: "+3.1%", up: true },
  { name: "Ilorin hub", price: "₦233,000", change: "-1.4%", up: false },
];

function MarketScreen() {
  const [yieldTonnes, setYieldTonnes] = useState(12);
  const [inputCost, setInputCost] = useState(180000);
  const pricePerTonne = 248000;
  const revenue = yieldTonnes * pricePerTonne;
  const profit = revenue - inputCost;
  const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

  return (
    <div>
      <header className="glass-strong sticky top-0 z-30 flex items-center justify-between rounded-b-3xl px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold">Market Intelligence</h1>
          <p className="text-[0.68rem] text-muted-foreground">Cassava tubers · South-West Nigeria</p>
        </div>
        <Chip className="border-primary/30 text-primary">
          <Radio className="size-3" /> Live
        </Chip>
      </header>

      <section className="px-5 pt-5">
        <GlassCard className="p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[0.68rem] text-muted-foreground">Average price / tonne</p>
              <p className="font-display text-3xl font-semibold">₦248,000</p>
            </div>
            <Chip className="border-primary/30 text-primary">
              <TrendingUp className="size-3" /> +6.2% this week
            </Chip>
          </div>

          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="d"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis hide domain={["dataMin - 8", "dataMax + 8"]} />
                <Tooltip
                  cursor={{ stroke: "var(--glass-border)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 14,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  formatter={(v: number) => [`₦${v},000`, "Price/tonne"]}
                />
                <Area
                  type="monotone"
                  dataKey="p"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#priceFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--primary)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex gap-2">
            {["1W", "1M", "6M", "1Y"].map((r, i) => (
              <span
                key={r}
                className={`rounded-full px-3 py-1 text-[0.65rem] font-medium ${
                  i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"
                }`}
              >
                {r}
              </span>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Nearby depots</h2>
        <GlassCard className="mt-3 divide-y divide-white/5">
          {depots.map((d) => (
            <div key={d.name} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{d.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold">{d.price}</span>
                <span
                  className={`text-[0.65rem] ${d.up ? "text-primary" : "text-destructive"}`}
                >
                  {d.change}
                </span>
              </span>
            </div>
          ))}
        </GlassCard>
      </section>

      <section className="px-5 pt-6">
        <h2 className="text-base font-semibold">Profit Calculator</h2>
        <GlassCard className="mt-3 space-y-4 p-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="yield" className="text-muted-foreground">
                Expected yield
              </label>
              <span className="font-semibold">{yieldTonnes} tonnes</span>
            </div>
            <input
              id="yield"
              type="range"
              min={1}
              max={40}
              value={yieldTonnes}
              onChange={(e) => setYieldTonnes(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="cost" className="text-muted-foreground">
                Manna product & input cost
              </label>
              <span className="font-semibold">{naira(inputCost)}</span>
            </div>
            <input
              id="cost"
              type="range"
              min={0}
              max={800000}
              step={10000}
              value={inputCost}
              onChange={(e) => setInputCost(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Gross revenue</span>
              <span>{naira(revenue)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Less inputs</span>
              <span>-{naira(inputCost)}</span>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-muted-foreground">Estimated profit</span>
              <span className="font-display text-2xl font-semibold text-primary">
                {naira(profit)}
              </span>
            </div>
          </div>

          <PillButton className="w-full">Lock in a buyer at ₦248,000</PillButton>
        </GlassCard>
      </section>
    </div>
  );
}

export default MarketScreen;
