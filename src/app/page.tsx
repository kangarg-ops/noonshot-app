"use client";
import { useState, useEffect, useMemo } from "react";

const SUPERVISORS: Record<string, string> = {
  "ssantra@noon.com": "Instock Associate",
  "rusamuel@noon.com": "Assistant Manager, SHOT",
  "gbhamra@noon.com": "Senior Area Supervisor",
  "sursingh@noon.com": "Area Supervisor",
  "nadeekhan@noon.com": "Area Supervisor",
};

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
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [supervisorTitle, setSupervisorTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("noon_user_email");
    const expiryStr = localStorage.getItem("noon_session_expires_at");
    const expiry = expiryStr ? parseInt(expiryStr) : 0;

    if (saved && expiry) {
      if (Date.now() < expiry) {
        setUserEmail(saved.toLowerCase());
      } else {
        localStorage.removeItem("noon_user_email");
        localStorage.removeItem("noon_session_expires_at");
        setUserEmail("");
        setLoginError("Your session has expired. Please sign in again with your official email.");
      }
    } else if (saved) {
      setUserEmail(saved.toLowerCase());
    }

    fetch("/api/stores").then(r => r.json()).then(d => Array.isArray(d) && setStores(d));
    fetch("/api/items").then(r => r.json()).then(d => Array.isArray(d) && setItems(d));
    fetch("/api/admins").then(r => r.json()).then(d => Array.isArray(d) && setAdmins(d.map((a: any) => a.email.toLowerCase())));
  }, []);

  const matchStoreByEmail = (store: any, email: string) => {
    if (!store || !store.email || !email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const storeEmails = store.email.toLowerCase().split(/[,;\s]+/).map((e: string) => e.trim()).filter(Boolean);
    return storeEmails.includes(cleanEmail);
  };

  const detectedStore = useMemo(() => {
    if (!loginInput || stores.length === 0) return null;
    return stores.find(s => matchStoreByEmail(s, loginInput)) || null;
  }, [loginInput, stores]);

  const detectedSupervisor = useMemo(() => {
    if (!loginInput) return null;
    return SUPERVISORS[loginInput.trim().toLowerCase()] || null;
  }, [loginInput]);

  useEffect(() => {
    if (!userEmail || stores.length === 0) return;
    const email = userEmail.trim().toLowerCase();
    const matched = stores.find(s => matchStoreByEmail(s, email));
    const isGlobal = (admins.includes(email) || email === "kangarg@noon.com") && !matched;
    const supervisorRole = SUPERVISORS[email];

    if (matched) {
      setSelectedStore(matched);
      setIsAdminMode(false);
      setIsSupervisor(false);
      setSupervisorTitle("");
    } else if (isGlobal) {
      setIsAdminMode(true);
      setIsSupervisor(false);
      setSupervisorTitle("");
      if (!selectedStore) setSelectedStore(stores[0]);
    } else if (supervisorRole) {
      setIsAdminMode(false);
      setIsSupervisor(true);
      setSupervisorTitle(supervisorRole);
      if (!selectedStore) setSelectedStore(stores[0]);
    } else {
      localStorage.removeItem("noon_user_email");
      localStorage.removeItem("noon_session_expires_at");
      setUserEmail("");
      setSelectedStore(null);
      setIsAdminMode(false);
      setIsSupervisor(false);
      setSupervisorTitle("");
      setLoginError("This email is not assigned to any cafe store. Please contact your manager.");
    }
  }, [userEmail, stores, admins]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    const email = loginInput.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      setLoginError("Please enter your official @noon.com email address.");
      return;
    }
    if (stores.length === 0) {
      setLoginError("Loading store data. Please try again in a few moments.");
      return;
    }

    const matched = stores.find(s => matchStoreByEmail(s, email));
    const isGlobal = (admins.includes(email) || email === "kangarg@noon.com");
    const isSuper = !!SUPERVISORS[email];

    if (!matched && !isGlobal && !isSuper) {
      setLoginError(`Email "${email}" is not assigned to any cafe store or authorized account. Please contact your manager.`);
      return;
    }

    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem("noon_user_email", email);
    localStorage.setItem("noon_session_expires_at", expiresAt.toString());
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("noon_user_email");
    localStorage.removeItem("noon_session_expires_at");
    setUserEmail("");
    setSelectedStore(null);
    setCart({});
    setIsAdminMode(false);
    setIsSupervisor(false);
    setSupervisorTitle("");
    setLoginInput("");
    setLoginError("");
  };

  const isSubkoBean = (item: any) => {
    if (!item) return false;
    const t = (item.product_title || "").toLowerCase();
    const b = (item.brand || "").toLowerCase();
    return t.includes("subko") || b.includes("subko") || t.includes("native blend") || t.includes("niche blend");
  };

  const isSubkoNiche = (item: any) => {
    if (!item) return false;
    const t = (item.product_title || "").toLowerCase();
    return isSubkoBean(item) && t.includes("niche");
  };

  const getItemEffectiveLimit = (item: any) => {
    if (!item) return null;
    if (!item.in_stock || item.max_qty === 0) return 0;
    if (isSubkoNiche(item)) return 1;
    if (isSubkoBean(item)) return 1;
    if (item.max_qty !== null && item.max_qty !== undefined && item.max_qty >= 0) return item.max_qty;
    return null;
  };

  const updateCart = (zsku: string, qty: number, item?: any) => {
    if (isSupervisor) {
      alert("👀 Supervisor accounts have View-Only inspection permissions. Ordering is disabled.");
      return;
    }
    const it = item || items.find(i => i.item_zsku === zsku);
    const limit = it ? getItemEffectiveLimit(it) : null;
    const finalQty = Math.max(0, isNaN(qty) ? 0 : qty);

    if (limit !== null) {
      if (limit === 0 && finalQty > 0) {
        alert("This item is currently Out of Stock (Order limit is set to 0).");
        return;
      }
      if (finalQty > limit) {
        if (it && isSubkoNiche(it)) {
          alert("SUBKO Niche Blend allocation: Maximum 1 unit per day per store (Monthly allocation: 1-2 units max).");
        } else if (it && isSubkoBean(it)) {
          alert("SUBKO Speciality Coffee limit: Maximum 1 unit per day per store.");
        } else {
          alert(`Maximum order limit for this item is ${limit}`);
        }
        return;
      }
    }
    setCart(prev => ({ ...prev, [zsku]: finalQty }));
  };

  const submitOrder = async () => {
    if (isSupervisor) {
      alert("👀 Supervisor accounts have View-Only inspection permissions. Ordering is disabled.");
      return;
    }
    if (!selectedStore) return;
    const email = userEmail.trim().toLowerCase();
    const matched = stores.find(s => matchStoreByEmail(s, email));
    const storeToOrder = matched || selectedStore;
    if (!storeToOrder) return;

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
        body: JSON.stringify({ ds_code: storeToOrder.ds_code, items: orderItems }),
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

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }, [cart]);

  // CATEGORY & BRAND FILTER LOGIC
  const { coffeeBeans, baristaMilks, unbrandedItems, packagingItems } = useMemo(() => {
    const isBean = (i: any) => {
      const cat = (i.category || "").toUpperCase();
      const t = (i.product_title || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      return (
        cat === "COFFEE_BEANS" ||
        t.includes("blend") ||
        t.includes("single origin") ||
        t.includes("roast") ||
        t.includes("beans") ||
        b.includes("subko") ||
        t.includes("subko") ||
        t.includes("ethiopian") ||
        t.includes("colombian")
      );
    };

    const isMilk = (i: any) => {
      const cat = (i.category || "").toUpperCase();
      const t = (i.product_title || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      return (
        cat === "MILK" ||
        t.includes("milk") ||
        t.includes("oat") ||
        t.includes("almond") ||
        t.includes("coconut") ||
        t.includes("soya") ||
        t.includes("dairy") ||
        b.includes("alpro") ||
        b.includes("oatly") ||
        b.includes("lacnor") ||
        b.includes("almarai") ||
        b.includes("alpro barista")
      );
    };

    const isIsiCharger = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      return t.includes("isi") || t.includes("cream charger") || b.includes("isi");
    };

    const isPackaging = (i: any) => {
      if (isIsiCharger(i)) return true;
      const cat = (i.category || "").toUpperCase();
      if (cat === "PACKAGING") return true;
      const t = (i.product_title || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      return (
        t.includes("cup") ||
        t.includes("lid") ||
        t.includes("straw") ||
        t.includes("bag") ||
        t.includes("carrier") ||
        t.includes("napkin") ||
        t.includes("tissue") ||
        t.includes("sleeve") ||
        t.includes("box") ||
        t.includes("sugar") ||
        t.includes("charger") ||
        b.includes("native packaging") ||
        b.includes("shot packaging")
      );
    };

    const isUnbranded = (i: any) => {
      if (isIsiCharger(i)) return false;
      if (isBean(i) || isSubkoBean(i) || isMilk(i)) return false;
      const cat = (i.category || "").toUpperCase();
      if (cat === "COFFEE_BEANS" || cat === "INGREDIENTS" || cat === "MILK") return false;
      const t = (i.product_title || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      const subkoOrShotWords = ["shot", "subko", "native", "blend", "single origin", "cup", "lid", "straw", "sleeve", "bag"];
      const hasBrandIndicator = subkoOrShotWords.some(w => t.includes(w) || b.includes(w));
      return !hasBrandIndicator;
    };

    // Filter by Brand / Store Isolation
    const brandFiltered = items.filter(i => {
      const title = (i.product_title || "").toLowerCase();
      const brand = (i.brand || "").toLowerCase();

      if (isNative) {
        if (title.includes("shot cup") || title.includes("shot packaging") || brand.includes("shot")) {
          return false;
        }
        if (
          title.includes("noon minutes") ||
          title.includes("ethiopian medium") ||
          (title.includes("roast") && !title.includes("subko") && !title.includes("native"))
        ) {
          return false;
        }
        return true;
      } else {
        if (isSubkoBean(i) || title.includes("subko") || brand.includes("subko")) {
          return false;
        }
        if (title.includes("native") || brand.includes("native")) {
          return false;
        }
        return true;
      }
    });

    const beans: any[] = [];
    const milks: any[] = [];
    const unbranded: any[] = [];
    const packaging: any[] = [];

    brandFiltered.forEach(i => {
      if (isIsiCharger(i)) {
        packaging.push(i);
      } else if (isBean(i) || isSubkoBean(i)) {
        beans.push(i);
      } else if (isMilk(i)) {
        milks.push(i);
      } else if (isPackaging(i)) {
        packaging.push(i);
      } else if (isUnbranded(i)) {
        unbranded.push(i);
      } else {
        unbranded.push(i);
      }
    });

    return {
      coffeeBeans: beans,
      baristaMilks: milks,
      unbrandedItems: unbranded,
      packagingItems: packaging,
    };
  }, [items, isNative]);

  const searchFilter = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i =>
      (i.product_title || "").toLowerCase().includes(q) ||
      (i.item_zsku || "").toLowerCase().includes(q) ||
      (i.brand || "").toLowerCase().includes(q)
    );
  };

  const filteredBeans = useMemo(() => searchFilter(coffeeBeans), [coffeeBeans, searchQuery]);
  const filteredMilks = useMemo(() => searchFilter(baristaMilks), [baristaMilks, searchQuery]);
  const filteredUnbranded = useMemo(() => searchFilter(unbrandedItems), [unbrandedItems, searchQuery]);
  const filteredPackaging = useMemo(() => searchFilter(packagingItems), [packagingItems, searchQuery]);

  // LOGIN SCREEN
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="max-w-md mx-auto w-full text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-stone-900 text-white px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase">
            <span>noon Speciality Coffee</span>
            <span className="text-stone-400">•</span>
            <span className="bg-[#1864AB] text-white text-[10px] font-black px-2 py-0.5 rounded-full">NATIVE</span>
            <span className="bg-[#6B0B20] text-white text-[10px] font-black px-2 py-0.5 rounded-full">SHOT</span>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center border border-amber-200">
              <span className="text-3xl">☕</span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Barista Ordering Portal</h1>
            <p className="text-xs text-stone-500 font-medium">Official stock replenishment & recipe compliance system.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Official @noon.com Email ID</label>
              <input
                type="email"
                placeholder="cafe-Downtown@noon.com"
                required
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 text-sm font-medium bg-stone-50 focus:bg-white focus:ring-2 focus:ring-[#1864AB] focus:outline-none"
              />
              <p className="text-[11px] text-stone-400 mt-1">Enter your store or authorized account email to proceed.</p>

              {detectedStore && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-semibold mt-2.5 space-y-0.5">
                  <div className="text-[10px] font-black uppercase text-emerald-700">Verified Cafe Store:</div>
                  <div className="font-black text-stone-900 text-sm">{detectedStore.ds_name} ({detectedStore.ds_code})</div>
                  <div className="text-[11px] text-stone-600">Store Brand: <span className="font-bold">{detectedStore.store_type}</span> • Login Duration: <strong>30 Days (1 Month)</strong></div>
                </div>
              )}

              {detectedSupervisor && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs font-semibold mt-2.5 space-y-0.5">
                  <div className="text-[10px] font-black uppercase text-amber-700">Verified Supervisor:</div>
                  <div className="font-black text-stone-900 text-sm">{detectedSupervisor}</div>
                  <div className="text-[11px] text-stone-600">Access: <span className="font-bold">Catalog Exploration & Testing Responses</span> • Login Duration: <strong>30 Days (1 Month)</strong></div>
                </div>
              )}
            </div>

            {loginError && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-xs font-medium">⚠️ {loginError}</div>}

            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm transition shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              Enter Portal →
            </button>
          </form>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <button
              type="button"
              onClick={() => setIsSopOpen(true)}
              className="font-bold text-[#1864AB] hover:underline flex items-center space-x-1"
            >
              <span>📖</span>
              <span>Barista SOP</span>
            </button>
            <a href="/admin" className="font-bold text-stone-800 hover:text-[#1864AB]">Admin Dashboard ⚙️</a>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full text-center text-xs text-stone-400">noon Speciality Coffee Operations • UAE Cafes</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-32 ${isNative ? 'bg-sky-50/40' : 'bg-stone-50'}`}>
      {/* HEADER */}
      <header className={`sticky top-0 z-30 transition-colors shadow-md ${isNative ? "bg-[#1864AB] text-white" : "bg-[#6B0B20] text-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <span className={`text-xs font-black tracking-widest uppercase ${isNative ? 'text-amber-200' : 'text-[#FFF000]'}`}>
                {isNative ? "SUBKO COLLAB" : "SHOT"}
              </span>
              <span className="text-white/40">|</span>
              <span className="text-xs font-bold tracking-tight">
                {isNative ? "NATIVE CAFE" : "SHOT CAFE"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsSopOpen(true)}
                className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-1.5 rounded-full border border-white/20 flex items-center space-x-1.5 transition"
              >
                <span>📖</span>
                <span className="hidden sm:inline">Barista SOP</span>
              </button>

              {isAdminMode && (
                <a
                  href="/admin"
                  className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-1.5 rounded-full border border-white/20 transition flex items-center space-x-1"
                >
                  <span>⚙️</span>
                  <span>Admin</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full border border-white/15 transition"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/10">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight">{selectedStore?.ds_name || "Cafe Store"}</span>
                <span className="text-xs bg-black/30 text-white font-mono px-2 py-0.5 rounded-md font-semibold">{selectedStore?.ds_code}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isNative ? 'bg-amber-300 text-amber-950' : 'bg-rose-200 text-rose-950'}`}>
                  {selectedStore?.store_type} BRAND
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-medium">Logged in as: <span className="font-mono">{userEmail}</span></p>
            </div>

            {isAdminMode && (
              <div className="flex items-center space-x-2 bg-black/25 px-3 py-1.5 rounded-xl border border-white/15">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200">Admin Store Switch:</span>
                <select
                  value={selectedStore?.ds_code || ""}
                  onChange={e => {
                    const found = stores.find(s => s.ds_code === e.target.value);
                    if (found) setSelectedStore(found);
                  }}
                  className="bg-white text-stone-900 text-xs font-bold rounded-lg px-2.5 py-1 border-0 focus:ring-2 focus:ring-amber-300"
                >
                  {stores.map(s => (
                    <option key={s.ds_code} value={s.ds_code}>
                      {s.ds_name} ({s.store_type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SUPERVISOR VIEW-ONLY BANNER */}
      {isSupervisor && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">👀</span>
            <span>
              <strong>Supervisor Mode ({supervisorTitle}):</strong> You are in View-Only inspection mode. You can test and inspect catalogs across branches. Placing replenishment orders is disabled.
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[11px] font-bold text-amber-800 uppercase">Viewing Branch:</span>
            <select
              value={selectedStore?.ds_code || ""}
              onChange={e => {
                const found = stores.find(s => s.ds_code === e.target.value);
                if (found) setSelectedStore(found);
              }}
              className="bg-white text-stone-900 text-xs font-bold rounded-md px-2 py-1 border border-amber-300"
            >
              {stores.map(s => (
                <option key={s.ds_code} value={s.ds_code}>
                  {s.ds_name} ({s.store_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* SEARCH & CATEGORY FILTER TABS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search beans, milks, syrups, cups, packaging by title, brand, or SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-stone-200 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1864AB] text-stone-900 font-medium"
          />
          <span className="absolute left-4 top-3.5 text-stone-400 text-base">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600 text-xs bg-stone-100 rounded-full px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "All Items", icon: "📦", count: coffeeBeans.length + baristaMilks.length + unbrandedItems.length + packagingItems.length },
            { id: "BEANS", label: isNative ? "Subko Specialty Beans" : "Coffee Beans", icon: "☕", count: coffeeBeans.length },
            { id: "MILKS", label: "Barista Milks", icon: "🥛", count: baristaMilks.length },
            { id: "UNBRANDED", label: "Ingredients & Syrups", icon: "🍯", count: unbrandedItems.length },
            { id: "PACKAGING", label: isNative ? "Native Packaging" : "Packaging & Supplies", icon: "🥡", count: packagingItems.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedSection(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                selectedSection === tab.id
                  ? (isNative ? "bg-[#1864AB] text-white shadow-sm" : "bg-[#6B0B20] text-white shadow-sm")
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedSection === tab.id ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CATALOG CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-8">
        {/* SECTION: COFFEE BEANS */}
        {(selectedSection === "ALL" || selectedSection === "BEANS") && filteredBeans.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">☕</span>
                <h2 className="text-base font-black text-stone-900 tracking-tight">
                  {isNative ? "SUBKO Specialty Beans (Native & Niche)" : "Signature Coffee Beans"}
                </h2>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredBeans.length} Products
                </span>
              </div>
              {isNative && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                  ⚖️ Strictly 1 unit / day per store
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBeans.map(item => (
                <ItemCard
                  key={item.item_zsku}
                  item={item}
                  qty={cart[item.item_zsku] || 0}
                  onUpdateQty={qty => updateCart(item.item_zsku, qty, item)}
                  isSubkoBean={isSubkoBean(item)}
                  isSubkoNiche={isSubkoNiche(item)}
                  limit={getItemEffectiveLimit(item)}
                  isNative={isNative}
                  isSupervisor={isSupervisor}
                />
              ))}
            </div>
          </section>
        )}

        {/* SECTION: BARISTA MILKS */}
        {(selectedSection === "ALL" || selectedSection === "MILKS") && filteredMilks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🥛</span>
                <h2 className="text-base font-black text-stone-900 tracking-tight">Barista Milks (Dairy & Plant-Based)</h2>
                <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredMilks.length} Products
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMilks.map(item => (
                <ItemCard
                  key={item.item_zsku}
                  item={item}
                  qty={cart[item.item_zsku] || 0}
                  onUpdateQty={qty => updateCart(item.item_zsku, qty, item)}
                  isSubkoBean={false}
                  isSubkoNiche={false}
                  limit={getItemEffectiveLimit(item)}
                  isNative={isNative}
                  isSupervisor={isSupervisor}
                />
              ))}
            </div>
          </section>
        )}

        {/* SECTION: INGREDIENTS & SYRUPS (UNBRANDED) */}
        {(selectedSection === "ALL" || selectedSection === "UNBRANDED") && filteredUnbranded.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🍯</span>
                <h2 className="text-base font-black text-stone-900 tracking-tight">Syrups, Sauces & General Ingredients</h2>
                <span className="bg-stone-100 text-stone-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredUnbranded.length} Products
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredUnbranded.map(item => (
                <ItemCard
                  key={item.item_zsku}
                  item={item}
                  qty={cart[item.item_zsku] || 0}
                  onUpdateQty={qty => updateCart(item.item_zsku, qty, item)}
                  isSubkoBean={false}
                  isSubkoNiche={false}
                  limit={getItemEffectiveLimit(item)}
                  isNative={isNative}
                  isSupervisor={isSupervisor}
                />
              ))}
            </div>
          </section>
        )}

        {/* SECTION: PACKAGING & SUPPLIES */}
        {(selectedSection === "ALL" || selectedSection === "PACKAGING") && filteredPackaging.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🥡</span>
                <h2 className="text-base font-black text-stone-900 tracking-tight">
                  {isNative ? "NATIVE Branded Cups, Lids & Packaging" : "SHOT Branded Packaging & Disposables"}
                </h2>
                <span className="bg-stone-100 text-stone-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredPackaging.length} Products
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPackaging.map(item => (
                <ItemCard
                  key={item.item_zsku}
                  item={item}
                  qty={cart[item.item_zsku] || 0}
                  onUpdateQty={qty => updateCart(item.item_zsku, qty, item)}
                  isSubkoBean={false}
                  isSubkoNiche={false}
                  limit={getItemEffectiveLimit(item)}
                  isNative={isNative}
                  isSupervisor={isSupervisor}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* STICKY BOTTOM ORDER BAR */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-stone-500 font-medium">Daily Replenishment Order</div>
              <div className="text-base font-black text-stone-900">
                {totalCartCount} {totalCartCount === 1 ? "unit" : "units"} selected
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setCart({})}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 px-3 py-2"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setIsOrderSummaryOpen(true)}
                className={`font-black text-xs sm:text-sm px-6 py-3 rounded-2xl text-white shadow-lg transition active:scale-95 ${
                  isNative ? "bg-[#1864AB] hover:bg-[#134e85]" : "bg-[#6B0B20] hover:bg-[#4d0717]"
                }`}
              >
                Review Order ({totalCartCount}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER SUMMARY MODAL */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className={`p-4 text-white flex items-center justify-between shrink-0 ${isNative ? "bg-[#1864AB]" : "bg-[#6B0B20]"}`}>
              <div>
                <h3 className="font-black text-base">Confirm Daily Replenishment</h3>
                <p className="text-xs text-white/80">{selectedStore?.ds_name} ({selectedStore?.ds_code})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderSummaryOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.entries(cart).filter(([_, q]) => q > 0).map(([sku, q]) => {
                const it = items.find(i => i.item_zsku === sku);
                return (
                  <div key={sku} className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-200">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="font-bold text-xs text-stone-900 truncate">{it?.product_title || sku}</div>
                      <div className="text-[11px] text-stone-400 font-mono">{sku} • {it?.brand || "Brand"}</div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => updateCart(sku, q - 1, it)}
                        className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-bold text-xs text-stone-700"
                      >
                        -
                      </button>
                      <span className="font-black text-sm text-stone-900 w-6 text-center">{q}</span>
                      <button
                        onClick={() => updateCart(sku, q + 1, it)}
                        className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-bold text-xs text-stone-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs text-stone-600 font-semibold">
                <span>Cut-off Deadline</span>
                <span className="text-stone-900 font-black">6:30 PM UAE Time</span>
              </div>
              <button
                type="button"
                disabled={isSubmitting || totalCartCount === 0}
                onClick={submitOrder}
                className={`w-full py-3.5 rounded-2xl font-black text-sm text-white shadow-md transition disabled:bg-stone-300 ${
                  isNative ? "bg-[#1864AB] hover:bg-[#134e85]" : "bg-[#6B0B20] hover:bg-[#4d0717]"
                }`}
              >
                {isSubmitting ? "Submitting..." : `Confirm & Place Order (${totalCartCount} Units)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARISTA SOP MODAL */}
      {isSopOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="bg-[#1864AB] text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-0.5">Official Operations Standard</div>
                <h3 className="font-black text-lg">Barista Portal SOP & Replenishment Manual</h3>
                <p className="text-xs text-blue-100">Step-by-step instructions for daily stock replenishment & recipe compliance.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSopOpen(false)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-stone-800 text-xs sm:text-sm">
              {/* Timeline Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] font-black text-blue-800 uppercase">Step 1: Store Login</div>
                  <div className="text-xs text-stone-700">Enter <code className="bg-white px-1 py-0.5 rounded text-[11px]">cafe-*@noon.com</code> and click Enter Portal.</div>
                  <div className="text-[10px] text-emerald-700 font-bold">🔒 Logged in for 30 days (1 Month)</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] font-black text-blue-800 uppercase">Step 2: Check Store</div>
                  <div className="text-xs text-stone-700">Verify your Store Name, DS Code, and Brand (NATIVE vs SHOT).</div>
                  <div className="text-[10px] text-blue-700 font-bold">📍 Locked to your branch</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] font-black text-blue-800 uppercase">Step 3: Browse Items</div>
                  <div className="text-xs text-stone-700">Filter by category (Beans, Milks, Ingredients, Packaging) or search.</div>
                  <div className="text-[10px] text-purple-700 font-bold">🔍 Instant search bar</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] font-black text-amber-800 uppercase">Step 4: Subko Limit</div>
                  <div className="text-xs text-stone-700">SUBKO Native & Niche Specialty Beans: maximum <strong>1 bag / day</strong> per store.</div>
                  <div className="text-[10px] text-amber-800 font-bold">⚖️ Automatic system limit</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] font-black text-rose-800 uppercase">Step 5: Out of Stock</div>
                  <div className="text-xs text-stone-700">OOS / Limit 0 items cannot be ordered. Backup items routed automatically.</div>
                  <div className="text-[10px] text-rose-700 font-bold">🚫 Gray button: OOS (Limit: 0)</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] font-black text-emerald-800 uppercase">Step 6: Submit Order</div>
                  <div className="text-xs text-stone-700">Submit anytime. Orders placed before <strong>6:30 PM UAE Time</strong> are dispatched next morning.</div>
                  <div className="text-[10px] text-emerald-700 font-bold">⏰ Strict 6:30 PM UAE Cut-off</div>
                </div>
              </div>

              {/* Brand Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#1864AB] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">NATIVE CAFE</span>
                    <span className="text-xs font-bold text-sky-800">SUBKO Specialty Collab</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Dedicated craft menu using SUBKO beans (Native & Niche), decaf Colombian beans, and official NATIVE branded packaging (cups, lids, sugars).
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#6B0B20] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">SHOT CAFE</span>
                    <span className="text-xs font-bold text-rose-800">Express Barista Concept</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    High-volume 15-minute dispatch using 3 signature roasts (Noon Minutes, Ethiopian Medium, Decaf), syrups, and SHOT branded supplies.
                  </p>
                </div>
              </div>

              {/* Do's & Don'ts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <div className="text-emerald-900 font-black text-xs uppercase flex items-center gap-1.5">
                    <span>✅</span> Barista Best Practices
                  </div>
                  <ul className="text-xs text-stone-700 space-y-1 list-disc pl-4">
                    <li>Count physically on-hand stock before ordering.</li>
                    <li>You can submit orders <strong>anytime during the day as per UAE time</strong> (cut-off: <strong>6:30 PM UAE Time</strong>).</li>
                    <li>Keep a 2-day buffer for packaging and cups.</li>
                    <li>If shift updates an order, the system automatically takes the highest quantity.</li>
                  </ul>
                </div>
                <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl space-y-2">
                  <div className="text-rose-900 font-black text-xs uppercase flex items-center gap-1.5">
                    <span>❌</span> Important Restrictions
                  </div>
                  <ul className="text-xs text-stone-700 space-y-1 list-disc pl-4">
                    <li>Never attempt to log in using another store's email.</li>
                    <li>Orders placed after 6:30 PM UAE time will automatically be considered for next-day processing only.</li>
                    <li>Ensure store emails are only accessed by authorized cafe baristas.</li>
                    <li>Do not order more than 1 unit of Subko specialty beans per day.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-stone-50 p-4 border-t border-stone-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-stone-500 font-medium">noon Speciality Coffee Operations • UAE Cafes</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-xs px-3 py-2 rounded-xl"
                >
                  🖨️ Print SOP Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setIsSopOpen(false)}
                  className="bg-stone-900 hover:bg-black text-white font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  qty,
  onUpdateQty,
  isSubkoBean,
  isSubkoNiche,
  limit,
  isNative,
  isSupervisor,
}: {
  item: any;
  qty: number;
  onUpdateQty: (q: number) => void;
  isSubkoBean: boolean;
  isSubkoNiche: boolean;
  limit: number | null;
  isNative: boolean;
  isSupervisor: boolean;
}) {
  const isOutOfStock = !item.in_stock || limit === 0;

  return (
    <div className={`bg-white rounded-3xl p-4 border transition flex flex-col justify-between shadow-sm hover:shadow-md ${
      isOutOfStock ? "opacity-60 border-stone-200" : "border-stone-200"
    }`}>
      <div className="space-y-2.5">
        {/* Badges */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 font-mono">
            {item.item_zsku}
          </span>

          <div className="flex items-center space-x-1 shrink-0">
            {isSubkoNiche && (
              <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                NICHE BLEND
              </span>
            )}
            {isSubkoBean && !isSubkoNiche && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                SUBKO SPECIALTY
              </span>
            )}
            {isOutOfStock ? (
              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                OUT OF STOCK
              </span>
            ) : limit !== null ? (
              <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Limit: {limit}
              </span>
            ) : null}
          </div>
        </div>

        {/* Image preview */}
        {item.image_url ? (
          <div className="h-32 w-full bg-stone-50 rounded-2xl flex items-center justify-center overflow-hidden border border-stone-100">
            <img src={item.image_url} alt={item.product_title} className="h-full w-full object-contain p-2" />
          </div>
        ) : (
          <div className="h-24 w-full bg-stone-50 rounded-2xl flex items-center justify-center text-stone-300 font-bold text-xs border border-stone-100">
            No Image
          </div>
        )}

        {/* Item Info */}
        <div>
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{item.brand || "Standard"}</div>
          <h3 className="font-bold text-sm text-stone-900 leading-snug line-clamp-2">{item.product_title}</h3>
          {(item.unit_size || item.unit_type) && (
            <div className="text-[11px] text-stone-500 font-medium mt-0.5">
              Unit: {item.unit_size} {item.unit_type}
            </div>
          )}
        </div>
      </div>

      {/* Action / Quantity Controls */}
      <div className="pt-4 mt-2 border-t border-stone-100">
        {isOutOfStock ? (
          <button
            disabled
            className="w-full bg-stone-200 text-stone-400 text-xs font-bold py-2.5 rounded-xl cursor-not-allowed"
          >
            Out of Stock
          </button>
        ) : isSupervisor ? (
          <div className="w-full bg-amber-50 text-amber-800 text-center text-[11px] font-bold py-2 rounded-xl border border-amber-200">
            Inspection Mode (View Only)
          </div>
        ) : qty > 0 ? (
          <div className="flex items-center justify-between bg-stone-50 p-1 rounded-2xl border border-stone-200">
            <button
              onClick={() => onUpdateQty(qty - 1)}
              className="w-9 h-9 rounded-xl bg-white border border-stone-300 text-stone-800 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
            >
              -
            </button>
            <span className="font-black text-stone-900 text-sm px-2">{qty}</span>
            <button
              onClick={() => onUpdateQty(qty + 1)}
              className="w-9 h-9 rounded-xl bg-white border border-stone-300 text-stone-800 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => onUpdateQty(1)}
            className={`w-full py-2.5 rounded-2xl text-xs font-black text-white transition active:scale-95 shadow-sm ${
              isNative ? "bg-[#1864AB] hover:bg-[#134e85]" : "bg-[#6B0B20] hover:bg-[#4d0717]"
            }`}
          >
            + Add to Order
          </button>
        )}
      </div>
    </div>
  );
}
