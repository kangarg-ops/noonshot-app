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
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);

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

  // Dynamic Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    brandFilteredItems.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [brandFilteredItems]);

  // Apply Search & Category filters
  const displayItems = useMemo(() => {
    return brandFilteredItems.filter(item => {
      const matchesSearch = 
        !searchQuery ||
        item.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_zsku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = 
        selectedCategory === "ALL" || 
        item.category === selectedCategory ||
        (selectedCategory === "NATIVE_SPECIALTY" && item.product_title?.toLowerCase().includes("subko"));

      return matchesSearch && matchesCat;
    });
  }, [brandFilteredItems, searchQuery, selectedCategory]);

  const totalItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalUniqueItems = Object.values(cart).filter(q => q > 0).length;

  // Cafe wallpaper SVG pattern background (Coffee cups, beans, portafilters, steam, cafe elements)
  const cafeWallpaperStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%238B5E3C' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' opacity='0.08'%3E%3C!-- Coffee Cup with Sleeve --%3E%3Cpath d='M25,25 L45,25 L41,60 L29,60 Z'/%3E%3Cpath d='M23,25 L47,25'/%3E%3Cpath d='M27,37 L43,37 L42,48 L28,48 Z'/%3E%3C!-- Steam --%3E%3Cpath d='M31,18 Q33,14 31,10'/%3E%3Cpath d='M39,18 Q41,14 39,10'/%3E%3C!-- Coffee Beans --%3E%3Cpath d='M120,35 C120,30 132,30 132,35 C132,40 120,40 120,35 Z'/%3E%3Cpath d='M123,32 Q126,35 129,38'/%3E%3Cpath d='M138,42 C138,37 150,37 150,42 C150,47 138,47 138,42 Z'/%3E%3Cpath d='M141,39 Q144,42 147,45'/%3E%3C!-- Portafilter Handle --%3E%3Ccircle cx='40' cy='135' r='12'/%3E%3Cpath d='M52,135 L80,135' stroke-width='2.2'/%3E%3Cpath d='M35,130 L45,130 L43,142 L37,142 Z'/%3E%3C!-- Ceramic Mug with Latte Art --%3E%3Crect x='115' cy='115' width='28' height='24' rx='3'/%3E%3Cpath d='M143,120 C149,120 149,132 143,132'/%3E%3Cpath d='M110,140 L148,140'/%3E%3Cpath d='M124,124 Q129,128 134,124 Q129,132 124,124 Z' fill='%238B5E3C' opacity='0.08'/%3E%3C!-- French Press / Dripper --%3E%3Crect x='75' y='45' width='20' height='30' rx='2'/%3E%3Cpath d='M85,38 L85,45' stroke-width='1.5'/%3E%3Ccircle cx='85' cy='36' r='2'/%3E%3Cpath d='M95,50 C101,50 101,65 95,65'/%3E%3C!-- Sparkles / Stars --%3E%3Cpath d='M85,100 L87,105 L92,107 L87,109 L85,114 L83,109 L78,107 L83,105 Z' fill='%238B5E3C' opacity='0.08'/%3E%3Cpath d='M160,85 L161,88 L164,89 L161,90 L160,93 L159,90 L156,89 L159,88 Z' fill='%238B5E3C' opacity='0.08'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundColor: isNativeStore ? "#F7FAFC" : "#FAF7F2",
  };

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case "COFFEE_BEANS": return "☕ Coffee Beans";
      case "PACKAGING": return "🥤 Packaging & Cups";
      case "INGREDIENTS": return "🥛 Milks & Ingredients";
      case "SYRUPS": return "🍯 Syrups & Sauces";
      default: return `📦 ${cat.replace(/_/g, " ")}`;
    }
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN (When Barista / Admin is not logged in)
  // -------------------------------------------------------------
  if (!userEmail) {
    return (
      <div 
        className="min-h-screen flex flex-col justify-between py-10 px-4"
        style={cafeWallpaperStyle}
      >
        {/* Top Noon App Brand Header */}
        <div className="max-w-md mx-auto w-full text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm font-black tracking-tight shadow-sm text-gray-900">
              noon
            </span>
            <span className="bg-[#FFF000] text-red-600 font-extrabold px-3 py-1 rounded-full text-xs tracking-wider shadow-sm border border-yellow-400">
              MINUTES CAFE
            </span>
            <span className="bg-[#780D21] text-white font-bold px-3 py-1 rounded-full text-xs shadow-sm">
              SHOT
            </span>
            <span className="bg-[#1E75C7] text-white font-bold px-3 py-1 rounded-full text-xs shadow-sm">
              NATIVE
            </span>
          </div>
        </div>

        {/* Login Box */}
        <div className="max-w-md mx-auto w-full bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-stone-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center border border-amber-200 shadow-inner">
              <span className="text-3xl">☕</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Barista Cafe Portal
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Official store replenishment system for SHOT & NATIVE cafes.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Store Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="cafe-Downtown@noon.com"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-300 text-sm font-medium bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-[#780D21] focus:border-[#780D21] focus:outline-none transition"
                />
                <span className="absolute left-3.5 top-3.5 text-stone-400 text-sm">
                  ✉️
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Enter your designated cafe store email or authorized admin email.
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
              className="w-full bg-[#1F1F1F] hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg hover:shadow-xl transition duration-150 flex items-center justify-center space-x-2"
            >
              <span>Sign In to Store Portal</span>
              <span>→</span>
            </button>
          </form>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center space-x-1">
              <span>🔒</span>
              <span>Authorized Access</span>
            </span>
            <a 
              href="/admin" 
              className="font-bold text-stone-800 hover:text-[#780D21] transition"
            >
              Admin Sign In ⚙️
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="max-w-md mx-auto w-full text-center text-xs text-stone-400">
          Powered by noon Minutes • Specialty Coffee Supply Chain
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN BARISTA STORE PORTAL (OFFICIAL NOON APP UI)
  // -------------------------------------------------------------
  return (
    <div 
      className="min-h-screen pb-32 transition-colors duration-300"
      style={cafeWallpaperStyle}
    >
      {/* 1. TOP OFFICIAL NOON SUPERAPP STATUS & BAR */}
      <header className={`sticky top-0 z-30 transition-colors shadow-md ${
        isNativeStore ? "bg-[#1E74C6] text-white" : "bg-[#700D22] text-white"
      }`}>
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-3 space-y-3">
          
          {/* Top Superapp Navigation Pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="bg-white text-black font-black text-xs px-2.5 py-1 rounded-full shadow-sm">
                noon
              </span>
              <span className="bg-white/90 text-[#103078] font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
                supermall
              </span>
              <span className="bg-white/90 text-[#E60050] font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
                FOOD
              </span>
              <span className="bg-[#FFF000] text-red-600 font-extrabold text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                <span>⚡</span>
                <span>MINUTES</span>
              </span>
            </div>

            {/* Admin Switcher & Logout */}
            <div className="flex items-center space-x-2">
              {isAdminMode && (
                <a
                  href="/admin"
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs px-2.5 py-1 rounded-lg transition shadow flex items-center space-x-1"
                >
                  <span>⚙️</span>
                  <span className="hidden sm:inline">Admin</span>
                </a>
              )}
              <button
                onClick={handleLogout}
                className="bg-black/20 hover:bg-black/40 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Delivery & Active Store Info */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                {isNativeStore ? "NATIVE STORE" : "SHOT STORE"}
              </span>
              <span className="font-extrabold text-sm truncate">
                📍 {selectedStore?.ds_name || "Select Store"} ({selectedStore?.ds_code})
              </span>
            </div>

            {/* Quick Switch for Admins */}
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
                className="bg-white text-black font-bold text-xs rounded-lg px-2 py-1 outline-none shadow-sm"
              >
                {stores.map(s => (
                  <option key={s.ds_code} value={s.ds_code}>
                    {s.ds_name} ({s.store_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. NOON APP SEARCH BAR */}
          <div className="relative pt-1">
            <input
              type="text"
              placeholder={`Search "${isNativeStore ? 'subko, colombian decaf, oat milk...' : 'coffee beans, syrups, cups...'}"`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white text-gray-900 placeholder-stone-400 text-sm font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <span className="absolute left-3.5 top-3.5 text-stone-400 text-sm">
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

      {/* 3. CATEGORY / BRAND HORIZONTAL TABS */}
      <div className="sticky top-[128px] z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap ${
              selectedCategory === "ALL"
                ? (isNativeStore ? "bg-[#1E74C6] text-white" : "bg-[#700D22] text-white")
                : "bg-stone-100 hover:bg-stone-200 text-stone-700"
            }`}
          >
            All Items ({brandFilteredItems.length})
          </button>

          {isNativeStore && (
            <button
              onClick={() => setSelectedCategory("NATIVE_SPECIALTY")}
              className={`px-3 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap border ${
                selectedCategory === "NATIVE_SPECIALTY"
                  ? "bg-[#8C1826] text-white border-[#8C1826]"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
              }`}
            >
              ★ SUBKO Collab Beans
            </button>
          )}

          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap ${
                selectedCategory === cat
                  ? (isNativeStore ? "bg-[#1E74C6] text-white" : "bg-[#700D22] text-white")
                  : "bg-stone-100 hover:bg-stone-200 text-stone-700"
              }`}
            >
              {getCategoryTitle(cat)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-6">

        {/* 4. BRAND PROMOTIONAL & VALUES BANNER (EXACT TO SCREENSHOTS) */}
        {isNativeStore ? (
          /* NATIVE BRAND BANNER (Screenshots 1-4) */
          <div className="rounded-3xl overflow-hidden shadow-md border border-sky-200 bg-[#FFF7E8]">
            {/* Top Subko Collaboration Header */}
            <div className="bg-[#1E74C6] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF6DE] text-[#8C1826] text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                  POWERED BY SUBKO
                </span>
                <span className="font-extrabold text-sm tracking-wide">
                  NATIVE • cafe by noon
                </span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                Single Origin
              </span>
            </div>

            {/* Banner Main Graphic */}
            <div className="p-6 text-center space-y-4">
              <div className="inline-block bg-[#8C1826] text-[#FFF6DE] px-4 py-1.5 rounded-full font-black text-xs tracking-widest uppercase shadow">
                SINGLE ORIGIN COFFEE
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#8C1826] tracking-tight uppercase">
                MADE BY HAND, SERVED WITH HEART
              </h2>
              <p className="text-xs sm:text-sm font-bold text-amber-950 max-w-md mx-auto">
                Specialty Coffee. In Record Time. Handcrafted with exclusive single-origin roast profiles and boutique packaging.
              </p>

              {/* Native Preset Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#1E74C6] text-white p-2.5 rounded-2xl shadow-sm text-center">
                  <div className="text-[10px] uppercase font-bold text-sky-200">Roast Profile</div>
                  <div className="text-xs sm:text-sm font-black mt-0.5">NATIVE MEDIUM</div>
                </div>
                <div className="bg-[#8C1826] text-white p-2.5 rounded-2xl shadow-sm text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-200">Exclusive</div>
                  <div className="text-xs sm:text-sm font-black mt-0.5">NICHE SPECIALTY</div>
                </div>
                <div className="bg-[#1E74C6] text-white p-2.5 rounded-2xl shadow-sm text-center">
                  <div className="text-[10px] uppercase font-bold text-sky-200">Single Origin</div>
                  <div className="text-xs sm:text-sm font-black mt-0.5">COLOMBIAN DECAF</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SHOT BRAND BANNER (Screenshots 5-8) */
          <div className="rounded-3xl overflow-hidden shadow-md border border-rose-100 bg-[#FFF5F6] p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="inline-block bg-[#700D22] text-[#FFF000] text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-widest uppercase">
                  SHOT PROMISE
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#700D22] leading-tight">
                  No shortcuts.<br />No mass-production.
                </h2>
                <p className="text-xs sm:text-sm font-medium text-stone-700 max-w-sm">
                  Just boutique-quality ingredients hand-poured by baristas for every single order.
                </p>
              </div>

              {/* Hand-Pour Seal Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full border-2 border-[#700D22] p-2 flex flex-col items-center justify-center text-center shadow-md flex-shrink-0">
                <span className="text-xl sm:text-2xl">☕</span>
                <span className="text-[8px] font-black uppercase text-[#700D22] leading-none mt-0.5">
                  HAND POURED
                </span>
              </div>
            </div>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-rose-200/60">
              <div className="bg-white/80 p-2.5 rounded-2xl text-center space-y-1 shadow-sm">
                <span className="text-lg">🧼</span>
                <div className="text-[11px] font-black text-[#700D22] leading-tight">
                  Clean & Controlled
                </div>
                <div className="text-[9px] text-stone-500">Preparation</div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-2xl text-center space-y-1 shadow-sm">
                <span className="text-lg">☕</span>
                <div className="text-[11px] font-black text-[#700D22] leading-tight">
                  Made Fresh
                </div>
                <div className="text-[9px] text-stone-500">Only After Order</div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-2xl text-center space-y-1 shadow-sm">
                <span className="text-lg">🍋</span>
                <div className="text-[11px] font-black text-[#700D22] leading-tight">
                  High Quality
                </div>
                <div className="text-[9px] text-stone-500">Ingredients</div>
              </div>
            </div>
          </div>
        )}

        {/* 5. ITEM CARDS GRID (INSPIRED BY NOON APP CARDS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-stone-900 tracking-tight flex items-center space-x-2">
              <span>{selectedCategory === "ALL" ? "All Supplies & SKUs" : getCategoryTitle(selectedCategory)}</span>
              <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                {displayItems.length}
              </span>
            </h3>
            <span className="text-xs font-semibold text-stone-500">
              Zero MOQ (Min limit: 0)
            </span>
          </div>

          {displayItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
              <span className="text-4xl">🔍</span>
              <h4 className="font-black text-stone-800 text-base">No items found</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No matching catalog items found for "{searchQuery}". Try searching for another brand or SKU.
              </p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); }}
                className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-800"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {displayItems.map((item) => {
                const currentQty = cart[item.item_zsku] || 0;
                return (
                  <div
                    key={item.item_zsku}
                    className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-stone-200/80 transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Card Top: Badges & Brand */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {item.brand && (
                          <span className="bg-stone-100 text-stone-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                            {item.brand.replace(/_/g, " ")}
                          </span>
                        )}
                        {item.unit_size && item.unit_type && (
                          <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200/50">
                            {item.unit_size} {item.unit_type}
                          </span>
                        )}
                        {item.max_qty && (
                          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Max: {item.max_qty}
                          </span>
                        )}
                      </div>

                      {/* Stock Status Pill */}
                      {!item.in_stock ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                          OOS
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          In Stock
                        </span>
                      )}
                    </div>

                    {/* Card Middle: Thumbnail & Title */}
                    <div className="flex items-center space-x-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.product_title}
                          className="w-16 h-16 object-contain rounded-2xl bg-stone-50 border p-1 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-stone-100 border border-stone-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                          {item.category === "COFFEE_BEANS" ? "☕" : item.category === "PACKAGING" ? "🥤" : "🥛"}
                        </div>
                      )}

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h4 className="font-extrabold text-stone-900 text-sm leading-snug line-clamp-2">
                          {item.product_title}
                        </h4>
                        <p className="text-[11px] font-mono text-stone-400 truncate">
                          SKU: {item.item_zsku}
                        </p>
                        {item.barcode && (
                          <p className="text-[10px] font-mono text-stone-400 truncate">
                            Barcode: {item.barcode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Out of Stock Substitute Notice */}
                    {!item.in_stock && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium p-2 rounded-xl">
                        {item.substitute_zsku ? (
                          <>⚠️ OOS: Replaced with SKU <span className="font-mono font-bold">{item.substitute_zsku}</span></>
                        ) : (
                          <>⚠️ Currently Out of Stock</>
                        )}
                      </div>
                    )}

                    {/* Card Bottom: Quantity Stepper (Noon App Style) */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-500">
                        Order Qty:
                      </span>

                      {currentQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateCart(item.item_zsku, 1, item.max_qty)}
                          className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition ${
                            isNativeStore
                              ? "bg-[#1E74C6] hover:bg-[#1860A3] text-white"
                              : "bg-[#700D22] hover:bg-[#580B1C] text-white"
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
                              isNativeStore ? "bg-[#1E74C6]" : "bg-[#700D22]"
                            }`}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 6. FLOATING BOTTOM ORDER CHECKOUT BAR (OFFICIAL NOON APP FLOATING CART) */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF000] text-red-700 font-black text-[11px] px-2 py-0.5 rounded-md">
                  {totalItemsCount} Units
                </span>
                <span className="text-xs font-bold text-stone-700">
                  ({totalUniqueItems} unique SKUs)
                </span>
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
                  isNativeStore
                    ? "bg-[#1E74C6] hover:bg-[#1860A3] text-white"
                    : "bg-[#700D22] hover:bg-[#580B1C] text-white"
                }`}
              >
                <span>{isSubmitting ? "Submitting..." : "Submit Order"}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CART BREAKDOWN MODAL */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900">Review Store Order</h3>
                <p className="text-xs text-stone-500">
                  {selectedStore?.ds_name} ({selectedStore?.ds_code})
                </p>
              </div>
              <button
                onClick={() => setIsOrderSummaryOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
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
                          onChange={(e) => updateCart(zsku, parseInt(e.target.value) || 0, it?.max_qty)}
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

            {/* Modal Bottom CTA */}
            <div className="pt-3 border-t space-y-2">
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-md transition ${
                  isNativeStore
                    ? "bg-[#1E74C6] text-white hover:bg-[#1860A3]"
                    : "bg-[#700D22] text-white hover:bg-[#580B1C]"
                }`}
              >
                {isSubmitting ? "Submitting Order..." : `Confirm & Submit (${totalItemsCount} Units)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
