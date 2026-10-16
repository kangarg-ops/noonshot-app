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

  useEffect(() => {
    if (!userEmail || stores.length === 0) return;
    const email = userEmail.trim().toLowerCase();
    const matched = stores.find(s => matchStoreByEmail(s, email));
    const isGlobal = (admins.includes(email) || email === "kangarg@noon.com") && !matched;

    if (matched) {
      // 🔒 STORE ACCOUNT: Strictly locked to their assigned store only!
      setSelectedStore(matched);
      setIsAdminMode(false);
    } else if (isGlobal) {
      // HQ ADMIN: Can switch between all stores
      setIsAdminMode(true);
      if (!selectedStore) setSelectedStore(stores[0]);
    } else {
      localStorage.removeItem("noon_user_email");
      setUserEmail("");
      setSelectedStore(null);
      setIsAdminMode(false);
      setLoginError("This email is not assigned to any cafe store. Please contact your manager.");
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
    if (stores.length === 0) {
      setLoginError("Loading store data. Please try again in a few moments.");
      return;
    }

    const matched = stores.find(s => matchStoreByEmail(s, email));
    const isGlobal = (admins.includes(email) || email === "kangarg@noon.com") && !matched;

    if (matched) {
      // 🔒 Strictly locked to their assigned store
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setIsAdminMode(false);
      setSelectedStore(matched);
    } else if (isGlobal) {
      // HQ Admin
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setIsAdminMode(true);
      setSelectedStore(stores[0]);
    } else {
      setLoginError(`Email "${email}" is not assigned to any cafe store. Please contact your manager.`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("noon_user_email");
    setUserEmail("");
    setSelectedStore(null);
    setCart({});
    setIsAdminMode(false);
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
    if (isSubkoNiche(item)) return 1; // 1 max per day (1 only, max 2/month)
    if (isSubkoBean(item)) return 1; // 1 max per day
    if (item.max_qty !== null && item.max_qty !== undefined && item.max_qty >= 0) return item.max_qty;
    return null;
  };

  const updateCart = (zsku: string, qty: number, item?: any) => {
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
    if (!selectedStore) return;

    // Security: Ensure order is placed strictly for the user's assigned store
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
      if (
        t.includes("clean") ||
        t.includes("everclean") ||
        t.includes("ball") ||
        t.includes("liquid") ||
        t.includes("cream") ||
        t.includes("tablet") ||
        t.includes("descal") ||
        t.includes("powder") ||
        t.includes("syrup") ||
        t.includes("sauce")
      ) {
        return false;
      }
      return t.includes("milk") || t.includes("oat") || t.includes("almond") || t.includes("dairy") || t.includes("soy");
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
      const beansAccounted = new Set([...subkoBeans.map(i => i.item_zsku), ...decafBeans.map(i => i.item_zsku)]);
      const pkgAccounted = new Set([...brandedPkg.map(i => i.item_zsku), ...unbrandedPkg.map(i => i.item_zsku)]);
      
      const milks = searchedItems.filter(i => !beansAccounted.has(i.item_zsku) && !pkgAccounted.has(i.item_zsku) && isMilk(i));

      const accounted = new Set([
        ...beansAccounted,
        ...pkgAccounted,
        ...milks.map(i => i.item_zsku),
      ]);
      const ingredients = searchedItems.filter(i => !accounted.has(i.item_zsku));

      return [
        {
          id: "NATIVE_COFFEE",
          title: "☕ Coffee Beans (SUBKO Speciality Coffee - NATIVE & NICHE)",
          badge: "SUBKO Collab",
          desc: "NATIVE Blend & NICHE Blend from SUBKO (Daily limit: 1 bag/day; Niche Blend: 1–2 bags max/month).",
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
          id: "NATIVE_MILKS",
          title: "🥛 Barista Milks",
          badge: "Dairy & Plant Milks",
          desc: "Oat milk, Almond milk & barista dairy / plant milk formulations.",
          items: milks,
          subsections: []
        },
        {
          id: "NATIVE_INGREDIENTS",
          title: "🍯 Ingredients & Essentials",
          badge: "Syrups & Essentials",
          desc: "All syrups, sauces, frappe mixes, cleaning essentials & supplies.",
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
          desc: "Oat milk, Almond milk & barista dairy / plant milk formulations.",
          items: milks,
          subsections: []
        },
        {
          id: "SHOT_INGREDIENTS",
          title: "🍯 Ingredients & Essentials",
          badge: "Syrups & Supplies",
          desc: "All syrups, sauces, frappe powders, coconut cream, chai, matcha, cleaning liquids & essentials.",
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
    const isSubko = isSubkoBean(item);
    const isNiche = isSubkoNiche(item);
    const isOos = !item.in_stock || item.max_qty === 0;
    const effectiveLimit = getItemEffectiveLimit(item);

    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border transition flex flex-col justify-between space-y-3 ${
        isOos ? 'border-red-200 bg-red-50/20' : 'border-stone-200'
      }`}>
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
            {item.max_qty === 0 && (
              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-300">
                Max: 0
              </span>
            )}
            {item.max_qty !== null && item.max_qty !== undefined && item.max_qty > 0 && !isSubko && (
              <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200">
                Max: {item.max_qty}
              </span>
            )}
            {isNiche && (
              <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-200">
                Max: 1 / day (Monthly: 1–2)
              </span>
            )}
            {isSubko && !isNiche && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-300">
                Max: 1 / day
              </span>
            )}
          </div>
          {isOos ? (
            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-rose-200">
              OUT OF STOCK
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              In Stock
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h4 className={`font-extrabold text-base leading-snug ${isOos ? 'text-stone-500' : 'text-stone-900'}`}>
            {item.product_title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono text-stone-500">
            <span>SKU: {item.item_zsku}</span>
            {item.barcode && <span>• Barcode: {item.barcode}</span>}
          </div>
        </div>

        {isOos && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium p-2.5 rounded-xl">
            {item.substitute_zsku ? (
              <>⚠️ O
