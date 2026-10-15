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

  useEffect(() => {
    const saved = localStorage.getItem("noon_user_email");
    if (saved) setUserEmail(saved.toLowerCase());
    fetch("/api/stores").then(r => r.json()).then(d => Array.isArray(d) && setStores(d));
    fetch("/api/items").then(r => r.json()).then(d => Array.isArray(d) && setItems(d));
    fetch("/api/admins").then(r => r.json()).then(d => Array.isArray(d) && setAdmins(d.map((a: any) => a.email.toLowerCase())));
  }, []);

  useEffect(() => {
    if (!userEmail || stores.length === 0) return;
    const email = userEmail.trim().toLowerCase();
    const isAdmin = admins.includes(email) || email === "kangarg@noon.com";
    const matched = stores.find(s => s.email && s.email.trim().toLowerCase() === email);

    if (matched) {
      setSelectedStore(matched);
      setIsAdminMode(isAdmin);
    } else if (isAdmin) {
      setIsAdminMode(true);
      if (!selectedStore && stores.length > 0) setSelectedStore(stores[0]);
    }
  }, [userEmail, stores, admins]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const email = loginInput.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      setLoginError("Please use your official @noon.com email address.");
      return;
    }
    const matched = stores.find(s => s.email && s.email.trim().toLowerCase() === email);
    const isAdmin = admins.includes(email) || email === "kangarg@noon.com";

    if (matched || isAdmin) {
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setIsAdminMode(isAdmin);
      setSelectedStore(matched || stores[0]);
    } else {
      setLoginError("Email not assigned to any cafe store. Please contact your manager.");
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
    const finalQty = Math.max(0, isNaN(qty) ? 0 : qty);
    if (max && max > 0 && finalQty > max) {
      alert(`Maximum order limit for this item is ${max}`);
      return;
    }
    setCart(prev => ({ ...prev, [zsku]: finalQty }));
  };

  const submitOrder = async () => {
    if (!selectedStore) return;
    setIsSubmitting(true);
    const orderItems = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([zsku, qty]) => {
        const it = items.find(i => i.item_zsku === zsku);
        const finalSku = (it && !it.in_stock && it.substitute_zsku) ? it.substitute_zsku : zsku;
        return { item_zsku: finalSku, zsku_qty: qty };
      });

    if (orderItems.length === 0) {
      alert("Cart is empty");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ds_code: selectedStore.ds_code, items: orderItems }),
      });
      if (res.ok) {
        alert("🎉 Order submitted successfully!");
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

  const isNative = selectedStore?.store_type === "NATIVE";

  // Catalog filtering by store brand
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (!selectedStore) return false;
      if (it.item_type === "GENERAL") return true;
      if (isNative && it.item_type === "NATIVE_ONLY") return true;
      if (!isNative && it.item_type === "SHOT_ONLY") return true;
      return false;
    });
  }, [items, selectedStore, isNative]);

  // Search filtering
  const searchedItems = useMemo(() => {
    if (!searchQuery) return filteredItems;
    const q = searchQuery.toLowerCase();
    return filteredItems.filter(i =>
      (i.product_title && i.product_title.toLowerCase().includes(q)) ||
      (i.item_zsku && i.item_zsku.toLowerCase().includes(q)) ||
      (i.barcode && i.barcode.toLowerCase().includes(q)) ||
      (i.brand && i.brand.toLowerCase().includes(q))
    );
  }, [filteredItems, searchQuery]);

  // Classification for custom sections
  const sections = useMemo(() => {
    const isMilk = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      return t.includes("milk") || t.includes("oat") || t.includes("almond") || t.includes("coconut cream");
    };

    const isBean = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const cat = (i.category || "").toUpperCase();
      return (cat === "COFFEE_BEANS" || t.includes("blend") || t.includes("roast") || t.includes("decaf")) && !t.includes("cleaning");
    };

    const isDecaf = (i: any) => (i.product_title || "").toLowerCase().includes("decaf");

    const isUnbranded = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();
      return t.includes("unbranded") || b.startsWith("UBNAT");
    };

    const isNativeBranded = (i: any) => {
      if (isUnbranded(i)) return false;
      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();
      return i.item_type === "NATIVE_ONLY" || i.brand === "native" || b.startsWith("NAT") || t.includes("cup") || t.includes("lid") || t.includes("straw") || t.includes("foil") || t.includes("napkin") || t.includes("sugar") || t.includes("sweetener") || t.includes("stirrers") || t.includes("bag");
    };

    if (isNative) {
      const subkoBeans = searchedItems.filter(i => isBean(i) && !isDecaf(i));
      const decafBeans = searchedItems.filter(i => isBean(i) && isDecaf(i));
      const brandedPkg = searchedItems.filter(i => isNativeBranded(i));
      const unbrandedPkg = searchedItems.filter(i => isUnbranded(i));

      const accounted = new Set([
        ...subkoBeans.map(i => i.item_zsku),
        ...decafBeans.map(i => i.item_zsku),
        ...brandedPkg.map(i => i.item_zsku),
        ...unbrandedPkg.map(i => i.item_zsku),
      ]);
      const ingredients = searchedItems.filter(i => !accounted.has(i.item_zsku));

      return [
        {
          id: "NATIVE_COFFEE",
          title: "☕ Coffee Beans (SUBKO Speciality Coffee - NATIVE & NICHE)",
          badge: "SUBKO Collab",
          desc: "NATIVE Blend & NICHE Blend from SUBKO.",
          items: subkoBeans,
          subsections: [
            {
              id: "NATIVE_DECAF",
              title: "🌿 Decaf Beans",
              desc: "Decaffeinated single-origin coffee (Decaf Colombia Ground).",
              items: decafBeans,
            }
          ]
        },
        {
          id: "NATIVE_INGREDIENTS",
          title: "🥛 Ingredients & Essentials",
          badge: "Syrups, Milks & Powders",
          desc: "All syrups, sauces, frappe mixes, barista milks, powders & supplies.",
          items: ingredients,
          subsections: []
        },
        {
          id: "NATIVE_BRANDED_PKG",
          title: "📦 NATIVE Branded Packaging",
          badge: "Official Native",
          desc: "Branded double-wall cups, lids, u-cups, straws, foils, stirrers & sugars.",
          items: brandedPkg,
          subsections: []
        },
        {
          id: "NATIVE_UNBRANDED_PKG",
          title: "📦 Unbranded Packaging for NATIVE (Backup)",
          badge: "Backup Stock",
          desc: "Used when NATIVE branded packaging of any type is unavailable.",
          items: unbrandedPkg,
          subsections: []
        }
      ];
    } else {
      const beans = searchedItems.filter(i => isBean(i));
      const milks = searchedItems.filter(i => isMilk(i) && !isBean(i));
      const accounted = new Set([...beans.map(i => i.item_zsku), ...milks.map(i => i.item_zsku)]);
      const ingredients = searchedItems.filter(i => !accounted.has(i.item_zsku));

      return [
        {
          id: "SHOT_COFFEE",
          title: "☕ Coffee Beans (All Three)",
          badge: "3 Signature Roasts",
          desc: "Noon Minutes Blend (Signature), Ethiopian Medium Roast & Colombian Decaf.",
          items: beans,
          subsections: []
        },
        {
          id: "SHOT_MILKS",
          title: "🥛 Barista Milks",
          badge: "Dairy & Plant Milks",
          desc: "Oat milk, Coconut milk & Almond milk barista formulations.",
          items: milks,
          subsections: []
        },
        {
          id: "SHOT_INGREDIENTS",
          title: "🍯 Ingredients & Essentials",
          badge: "Syrups & Supplies",
          desc: "All syrups, sauces, frappe powders, chai, matcha & cafe cleaning essentials.",
          items: ingredients,
          subsections: []
        }
      ];
    }
  }, [isNative, searchedItems]);

  const totalUnits = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalSkus = Object.values(cart).filter(q => q > 0).length;

  // Background pattern
  const wallpaperStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%238B5E3C' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' opacity='0.07'%3E%3Cpath d='M20,20 L40,20 L36,55 L24,55 Z'/%3E%3Cpath d='M18,20 L42,20'/%3E%3Cpath d='M26,14 Q28,10 26,6'/%3E%3Cpath d='M34,14 Q36,10 34,6'/%3E%3Cpath d='M110,30 C110,25 122,25 122,30 C122,35 110,35 110,30 Z'/%3E%3Ccircle cx='35' cy='125' r='10'/%3E%3Cpath d='M45,125 L70,125' stroke-width='2'/%3E%3Crect x='105' cy='105' width='24' height='20' rx='3'/%3E%3Cpath d='M129,110 C134,110 134,120 129,120'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundColor: isNative ? "#F5F8FC" : "#FAF7F2",
  };

  // Card component
  const ItemCard = ({ item }: { item: any }) => {
    const qty = cart[item.item_zsku] || 0;
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-stone-200 transition flex flex-col justify-between space-y-3">
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
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">OOS</span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">In Stock</span>
          )}
        </div>

        <div className="space-y-1">
          <h4 className="font-extrabold text-stone-900 text-base leading-snug">{item.product_title}</h4>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono text-stone-500">
            <span>SKU: {item.item_zsku}</span>
            {item.barcode && <span>• Barcode: {item.barcode}</span>}
          </div>
        </div>

        {!item.in_stock && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium p-2 rounded-xl">
            {item.substitute_zsku ? (
              <>⚠️ OOS: Replaced with SKU <span className="font-mono font-bold">{item.substitute_zsku}</span></>
            ) : (
              <>⚠️ Currently Out of Stock</>
            )}
          </div>
        )}

        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500">Order Qty:</span>
          {qty === 0 ? (
            <button
              type="button"
              onClick={() => updateCart(item.item_zsku, 1, item.max_qty)}
              className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition ${
                isNative ? "bg-[#1864AB] text-white hover:bg-[#13508A]" : "bg-[#6B0B20] text-white hover:bg-[#520818]"
              }`}
            >
              + ADD
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-full border border-stone-200">
              <button
                type="button"
                onClick={() => updateCart(item.item_zsku, qty - 1, item.max_qty)}
                className="w-7 h-7 rounded-full bg-white text-stone-800 font-black text-sm flex items-center justify-center shadow-sm"
              >
                –
              </button>
              <input
                type="number"
                min="0"
                max={item.max_qty || undefined}
                value={qty}
                onChange={e => updateCart(item.item_zsku, parseInt(e.target.value) || 0, item.max_qty)}
                className="w-12 text-center font-black text-sm bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => updateCart(item.item_zsku, qty + 1, item.max_qty)}
                className={`w-7 h-7 rounded-full text-white font-black text-sm flex items-center justify-center shadow-sm ${
                  isNative ? "bg-[#1864AB]" : "bg-[#6B0B20]"
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
      <div className="min-h-screen flex flex-col justify-between py-12 px-4" style={wallpaperStyle}>
        <div className="max-w-md mx-auto w-full text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-stone-200 shadow-sm">
            <span className="font-black text-xs text-stone-900">noon CAFE OPS</span>
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
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Barista Ordering Portal</h1>
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
                  onChange={e => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-300 text-sm font-medium bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-[#1864AB] focus:outline-none transition"
                />
                <span className="absolute left-3.5 top-3.5 text-stone-400 text-sm">✉️</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Enter your designated store email or admin account.
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
              className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg hover:shadow-xl transition flex items-center justify-center space-x-2"
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
            <a href="/admin" className="font-bold text-stone-800 hover:text-[#1864AB] transition">
              Admin Dashboard ⚙️
            </a>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full text-center text-xs text-stone-400">
          noon Speciality Coffee Operations • Dubai & UAE Cafes
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN BARISTA STORE PORTAL
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen pb-32 transition-colors duration-300" style={wallpaperStyle}>
      {/* 1. HEADER */}
      <header className={`sticky top-0 z-30 transition-colors shadow-md ${
        isNative ? "bg-[#1864AB] text-white" : "bg-[#6B0B20] text-white"
      }`}>
        <div className="max-w-3xl mx-auto px-4 pt-3.5 pb-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isNative ? (
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  <span className="text-amber-200 text-xs font-black tracking-widest uppercase">SUBKO COLLAB</span>
                  <span className="text-white font-black text-sm tracking-wide">NATIVE CAFE</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  <span className="text-[#FFF000] text-xs font-black tracking-widest uppercase">SHOT</span>
                  <span className="text-white font-black text-sm tracking-wide">CAFE OPERATIONS</span>
                </div>
              )}
            </div>

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

          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/15">
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider uppercase">
                {isNative ? "NATIVE STORE" : "SHOT STORE"}
              </span>
              <span className="font-extrabold text-sm truncate">
                📍 {selectedStore?.ds_name || "Store"} ({selectedStore?.ds_code})
              </span>
            </div>

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

          <div className="relative pt-0.5">
            <input
              type="text"
              placeholder={`Search "${isNative ? 'subko, colombian decaf, oat milk, cups, sugars...' : 'coffee beans, vanilla, oat milk, cups, essentials...'}"`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white text-stone-900 placeholder-stone-400 text-sm font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <span className="absolute left-3.5 top-3 text-stone-400 text-sm">🔍</span>
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

      {/* 2. SECTION FILTER BAR */}
      <div className="bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm sticky top-[138px] z-20">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedSection("ALL")}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition whitespace-nowrap ${
              selectedSection === "ALL" ? "bg-stone-900 text-white" : "bg-stone-100 hover:bg-stone-200 text-stone-700"
            }`}
          >
            All Sections
          </button>

          {sections.map(sec => (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition whitespace-nowrap border ${
                selectedSection === sec.id
                  ? (isNative ? "bg-[#1864AB] text-white border-[#1864AB]" : "bg-[#6B0B20] text-white border-[#6B0B20]")
                  : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
              }`}
            >
              {sec.title.replace(/\s*\(.*/, "")}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        {/* 3. BARISTA BANNER */}
        {isNative ? (
          <div className="rounded-3xl overflow-hidden shadow-lg border border-sky-200 bg-gradient-to-b from-[#FFF9EE] to-[#FFF3DC]">
            <div className="bg-[#1864AB] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF3DC] text-[#8C1826] text-[10px] font-black px-2.5 py-0.5 rounded tracking-widest uppercase">
                  NATIVE × SUBKO
                </span>
                <span className="font-extrabold text-sm tracking-wide">Barista Craft & Quality Standards</span>
              </div>
              <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">Speciality Coffee</span>
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
                  <p className="text-[10px] text-stone-600 leading-tight">Strict dry dose (g), yield (g) & extraction timing.</p>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">🧼</span>
                  <div className="text-xs font-black text-[#8C1826]">Station Hygiene</div>
                  <p className="text-[10px] text-stone-600 leading-tight">Purge & wipe steam wands instantly; clean portafilters.</p>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">🥛</span>
                  <div className="text-xs font-black text-[#8C1826]">Fresh Texturing</div>
                  <p className="text-[10px] text-stone-600 leading-tight">Silky microfoam per order at 60–65°C. Zero re-steaming.</p>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">⏱️</span>
                  <div className="text-xs font-black text-[#8C1826]">Record Time</div>
                  <p className="text-[10px] text-stone-600 leading-tight">Flawless speed of service without cutting craft corners.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden shadow-lg border border-rose-100 bg-gradient-to-b from-[#FFF5F6] to-[#FFEBEF]">
            <div className="bg-[#6B0B20] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF000] text-black text-[10px] font-black px-2.5 py-0.5 rounded tracking-widest uppercase">
                  SHOT PROMISE
                </span>
                <span className="font-extrabold text-sm tracking-wide">Barista Standards & Operations</span>
              </div>
              <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">Fresh & Clean</span>
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
                  <p className="text-[10px] text-stone-600 leading-tight">Accurate syrup pumps, shot volume & beverage ratio.</p>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">🧼</span>
                  <div className="text-xs font-black text-[#6B0B20]">Clean Station</div>
                  <p className="text-[10px] text-stone-600 leading-tight">Sanitized cloths, clean tamper base & sanitized counter.</p>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">☕</span>
                  <div className="text-xs font-black text-[#6B0B20]">Fresh Pulls</div>
                  <p className="text-[10px] text-stone-600 leading-tight">Never serve expired shots. Pull fresh on ticket arrival.</p>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-rose-200/80 shadow-sm text-center space-y-1">
                  <span className="text-xl">📦</span>
                  <div className="text-xs font-black text-[#6B0B20]">Spill-Proof</div>
                  <p className="text-[10px] text-stone-600 leading-tight">Secure cup lids tightly for rapid 15-minute dispatch.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SECTIONS & ITEMS */}
        <div className="space-y-8">
          {sections
            .filter(sec => selectedSection === "ALL" || selectedSection === sec.id)
            .map(sec => {
              const totalSecCount = sec.items.length + (sec.subsections?.reduce((a, s) => a + s.items.length, 0) || 0);
              if (totalSecCount === 0 && searchQuery) return null;

              return (
                <section key={sec.id} className="space-y-4">
                  <div className="border-b border-stone-200 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-stone-900 tracking-tight">{sec.title}</h3>
                        <span className="bg-stone-200 text-stone-700 text-xs font-black px-2 py-0.5 rounded-full">
                          {totalSecCount}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{sec.badge}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{sec.desc}</p>
                  </div>

                  {sec.items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {sec.items.map(item => (
                        <ItemCard key={item.item_zsku} item={item} />
                      ))}
                    </div>
                  )}

                  {sec.subsections && sec.subsections.map(sub => (
                    <div key={sub.id} className="pt-3 pl-2 sm:pl-4 border-l-2 border-amber-300 space-y-3 mt-4">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-[#8C1826] tracking-tight">{sub.title}</h4>
                        <p className="text-xs text-stone-500">{sub.desc}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {sub.items.map(item => (
                          <ItemCard key={item.item_zsku} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
        </div>
      </main>

      {/* 5. FLOATING BOTTOM ORDER BAR */}
      {totalUnits > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF000] text-black font-black text-[11px] px-2 py-0.5 rounded-md">
                  {totalUnits} Total Units
                </span>
                <span className="text-xs font-bold text-stone-700">({totalSkus} unique SKUs)</span>
              </div>
              <div className="text-xs font-black text-stone-900 truncate max-w-[200px] sm:max-w-sm">
                Ordering for: {selectedStore?.ds_name}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsOrderSummaryOpen(true)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-black px-3.5 py-3 rounded-2xl transition"
              >
                View Cart
              </button>

              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:shadow-xl active:scale-95 transition duration-150 disabled:opacity-50 flex items-center space-x-2 ${
                  isNative ? "bg-[#1864AB] hover:bg-[#13508A] text-white" : "bg-[#6B0B20] hover:bg-[#520818] text-white"
                }`}
              >
                <span>{isSubmitting ? "Submitting..." : "Submit Order"}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ORDER REVIEW MODAL */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900">Review Store Replenishment Order</h3>
                <p className="text-xs text-stone-500">
                  {selectedStore?.ds_name} ({selectedStore?.ds_code}) • {selectedStore?.store_type} Store
                </p>
              </div>
              <button
                onClick={() => setIsOrderSummaryOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {Object.entries(cart)
                .filter(([_, qty]) => qty > 0)
                .map(([zsku, qty]) => {
                  const it = items.find(i => i.item_zsku === zsku);
                  return (
                    <div key={zsku} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-black text-stone-900 truncate">
                          {it?.product_title || zsku}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          SKU: {zsku} {it?.unit_size && `• ${it.unit_size} ${it.unit_type}`}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={it?.max_qty || undefined}
                          value={qty}
                          onChange={e => updateCart(zsku, parseInt(e.target.value) || 0, it?.max_qty)}
                          className="w-14 text-center font-black text-xs border rounded-lg py-1 bg-white"
                        />
                        <button
                          onClick={() => updateCart(zsku, 0, null)}
                          className="text-stone-400 hover:text-red-600 text-xs font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t space-y-2">
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-md transition ${
                  isNative ? "bg-[#1864AB] text-white hover:bg-[#13508A]" : "bg-[#6B0B20] text-white hover:bg-[#520818]"
                }`}
              >
                {isSubmitting ? "Submitting Order..." : `Confirm & Place Order (${totalUnits} Units)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
