"use client";
import { useState, useEffect, useMemo } from "react";

export default function BaristaPortal() {
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loginInput, setLoginInput] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"CATALOG" | "BRM_GUIDE">("CATALOG");

  useEffect(() => {
    const savedEmail = localStorage.getItem("noon_user_email");
    if (savedEmail) {
      setUserEmail(savedEmail.toLowerCase());
    }

    fetch("/api/stores").then((res) => res.json()).then(data => {
      if (Array.isArray(data)) setStores(data);
    });
    fetch("/api/items").then((res) => res.json()).then(data => {
      if (Array.isArray(data)) setItems(data);
    });
    fetch("/api/admins").then((res) => res.json()).then(data => {
      if (Array.isArray(data)) setAdmins(data.map((a: any) => a.email.toLowerCase()));
    });
  }, []);

  useEffect(() => {
    if (!userEmail || stores.length === 0) return;

    const normalizedEmail = userEmail.trim().toLowerCase();
    const isUserAdmin = admins.includes(normalizedEmail) || normalizedEmail === "kangarg@noon.com";
    const matched = stores.find(s => s.email && s.email.trim().toLowerCase() === normalizedEmail);

    if (matched) {
      setSelectedStore(matched);
      setIsAdminMode(isUserAdmin);
    } else if (isUserAdmin) {
      setIsAdminMode(true);
      if (!selectedStore && stores.length > 0) {
        setSelectedStore(stores[0]);
      }
    }
  }, [userEmail, stores, admins]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const email = loginInput.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      setLoginError("Access restricted. Please use your official @noon.com email address.");
      return;
    }

    const matched = stores.find(s => s.email && s.email.trim().toLowerCase() === email);
    const isUserAdmin = admins.includes(email) || email === "kangarg@noon.com";

    if (matched) {
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setSelectedStore(matched);
      setIsAdminMode(isUserAdmin);
    } else if (isUserAdmin) {
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setIsAdminMode(true);
      if (stores.length > 0) setSelectedStore(stores[0]);
    } else {
      setLoginError("This email is not assigned to any cafe store. Please contact your manager or admin.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("noon_user_email");
    setUserEmail("");
    setSelectedStore(null);
    setCart({});
    setIsAdminMode(false);
  };

  const updateCart = (zsku: string, qty: number, max: number | null) => {
    const finalQty = Math.max(0, isNaN(qty) ? 0 : qty); // Minimum order limit is 0
    if (max !== null && max !== undefined && max > 0 && finalQty > max) {
      alert(`Maximum order limit for this item is ${max}`);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [zsku]: finalQty,
    }));
  };

  const submitOrder = async () => {
    if (!selectedStore) return;
    setIsSubmitting(true);

    const orderPayloadItems = [];
    for (const [zsku, qty] of Object.entries(cart)) {
      if (qty > 0) {
        const item = items.find(i => i.item_zsku === zsku);
        if (item && !item.in_stock && item.substitute_zsku) {
          orderPayloadItems.push({ item_zsku: item.substitute_zsku, zsku_qty: qty });
        } else {
          orderPayloadItems.push({ item_zsku: zsku, zsku_qty: qty });
        }
      }
    }

    if (orderPayloadItems.length === 0) {
      alert("Cart is empty");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ds_code: selectedStore.ds_code,
          items: orderPayloadItems,
        }),
      });

      if (res.ok) {
        alert("🎉 Store replenishment order submitted successfully!");
        setCart({});
        setIsOrderSummaryOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit order");
      }
    } catch (e) {
      alert("Error submitting order");
    }
    setIsSubmitting(false);
  };

  const isNativeStore = selectedStore?.store_type === "NATIVE";

  // Filter items based on store brand (SHOT vs NATIVE vs GENERAL)
  const brandFilteredItems = useMemo(() => {
    return items.filter(item => {
      if (!selectedStore) return false;
      if (item.item_type === "GENERAL") return true;
      if (isNativeStore && item.item_type === "NATIVE_ONLY") return true;
      if (!isNativeStore && item.item_type === "SHOT_ONLY") return true;
      return false;
    });
  }, [items, selectedStore, isNativeStore]);

  // Search filtering
  const searchedItems = useMemo(() => {
    if (!searchQuery) return brandFilteredItems;
    const q = searchQuery.toLowerCase();
    return brandFilteredItems.filter(item =>
      item.product_title?.toLowerCase().includes(q) ||
      item.item_zsku?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q)
    );
  }, [brandFilteredItems, searchQuery]);

  // ----------------------------------------------------------------------
  // CLASSIFICATION LOGIC FOR EXACT SECTIONS
  // ----------------------------------------------------------------------
  const categorizedSections = useMemo(() => {
    const isMilk = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      return t.includes("milk") || t.includes("oat") || t.includes("almond") || t.includes("coconut cream");
    };

    const isCoffeeBean = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const cat = (i.category || "").toUpperCase();
      return (
        cat === "COFFEE_BEANS" ||
        t.includes("blend") ||
        t.includes("roast") ||
        t.includes("coffee") ||
        t.includes("decaf")
      ) && !t.includes("cleaning") && !t.includes("cup");
    };

    const isDecaf = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      return t.includes("decaf");
    };

    const isUnbrandedPkg = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();
      return t.includes("unbranded") || b.startsWith("UBNAT");
    };

    const isNativeBrandedPkg = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();
      if (isUnbrandedPkg(i)) return false;
      return (
        i.item_type === "NATIVE_ONLY" ||
        i.brand === "native" ||
        b.startsWith("NAT") ||
        t.includes("cup") ||
        t.includes("lid") ||
        t.includes("straw") ||
        t.includes("foil") ||
        t.includes("napkin") ||
        t.includes("stirrers") ||
        t.includes("branded")
      );
    };

    if (isNativeStore) {
      // NATIVE SECTIONS:
      // 1. Coffee Beans (SUBKO specialty coffee) + Decaf subsection
      // 2. Ingredients & Essentials (all other ingredients + ISI chargers)
      // 3. NATIVE branded packaging
      // 4. Unbranded packaging for native
      const subkoBeans = searchedItems.filter(i => isCoffeeBean(i) && !isDecaf(i));
      const decafBeans = searchedItems.filter(i => isCoffeeBean(i) && isDecaf(i));
      const nativeBranded = searchedItems.filter(i => isNativeBrandedPkg(i));
      const unbrandedPkg = searchedItems.filter(i => isUnbrandedPkg(i));

      // Everything else is Ingredients & Essentials (including ISI chargers, milks, syrups, sauces, powders, cleaning)
      const usedZskus = new Set([
        ...subkoBeans.map(i => i.item_zsku),
        ...decafBeans.map(i => i.item_zsku),
        ...nativeBranded.map(i => i.item_zsku),
        ...unbrandedPkg.map(i => i.item_zsku),
      ]);
      const ingredients = searchedItems.filter(i => !usedZskus.has(i.item_zsku));

      return [
        {
          id: "NATIVE_COFFEE",
          title: "☕ Coffee Beans (SUBKO Specialty Coffee)",
          badge: "SUBKO Collab",
          description: "Exclusive single-origin roasts crafted in collaboration with Subko.",
          items: subkoBeans,
          subsections: [
            {
              id: "NATIVE_DECAF",
              title: "🌿 Decaf Beans (Specialty Decaf)",
              description: "Decaffeinated single-origin beans maintaining full sensory profiles.",
              items: decafBeans,
            }
          ]
        },
        {
          id: "NATIVE_INGREDIENTS",
          title: "🥛 Ingredients & Essentials (inc. ISI Chargers)",
          badge: "Syrups, Milks & Charges",
          description: "All syrups, sauces, frappe mixes, barista milks, powders, cleaning items, and ISI cream chargers.",
          items: ingredients,
          subsections: []
        },
        {
          id: "NATIVE_BRANDED_PACKAGING",
          title: "📦 NATIVE Branded Packaging",
          badge: "Official Native",
          description: "Native branded double-wall cups, lids, u-cups, straws, foils, bags, and branded sugars.",
          items: nativeBranded,
          subsections: []
        },
        {
          id: "NATIVE_UNBRANDED_PACKAGING",
          title: "📦 Unbranded Packaging for NATIVE (Backup)",
          badge: "Backup Stock",
          description: "Unbranded backup packaging to be ordered whenever NATIVE packaging is temporarily unavailable.",
          items: unbrandedPkg,
          subsections: []
        }
      ];
    } else {
      // SHOT SECTIONS:
      // 1. Coffee Beans (All three)
      // 2. Barista Milks
      // 3. All Ingredients & Essentials (ISI charges will also come under same)
      const beans = searchedItems.filter(i => isCoffeeBean(i));
      const milks = searchedItems.filter(i => isMilkItem(i) && !isCoffeeBean(i));
      
      const usedZskus = new Set([
        ...beans.map(i => i.item_zsku),
        ...milks.map(i => i.item_zsku),
      ]);
      const ingredients = searchedItems.filter(i => !usedZskus.has(i.item_zsku));

      return [
        {
          id: "SHOT_COFFEE",
          title: "☕ Coffee Beans (All Three)",
          badge: "3 Signature Roasts",
          description: "Noon Minutes Blend (Shot signature), Ethiopian Medium Roast, and Decaf Colombia.",
          items: beans,
          subsections: []
        },
        {
          id: "SHOT_MILKS",
          title: "🥛 Barista Milks",
          badge: "Dairy & Plant Milks",
          description: "Barista grade Oat milk, Coconut milk, and Almond milk formulations for silky microfoam.",
          items: milks,
          subsections: []
        },
        {
          id: "SHOT_INGREDIENTS",
          title: "🍯 All Ingredients & Essentials (inc. ISI Chargers)",
          badge: "Syrups & Chargers",
          description: "All syrups, sauces, frappe powders, karak chai, matcha, cleaning supplies & ISI cream chargers.",
          items: ingredients,
          subsections: []
        }
      ];
    }
  }, [isNativeStore, searchedItems]);

  const totalItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalUniqueItems = Object.values(cart).filter(q => q > 0).length;

  // Background cafe vector wallpaper (subtle cups, portafilters, beans, steam)
  const cafeWallpaperStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%238B5E3C' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' opacity='0.07'%3E%3C!-- Coffee Cup with Sleeve --%3E%3Cpath d='M25,25 L45,25 L41,60 L29,60 Z'/%3E%3Cpath d='M23,25 L47,25'/%3E%3Cpath d='M27,37 L43,37 L42,48 L28,48 Z'/%3E%3C!-- Steam --%3E%3Cpath d='M31,18 Q33,14 31,10'/%3E%3Cpath d='M39,18 Q41,14 39,10'/%3E%3C!-- Coffee Beans --%3E%3Cpath d='M120,35 C120,30 132,30 132,35 C132,40 120,40 120,35 Z'/%3E%3Cpath d='M123,32 Q126,35 129,38'/%3E%3Cpath d='M138,42 C138,37 150,37 150,42 C150,47 138,47 138,42 Z'/%3E%3Cpath d='M141,39 Q144,42 147,45'/%3E%3C!-- Portafilter Handle --%3E%3Ccircle cx='40' cy='135' r='12'/%3E%3Cpath d='M52,135 L80,135' stroke-width='2.2'/%3E%3Cpath d='M35,130 L45,130 L43,142 L37,142 Z'/%3E%3C!-- Ceramic Mug with Latte Art --%3E%3Crect x='115' cy='115' width='28' height='24' rx='3'/%3E%3Cpath d='M143,120 C149,120 149,132 143,132'/%3E%3Cpath d='M110,140 L148,140'/%3E%3Cpath d='M124,124 Q129,128 134,124 Q129,132 124,124 Z' fill='%238B5E3C' opacity='0.07'/%3E%3C!-- French Press / Dripper --%3E%3Crect x='75' y='45' width='20' height='30' rx='2'/%3E%3Cpath d='M85,38 L85,45' stroke-width='1.5'/%3E%3Ccircle cx='85' cy='36' r='2'/%3E%3Cpath d='M95,50 C101,50 101,65 95,65'/%3E%3C!-- Sparkles / Stars --%3E%3Cpath d='M85,100 L87,105 L92,107 L87,109 L85,114 L83,109 L78,107 L83,105 Z' fill='%238B5E3C' opacity='0.07'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundColor: isNativeStore ? "#F5F8FC" : "#FAF7F2",
  };

  // Reusable card component WITHOUT any images or placeholder glass icons
  const renderItemCard = (item: any) => {
    const currentQty = cart[item.item_zsku] || 0;
    return (
      <div
        key={item.item_zsku}
        className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-stone-200 transition-all flex flex-col justify-between space-y-3"
      >
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.brand && (
              <span className="bg-stone-100 text-stone-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-stone-200">
                {item.brand.replace(/_/g, " ")}
              </span>
            )}
            {item.unit_size && item.unit_type && (
              <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                {item.unit_size} {item.unit_type}
              </span>
            )}
            {item.max_qty && (
              <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200">
                Max: {item.max_qty}
              </span>
            )}
          </div>

          {!item.in_stock ? (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">
              OOS
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              In Stock
            </span>
          )}
        </div>

        {/* Product Title & Identifiers */}
        <div className="space-y-1">
          <h4 className="font-extrabold text-stone-900 text-base leading-snug">
            {item.product_title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono text-stone-500">
            <span>SKU: {item.item_zsku}</span>
            {item.barcode && <span>• Barcode: {item.barcode}</span>}
          </div>
        </div>

        {/* Substitute Notice */}
        {!item.in_stock && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium p-2 rounded-xl">
            {item.substitute_zsku ? (
              <>⚠️ OOS: Replaced with SKU <span className="font-mono font-bold">{item.substitute_zsku}</span></>
            ) : (
              <>⚠️ Currently Out of Stock</>
            )}
          </div>
        )}

        {/* Bottom Stepper (Min 0) */}
        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500">
            Order Qty:
          </span>

          {currentQty === 0 ? (
            <button
              type="button"
              onClick={() => updateCart(item.item_zsku, 1, item.max_qty)}
              className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition ${
                isNativeStore
                  ? "bg-[#1864AB] text-white hover:bg-[#13508A]"
                  : "bg-[#6B0B20] text-white hover:bg-[#520818]"
              }`}
            >
              + ADD
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-full border border-stone-200">
              <button
                type="button"
                onClick={() => updateCart(item.item_zsku, currentQty - 1, item.max_qty)}
                className="w-7 h-7 rounded-full bg-white text-stone-800 font-black text-sm flex items-center justify-center shadow-sm hover:bg-stone-50 active:scale-95 transition"
              >
                –
              </button>
              
              <input
                type="number"
                min="0"
                max={item.max_qty || undefined}
                value={currentQty}
                onChange={(e) => updateCart(item.item_zsku, parseInt(e.target.value) || 0, item.max_qty)}
                className="w-12 text-center font-black text-sm bg-transparent outline-none"
              />

              <button
                type="button"
                onClick={() => updateCart(item.item_zsku, currentQty + 1, item.max_qty)}
                className={`w-7 h-7 rounded-full text-white font-black text-sm flex items-center justify-center shadow-sm active:scale-95 transition ${
                  isNativeStore ? "bg-[#1864AB]" : "bg-[#6B0B20]"
                }`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------
  if (!userEmail) {
    return (
      <div 
        className="min-h-screen flex flex-col justify-between py-12 px-4"
        style={cafeWallpaperStyle}
      >
        <div className="max-w-md mx-auto w-full text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-stone-200 shadow-sm">
            <span className="font-black text-xs tracking-tight text-stone-900">noon CAFE OPS</span>
            <span className="text-stone-300">•</span>
            <span className="bg-[#1864AB] text-white text-[10px] font-black px-2 py-0.5 rounded-full">NATIVE × SUBKO</span>
            <span className="bg-[#6B0B20] text-white text-[10px] font-black px-2 py-0.5 rounded-full">SHOT</span>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-stone-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center border border-amber-200 shadow-inner">
              <span className="text-3xl">☕</span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Barista Ordering Portal
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Official stock replenishment & recipe compliance system for SHOT & NATIVE stores.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Cafe Store Email ID
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="cafe-Downtown@noon.com"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-300 text-sm font-medium bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-[#1864AB] focus:border-[#1864AB] focus:outline-none transition"
                />
                <span className="absolute left-3.5 top-3.5 text-stone-400 text-sm">
                  ✉️
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Enter your designated store email (e.g. cafe-Downtown@noon.com) or admin account.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <span>⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg hover:shadow-xl transition duration-150 flex items-center justify-center space-x-2"
            >
              <span>Sign In to Store Portal</span>
              <span>→</span>
            </button>
          </form>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center space-x-1">
              <span>🔒</span>
              <span>Store Replenishment System</span>
            </span>
            <a 
              href="/admin" 
              className="font-bold text-stone-800 hover:text-[#1864AB] transition"
            >
              Admin Dashboard ⚙️
            </a>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full text-center text-xs text-stone-400">
          noon Specialty Coffee Operations • Dubai & UAE Cafes
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN BARISTA STORE PORTAL
  // -------------------------------------------------------------
  return (
    <div 
      className="min-h-screen pb-32 transition-colors duration-300"
      style={cafeWallpaperStyle}
    >
      {/* 1. TOP BRANDED BARISTA OPS HEADER */}
      <header className={`sticky top-0 z-30 transition-colors shadow-md ${
        isNativeStore ? "bg-[#1864AB] text-white" : "bg-[#6B0B20] text-white"
      }`}>
        <div className="max-w-3xl mx-auto px-4 pt-3.5 pb-3.5 space-y-3">
          
          {/* Header Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isNativeStore ? (
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  <span className="text-amber-200 text-xs font-black tracking-widest uppercase">
                    SUBKO COLLAB
                  </span>
                  <span className="text-white font-black text-sm tracking-wide">
                    NATIVE CAFE
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  <span className="text-[#FFF000] text-xs font-black tracking-widest uppercase">
                    SHOT
                  </span>
                  <span className="text-white font-black text-sm tracking-wide">
                    CAFE OPERATIONS
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions (Admin & Logout) */}
            <div className="flex items-center space-x-2">
              {isAdminMode && (
                <a
                  href="/admin"
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-2.5 py-1.5 rounded-xl transition shadow flex items-center space-x-1"
                >
                  <span>⚙️</span>
                  <span>Admin</span>
                </a>
              )}
              <button
                onClick={handleLogout}
                className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Store Location & Brand Sub-Header */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/15">
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider uppercase">
                {isNativeStore ? "NATIVE STORE" : "SHOT STORE"}
              </span>
              <span className="font-extrabold text-sm truncate">
                📍 {selectedStore?.ds_name || "Store"} ({selectedStore?.ds_code})
              </span>
            </div>

            {/* Switch Store for Admins */}
            {isAdminMode && stores.length > 0 && (
              <select
                value={selectedStore?.ds_code || ""}
                onChange={(e) => {
                  const s = stores.find(st => st.ds_code === e.target.value);
                  if (s) {
                    setSelectedStore(s);
                    setCart({});
                  }
                }}
                className="bg-white text-stone-900 font-bold text-xs rounded-lg px-2 py-1 outline-none shadow-sm"
              >
                {stores.map(s => (
                  <option key={s.ds_code} value={s.ds_code}>
                    {s.ds_name} ({s.store_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. FAST PRODUCT & SKU SEARCH BAR */}
          <div className="relative pt-0.5">
            <input
              type="text"
              placeholder={`Search "${isNativeStore ? 'subko, colombian decaf, oat milk, cups, sugars...' : 'coffee beans, vanilla, oat milk, cups, isi...'}"`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white text-stone-900 placeholder-stone-400 text-sm font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <span className="absolute left-3.5 top-3 text-stone-400 text-sm">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 3. TABS: ORDERING CATALOG vs BARISTA BRM GUIDE */}
      <div className="bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm sticky top-[138px] z-20">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div className="flex space-x-1 py-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("CATALOG")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "CATALOG"
                  ? (isNativeStore ? "bg-[#1864AB] text-white" : "bg-[#6B0B20] text-white")
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <span>📦</span>
              <span>Stock Catalog ({brandFilteredItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("BRM_GUIDE")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === "BRM_GUIDE"
                  ? "bg-[#8C1826] text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <span>📋</span>
              <span>Barista BRMs & Hygiene Standards</span>
            </button>
          </div>
        </div>

        {/* 4. EXACT CUSTOM CATEGORY SECTIONS PILLS */}
        {activeTab === "CATALOG" && (
          <div className="max-w-3xl mx-auto px-4 pb-2.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedSection("ALL")}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition whitespace-nowrap ${
                selectedSection === "ALL"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-700"
              }`}
            >
              All Sections
            </button>

            {categorizedSections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition whitespace-nowrap border ${
                  selectedSection === sec.id
                    ? (isNativeStore ? "bg-[#1864AB] text-white border-[#1864AB]" : "bg-[#6B0B20] text-white border-[#6B0B20]")
                    : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                }`}
              >
                {sec.title.split("(")[0].trim()}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-6">

        {/* 5. BARISTA OPERATIONAL BRM & HYGIENE BANNERS */}
        {isNativeStore ? (
          /* NATIVE × SUBKO BARISTA OPERATIONAL BANNER */
          <div className="rounded-3xl overflow-hidden shadow-lg border border-sky-200 bg-gradient-to-b from-[#FFF9EE] to-[#FFF3DC]">
            <div className="bg-[#1864AB] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF3DC] text-[#8C1826] text-[10px] font-black px-2.5 py-0.5 rounded tracking-widest uppercase">
                  NATIVE × SUBKO
                </span>
                <span className="font-extrabold text-sm tracking-wide">
                  Barista Craft & Quality Standards
                </span>
              </div>
              <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                Specialty Coffee
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#8C1826] tracking-tight uppercase">
                  MADE BY HAND, SERVED WITH HEART
                </h2>
                <p className="text-xs font-semibold text-stone-700 max-w-lg mx-auto">
                  Every Native cup represents our craft collaboration with Subko. Baristas must maintain precise dial-in parameters, spotless hygiene, and fresh preparation for every ticket.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">⚖️</span>
                  <div className="text-xs font-black text-[#8C1826]">Follow BRMs</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Strict dry dose (g), yield (g) & extraction timing.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">🧼</span>
                  <div className="text-xs font-black text-[#8C1826]">Station Hygiene</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Purge & wipe steam wands instantly; clean portafilters.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">🥛</span>
                  <div className="text-xs font-black text-[#8C1826]">Fresh Texturing</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Silky microfoam per order at 60–65°C. Zero re-steaming.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">⏱️</span>
                  <div className="text-xs font-black text-[#8C1826]">Record Time</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Flawless speed of service without cutting craft corners.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SHOT BARISTA OPERATIONAL BANNER */
          <div className="rounded-3xl overflow-hidden shadow-lg border border-rose-100 bg-gradient-to-b from-[#FFF5F6] to-[#FFEBEF]">
            <div className="bg-[#6B0B20] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF000] text-black text-[10px] font-black px-2.5 py-0.5 rounded tracking-widest uppercase">
                  SHOT PROMISE
                </span>
                <span className="font-extrabold text-sm tracking-wide">
                  Barista Standards & Operations
                </span>
              </div>
              <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                Fresh & Clean
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#6B0B20] tracking-tight uppercase">
                  No Shortcuts • No Pre-Batching
                </h2>
                <p className="text-xs font-semibold text-stone-700 max-w-lg mx-auto">
                  Hand-poured by baristas for every single ticket. Follow BRM recipe measures, maintain spotless stations, and prepare beverages strictly on demand.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">📖</span>
                  <div className="text-xs font-black text-[#6B0B20]">Strict BRMs</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Accurate syrup pumps, shot volume & beverage ratio.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">🧼</span>
                  <div className="text-xs font-black text-[#6B0B20]">Clean Station</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Sanitized cloths, clean tamper base & sanitized counter.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">☕</span>
                  <div className="text-xs font-black text-[#6B0B20]">Fresh Pulls</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Never serve expired shots. Pull fresh on ticket arrival.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">📦</span>
                  <div className="text-xs font-black text-[#6B0B20]">Spill-Proof</div>
                  <p className="text-[10px] text-stone-600 leading-tight">
                    Secure cup lids tightly for rapid 15-minute dispatch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. BRM GUIDE TAB VIEW */}
        {activeTab === "BRM_GUIDE" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-stone-200 space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                <span>📋</span>
                <span>Barista Recipe Manual (BRM) & Daily Shift Standards</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Mandatory operational benchmarks for {selectedStore?.ds_name} ({selectedStore?.store_type} Store).
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-stone-800 flex items-center space-x-2">
                <span>☕</span>
                <span>Espresso Dial-In Standards</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="font-bold text-stone-900">Dry Coffee Dose</div>
                  <div className="text-stone-600 text-[11px]">18.0g – 18.5g per double shot basket. Level & tamp evenly.</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="font-bold text-stone-900">Liquid Espresso Yield</div>
                  <div className="text-stone-600 text-[11px]">36.0g – 38.0g out in cup (1:2 ratio standard).</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="font-bold text-stone-900">Extraction Time</div>
                  <div className="text-stone-600 text-[11px]">26 – 30 seconds. Discard shots out of this calibration range.</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-stone-800 flex items-center space-x-2">
                <span>🧼</span>
                <span>Hygiene & Food Safety Protocols</span>
              </h4>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Steam Wand Hygiene:</strong> Wipe with a dedicated damp sanitizing cloth and purge before AND immediately after texturing milk. Never let milk residue dry.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Milk Temperatures:</strong> Whole milk and dairy alternatives steamed strictly to 60°C–65°C. Never reheat or top up leftover steamed milk.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Portafilter Maintenance:</strong> Knock out coffee pucks immediately, wipe basket dry with clean microfibre before each dose, and keep portafilters locked in group head to maintain heat.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Stock Rotation (FIFO):</strong> Always consume older batch items first when receiving new cartons from replenishment. Check expiry labels daily.</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setActiveTab("CATALOG")}
                className={`px-6 py-2.5 rounded-2xl font-black text-xs text-white shadow-md transition ${
                  isNativeStore ? "bg-[#1864AB] hover:bg-[#13508A]" : "bg-[#6B0B20] hover:bg-[#520818]"
                }`}
              >
                ← Return to Stock Ordering Catalog
              </button>
            </div>
          </div>
        )}

        {/* 7. EXACT CATEGORIZED SECTIONS DISPLAY */}
        {activeTab === "CATALOG" && (
          <div className="space-y-8">
            {categorizedSections
              .filter(sec => selectedSection === "ALL" || selectedSection === sec.id)
              .map(sec => {
                const totalSecItems = sec.items.length + (sec.subsections?.reduce((a, s) => a + s.items.length, 0) || 0);
                if (totalSecItems === 0 && searchQuery) return null;

                return (
                  <section key={sec.id} className="space-y-4">
                    {/* Section Header */}
                    <div className="border-b border-stone-200 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-black text-stone-900 tracking-tight">
                            {sec.title}
                          </h3>
                          <span className="bg-stone-200 text-stone-700 text-xs font-black px-2 py-0.5 rounded-full">
                            {totalSecItems}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
