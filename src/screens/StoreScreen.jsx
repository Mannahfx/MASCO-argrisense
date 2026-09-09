import { useState } from "react";
import {
  Search,
  MapPin,
  X,
  ExternalLink,
  ShoppingBag,
  Star,
  Package,
} from "lucide-react";
import { GlassCard, PillButton, Chip } from "@/components/ui-kit";

// Import local product images
import confidorImg from "../assets/products/confidor.jpg";
import virkonImg from "../assets/products/virkon.jpg";
import harvestMoreImg from "../assets/products/harvest_more.jpg";

const categories = ["All", "Insecticides", "Fertilizers", "Disinfectants", "Seeds", "Tools"];

const products = [
  {
    id: 1,
    name: "Confidor 200 SL",
    category: "Insecticides",
    desc: "Systemic insecticide for whitefly & pest control on cassava crops",
    price: "₦9,800",
    unit: "1 Litre",
    rating: 4.7,
    reviews: 128,
    inStock: true,
    img: confidorImg,
    suppliers: [
      { name: "Saro AgroSciences Hub", dist: "2.4 km", inStock: true },
      { name: "Jubaili Agrotec Store", dist: "4.1 km", inStock: true },
      { name: "Local Coop Farm Store", dist: "6.8 km", inStock: false },
    ],
  },
  {
    id: 2,
    name: "Virkon S",
    category: "Disinfectants",
    desc: "Broad-spectrum disinfectant for tool sanitation and disease prevention",
    price: "₦6,400",
    unit: "500 g",
    rating: 4.5,
    reviews: 89,
    inStock: true,
    img: virkonImg,
    suppliers: [
      { name: "Saro AgroSciences Hub", dist: "2.4 km", inStock: true },
      { name: "Harvest Field Supplies", dist: "5.2 km", inStock: true },
    ],
  },
  {
    id: 3,
    name: "Harvest More Foliar",
    category: "Fertilizers",
    desc: "Micro-nutrient foliar spray to boost cassava plant immunity and vigour",
    price: "₦4,200",
    unit: "1 Litre",
    rating: 4.8,
    reviews: 215,
    inStock: true,
    img: harvestMoreImg,
    suppliers: [
      { name: "Jubaili Agrotec Store", dist: "4.1 km", inStock: true },
      { name: "Local Coop Farm Store", dist: "6.8 km", inStock: true },
      { name: "Green Valley Agro", dist: "9.3 km", inStock: true },
    ],
  },
  {
    id: 4,
    name: "Golden Fertilizer NPK",
    category: "Fertilizers",
    desc: "Complete NPK soil enhancer for strong root and tuber development",
    price: "₦22,000",
    unit: "50 kg bag",
    rating: 4.6,
    reviews: 342,
    inStock: true,
    img: "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?w=400&h=400&fit=crop", // sack of fertilizer
    suppliers: [
      { name: "Saro AgroSciences Hub", dist: "2.4 km", inStock: true },
      { name: "Jubaili Agrotec Store", dist: "4.1 km", inStock: false },
      { name: "Green Valley Agro", dist: "9.3 km", inStock: true },
    ],
  },
  {
    id: 5,
    name: "TME 419 Cassava Cuttings",
    category: "Seeds",
    desc: "CMD-resistant certified planting material — high yield variety",
    price: "₦3,500",
    unit: "Bundle of 50",
    rating: 4.9,
    reviews: 567,
    inStock: true,
    img: "https://images.unsplash.com/photo-1596328227092-28c06f1eb3d1?w=400&h=400&fit=crop", // cassava stem/roots
    suppliers: [
      { name: "IITA Certified Outlet", dist: "3.6 km", inStock: true },
      { name: "Local Coop Farm Store", dist: "6.8 km", inStock: true },
    ],
  },
  {
    id: 6,
    name: "Knapsack Sprayer 16L",
    category: "Tools",
    desc: "Manual pressure sprayer for pesticide and foliar application",
    price: "₦15,500",
    unit: "1 Unit",
    rating: 4.4,
    reviews: 76,
    inStock: true,
    img: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400&h=400&fit=crop", // agricultural tool/equipment
    suppliers: [
      { name: "Jubaili Agrotec Store", dist: "4.1 km", inStock: true },
      { name: "Green Valley Agro", dist: "9.3 km", inStock: true },
    ],
  },
];

function StoreScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showMap, setShowMap] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filtered = products.filter((p) => {
    const matchCategory = activeCategory === "All" || p.category === activeCategory;
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleLocate = (product) => {
    setSelectedProduct(product);
    setShowMap(true);
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-30 rounded-b-3xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Agro Store</h1>
            <p className="text-[0.68rem] text-muted-foreground">
              Verified products from local suppliers
            </p>
          </div>
          <Chip className="border-primary/30 text-primary">
            <Package className="size-3 mr-1" />
            {products.length} Items
          </Chip>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2">
          <label className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        {/* Category Pills */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Product Grid */}
      <section className="px-5 pt-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No products found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <GlassCard key={p.id} className="flex gap-4 p-4">
                <img
                  src={p.img}
                  alt={p.name}
                  className="size-24 rounded-2xl object-cover bg-accent/10 shrink-0"
                />
                <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight">{p.name}</h4>
                      <Chip className="shrink-0 border-primary/20 text-primary text-[0.6rem]">
                        {p.category}
                      </Chip>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {p.desc}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <Star className="size-3 text-amber-400 fill-amber-400" />
                        <span className="text-[0.65rem] font-medium">{p.rating}</span>
                      </div>
                      <span className="text-[0.6rem] text-muted-foreground">({p.reviews} reviews)</span>
                      <span className="text-[0.6rem] text-muted-foreground">· {p.unit}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-display font-semibold text-primary">{p.price}</p>
                    <PillButton
                      variant="glass"
                      onClick={() => handleLocate(p)}
                      className="px-3 py-1.5 text-[0.65rem]"
                    >
                      <MapPin className="size-3 mr-1" />
                      Find Nearby
                    </PillButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Map Modal */}
      {showMap && selectedProduct && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-strong h-[85vh] w-full rounded-t-[2rem] p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold">Nearby Suppliers</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing stores that stock <span className="text-primary font-medium">{selectedProduct.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowMap(false)}
                className="flex size-8 items-center justify-center rounded-full bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Embedded Map */}
            <div className="relative h-48 w-full rounded-2xl overflow-hidden my-4 border border-glass-border shrink-0">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  selectedProduct.name + " agro dealer near me"
                )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full"
              ></iframe>
            </div>

            {/* Supplier List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
              {selectedProduct.suppliers.map((supplier, i) => (
                <a
                  key={i}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    supplier.name + " near me"
                  )}`}
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
                          {supplier.name}{" "}
                          <ExternalLink className="size-3 text-muted-foreground opacity-50" />
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground">
                          {supplier.dist} away · Tap for directions
                        </p>
                      </div>
                    </div>
                    <Chip
                      className={
                        supplier.inStock
                          ? "border-primary/30 text-primary"
                          : "border-destructive/30 text-destructive"
                      }
                    >
                      {supplier.inStock ? "In Stock" : "Out"}
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

export default StoreScreen;
