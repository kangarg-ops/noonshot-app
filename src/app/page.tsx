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
  const [loginStep, setLoginStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [devPreviewCode, setDevPreviewCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

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

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

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
        setLoginError("Your session has expired. Please verify your email with a new code.");
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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    setDevPreviewCode("");
    const email = loginInput.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      setLoginError("Please enter your official @noon.com email address.");
      return;
    }
    if (stores.length === 0) {
      setLoginError("Loading store data. Please try again in a few moments.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email }),
      });
      const data = await res.json();
      if (res.ok) {
        setLoginStep("OTP");
        setResendCountdown(60);
        if (data.devPreview) {
          setDevPreviewCode(data.devPreview);
        }
      } else {
        setLoginError(data.error || "Failed to send verification code");
      }
    } catch (err) {
      setLoginError("Network error. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    const email = loginInput.trim().toLowerCase();
    const code = otpCode.trim();

    if (code.length < 6) {
      setLoginError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("noon_user_email", data.email);
        localStorage.setItem("noon_session_expires_at", data.expiresAt.toString());
        setUserEmail(data.email);
        setLoginStep("EMAIL");
        setOtpCode("");
        setDevPreviewCode("");
      } else {
        setLoginError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setLoginError("Network error verifying code. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
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
    setLoginStep("EMAIL");
    setOtpCode("");
    setDevPreviewCode("");
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

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (!selectedStore) return false;
      if (it.item_type === "GENERAL") return true;
      if (isNative && it.item_type === "NATIVE_ONLY") return true;
      if (!isNative && it.item_type === "SHOT_ONLY") return true;
      return false;
    });
  }, [items, selectedStore, isNative]);

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

  const sections = useMemo(() => {
    const isIsiCharger = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const sku = (i.item_zsku || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      return (
        t.includes("charger") ||
        t.includes("isi ") ||
        t.startsWith("isi") ||
        b.includes("isi") ||
        sku.includes("charger") ||
        sku.includes("isi") ||
        t.includes("n2o") ||
        t.includes("whipper")
      );
    };

    const isMilk = (i: any) => {
      if (isIsiCharger(i)) return false;
      const t = (i.product_title || "").toLowerCase();
      if (
        t.includes("clean") || t.includes("everclean") || t.includes("ball") ||
        t.includes("liquid") || t.includes("cream") || t.includes("tablet") ||
        t.includes("descal") || t.includes("powder") || t.includes("syrup") || t.includes("sauce")
      ) return false;
      return t.includes("milk") || t.includes("oat") || t.includes("almond") || t.includes("dairy") || t.includes("soy");
    };

    const isBean = (i: any) => {
      if (isIsiCharger(i)) return false;
      const t = (i.product_title || "").toLowerCase();
      const cat = (i.category || "").toUpperCase();
      const b = (i.brand || "").toLowerCase();
      if (t.includes("cleaning") || t.includes("clean") || t.includes("cup") || t.includes("lid") || t.includes("straw") || t.includes("syrup") || t.includes("sauce")) return false;
      return (
        cat === "COFFEE_BEANS" ||
        isSubkoBean(i) ||
        b.includes("subko") ||
        t.includes("subko") ||
        t.includes("blend") ||
        t.includes("roast") ||
        t.includes("decaf") ||
        t.includes("coffee bean")
      );
    };

    const isDecaf = (i: any) => (i.product_title || "").toLowerCase().includes("decaf");

    const isUnbranded = (i: any) => {
      if (isIsiCharger(i)) return false;
      if (isBean(i) || isSubkoBean(i) || isMilk(i)) return false;
      const cat = (i.category || "").toUpperCase();
      if (cat === "COFFEE_BEANS" || cat === "INGREDIENTS" || cat === "MILK") return false;
      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();
      return t.includes("unbranded") || b.startsWith("UBNAT");
    };

    const isNativeBranded = (i: any) => {
      if (isIsiCharger(i)) return false;
      if (isBean(i) || isSubkoBean(i)) return false;
      if (isMilk(i)) return false;
      if (isUnbranded(i)) return false;

      const cat = (i.category || "").toUpperCase();
      if (cat === "COFFEE_BEANS" || cat === "INGREDIENTS" || cat === "MILK") return false;

      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();

      if (t.includes("bean") || t.includes("roast") || t.includes("subko") || t.includes("decaf") || t.includes("blend") || t.includes("charger") || t.includes("isi")) return false;

      const isPkgTitle =
        t.includes("cup") || t.includes("lid") || t.includes("straw") || t.includes("foil") ||
        t.includes("napkin") || t.includes("sugar") || t.includes("sweetener") || t.includes("stirrers") ||
        t.includes("sleeve") || t.includes("carrier") || t.includes("box") || (t.includes("bag") && !t.includes("coffee"));

      return (
        cat === "PACKAGING" ||
        b.startsWith("NAT") ||
        isPkgTitle ||
        ((i.item_type === "NATIVE_ONLY" || i.brand === "native") && isPkgTitle)
      );
    };

    if (isNative) {
      const subkoBeans = searchedItems.filter(i => isBean(i) && !isDecaf(i));
      const decafBeans = searchedItems.filter(i => isBean(i) && isDecaf(i));
      const beansIds = new Set(subkoBeans.concat(decafBeans).map(i => i.item_zsku));

      const brandedPkg = searchedItems.filter(i => !beansIds.has(i.item_zsku) && isNativeBranded(i));
      const unbrandedPkg = searchedItems.filter(i => !beansIds.has(i.item_zsku) && isUnbranded(i));
      const pkgIds = new Set(brandedPkg.concat(unbrandedPkg).map(i => i.item_zsku));

      const milks = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !pkgIds.has(i.item_zsku) && isMilk(i));
      const milksIds = new Set(milks.map(i => i.item_zsku));

      const ingredients = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !pkgIds.has(i.item_zsku) && !milksIds.has(i.item_zsku));

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
          desc: "All syrups, sauces, frappe mixes, ISI cream chargers, cleaning essentials & supplies.",
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
      const beansIds = new Set(beans.map(i => i.item_zsku));
      const milksIds = new Set(milks.map(i => i.item_zsku));
      const ingredients = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !milksIds.has(i.item_zsku));

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

  if (!userEmail) {
    return (
      <div className="min-h-screen flex flex-col justify-between py-12 px-4 bg-stone-50">
        <div className="max-w-md mx-auto w-full text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-1.5 rounded-full border border-stone-200 shadow-sm">
            <span className="font-black text-xs text-stone-900">noon CAFE OPS</span>
            <span className="text-stone-300">•</span>
            <span className="bg-[#1864AB] text-white text-[10px] font-black px-2 py-0.5 rounded-full">NATIVE × SUBKO</span>
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

          {loginStep === "EMAIL" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                <p className="text-[11px] text-stone-400 mt-1">We will send a 6-digit login verification code to this inbox.</p>

                {detectedStore && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-semibold mt-2.5 space-y-0.5">
                    <div className="text-[10px] font-black uppercase text-emerald-700">Verified Cafe Store:</div>
                    <div className="font-black text-stone-900 text-sm">{detectedStore.ds_name} ({detectedStore.ds_code})</div>
                    <div className="text-[11px] text-stone-600">Store Brand: <span className="font-bold">{detectedStore.store_type}</span> • Login Duration: <strong>7 Days (1 Week)</strong></div>
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
                disabled={isSendingOtp}
                className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm transition disabled:bg-stone-400"
              >
                {isSendingOtp ? "Sending Verification Code..." : "Send Verification Code →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-2xl text-xs space-y-1">
                <div className="font-black text-xs text-blue-950 uppercase tracking-wider">Verification Code Sent</div>
                <div className="text-[11px] text-blue-800">Check your inbox for a 6-digit code sent to:</div>
                <div className="font-mono font-bold text-stone-900 text-xs break-all">{loginInput}</div>
              </div>

              {devPreviewCode && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-2xl text-xs font-semibold space-y-1">
                  <div>🧪 <strong>Instant Testing Code:</strong> <span className="font-mono text-base font-black tracking-widest text-indigo-700">{devPreviewCode}</span></div>
                  <div className="text-[10px] text-amber-700 font-normal">Displayed directly for seamless testing before setting your RESEND_API_KEY.</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[10px] font-mono font-black text-2xl py-3 rounded-2xl border border-stone-300 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-[#1864AB] focus:outline-none"
                  autoFocus
                />
              </div>

              {loginError && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-xs font-medium">⚠️ {loginError}</div>}

              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm transition disabled:bg-stone-300"
              >
                {isVerifyingOtp ? "Verifying..." : "Verify Code & Sign In →"}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setLoginStep("EMAIL"); setOtpCode(""); setLoginError(""); }}
                  className="text-stone-500 hover:text-stone-900 font-bold"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  disabled={resendCountdown > 0 || isSendingOtp}
                  onClick={() => handleSendOtp()}
                  className={`font-bold ${resendCountdown > 0 ? 'text-stone-400 cursor-not-allowed' : 'text-[#1864AB] hover:underline'}`}
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>🔒 Store Replenishment System</span>
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
              <span className="text-white font-black text-sm tracking-wide">{isNative ? "NATIVE CAFE" : "CAFE OPERATIONS"}</span>
            </div>

            <div className="flex items-center space-x-2">
              {isAdminMode && (
                <a href="/admin" className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-2.5 py-1.5 rounded-xl shadow">
                  ⚙️ Admin
                </a>
              )}
              <button onClick={handleLogout} className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl">
                Logout
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/15">
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-black text-[10px] uppercase">{isNative ? "NATIVE STORE" : "SHOT STORE"}</span>
              <span className="font-extrabold text-sm truncate">📍 {selectedStore?.ds_name} ({selectedStore?.ds_code})</span>
              {!isAdminMode && !isSupervisor && <span className="bg-white/15 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">🔒 Locked</span>}
              {isSupervisor && <span className="bg-amber-300 text-stone-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">👁️ {supervisorTitle} (Testing Mode)</span>}
            </div>

            {(isAdminMode || isSupervisor) && stores.length > 0 && (
              <select
                value={selectedStore?.ds_code || ""}
                onChange={(e) => {
                  const s = stores.find(st => st.ds_code === e.target.value);
                  if (s) { setSelectedStore(s); setCart({}); }
                }}
                className="bg-white text-stone-900 font-bold text-xs rounded-lg px-2 py-1 outline-none"
              >
                {stores.map(s => <option key={s.ds_code} value={s.ds_code}>{s.ds_name} ({s.store_type})</option>)}
              </select>
            )}
          </div>

          <div className="relative pt-0.5">
            <input
              type="text"
              placeholder={`Search "${isNative ? 'subko, colombian decaf, oat milk, cups, sugars...' : 'coffee beans, oat milk, cups, syrups...'}"`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white text-stone-900 placeholder-stone-400 text-sm font-medium shadow-inner focus:outline-none"
            />
            <span className="absolute left-3.5 top-3 text-stone-400 text-sm">🔍</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-2.5 bg-stone-200 text-stone-700 w-6 h-6 rounded-full text-xs font-bold">
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SECTION FILTER BAR */}
      <div className="bg-white border-b border-stone-200 shadow-sm sticky top-[138px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedSection("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap ${
              selectedSection === "ALL" ? "bg-stone-900 text-white" : "bg-stone-100 hover:bg-stone-200 text-stone-700"
            }`}
          >
            All Sections
          </button>
          {sections.map(sec => (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap border ${
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-6">
        {/* BARISTA BANNER */}
        <div className={`rounded-3xl overflow-hidden shadow-lg border p-5 ${
          isNative ? 'bg-gradient-to-b from-[#FFF9EE] to-[#FFF3DC] border-sky-200' : 'bg-gradient-to-b from-[#FFF5F6] to-[#FFEBEF] border-rose-200'
        }`}>
          <div className="text-center space-y-1 mb-4">
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded tracking-widest uppercase ${
              isNative ? 'bg-[#FFF3DC] text-[#8C1826]' : 'bg-[#FFF000] text-black'
            }`}>
              {isNative ? "NATIVE × SUBKO QUALITY STANDARDS" : "SHOT BARISTA PROMISE"}
            </span>
            <h2 className={`text-xl sm:text-2xl font-black uppercase ${isNative ? 'text-[#8C1826]' : 'text-[#6B0B20]'}`}>
              {isNative ? "MADE BY HAND, SERVED WITH HEART" : "No Shortcuts • Fresh Preparation"}
            </h2>
            <p className="text-xs font-semibold text-stone-700 max-w-lg mx-auto">
              {isNative
                ? "Every Native cup represents our craft collaboration with Subko. Baristas must maintain precise dial-in parameters, spotless hygiene, and fresh preparation."
                : "Hand-poured by baristas for every single ticket. Follow BRM recipe measures, maintain spotless stations, and prepare beverages strictly on demand."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/90 p-3 rounded-2xl border border-stone-200 text-center space-y-1">
              <span className="text-xl">⚖️</span>
              <div className="text-xs font-black text-stone-900">Follow BRMs</div>
              <p className="text-[10px] text-stone-600">Accurate dry dose, recipe measures & extraction timing.</p>
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-stone-200 text-center space-y-1">
              <span className="text-xl">🧼</span>
              <div className="text-xs font-black text-stone-900">Station Hygiene</div>
              <p className="text-[10px] text-stone-600">Sanitized cloths, clean tamper base & wiped steam wands.</p>
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-stone-200 text-center space-y-1">
              <span className="text-xl">☕</span>
              <div className="text-xs font-black text-stone-900">Fresh Pulls</div>
              <p className="text-[10px] text-stone-600">Never serve expired shots. Pull fresh on ticket arrival.</p>
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-stone-200 text-center space-y-1">
              <span className="text-xl">📦</span>
              <div className="text-xs font-black text-stone-900">Spill-Proof</div>
              <p className="text-[10px] text-stone-600">Secure cup lids tightly for rapid 15-minute dispatch.</p>
            </div>
          </div>
        </div>

        {/* SECTIONS & ITEMS */}
        <div className="space-y-8">
          {sections
            .filter(sec => selectedSection === "ALL" || selectedSection === sec.id)
            .map(sec => {
              const totalSecCount = sec.items.length + (sec.subsections?.reduce((a, s) => a + s.items.length, 0) || 0);
              if (totalSecCount === 0 && searchQuery) return null;

              return (
                <section key={sec.id} className="space-y-4">
                  <div className="border-b border-stone-200 pb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-black text-stone-900 tracking-tight">{sec.title}</h3>
                      <span className="bg-stone-200 text-stone-700 text-xs font-black px-2 py-0.5 rounded-full">{totalSecCount}</span>
                    </div>
                    <span className="text-[11px] font-bold text-stone-500 uppercase">{sec.badge}</span>
                  </div>

                  {sec.items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sec.items.map(item => {
                        const qty = cart[item.item_zsku] || 0;
                        const isSubko = isSubkoBean(item);
                        const isNiche = isSubkoNiche(item);
                        const isOos = !item.in_stock || item.max_qty === 0;
                        const effectiveLimit = getItemEffectiveLimit(item);

                        return (
                          <div key={item.item_zsku} className={`bg-white rounded-2xl p-4 shadow-sm border flex flex-col justify-between space-y-3 ${
                            isOos ? 'border-red-200 bg-red-50/20' : 'border-stone-200'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.brand && <span className="bg-stone-100 text-stone-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">{item.brand.replace(/_/g, " ")}</span>}
                                {item.unit_size && item.unit_type && <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">{item.unit_size} {item.unit_type}</span>}
                                {item.max_qty === 0 && <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">Max: 0</span>}
                                {item.max_qty !== null && item.max_qty !== undefined && item.max_qty > 0 && !isSubko && (
                                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Max: {item.max_qty}</span>
                                )}
                                {isNiche && <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-md">Max: 1 / day (Monthly: 1–2)</span>}
                                {isSubko && !isNiche && <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md">Max: 1 / day</span>}
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOos ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>
                                {isOos ? "OUT OF STOCK" : "In Stock"}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className={`font-extrabold text-base leading-snug ${isOos ? 'text-stone-500' : 'text-stone-900'}`}>{item.product_title}</h4>
                              <div className="text-[11px] font-mono text-stone-500">SKU: {item.item_zsku} {item.barcode && `• Barcode: ${item.barcode}`}</div>
                            </div>

                            {isOos && (
                              <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium p-2 rounded-xl">
                                ⚠️ Currently Out of Stock (Limit: 0)
                              </div>
                            )}

                            <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
                              <span className="text-xs font-bold text-stone-500">Order Qty:</span>
                              {isOos ? (
                                <div className="px-3.5 py-1.5 rounded-full font-black text-xs bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed">
                                  OOS (Limit: 0)
                                </div>
                              ) : qty === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => updateCart(item.item_zsku, 1, item)}
                                  className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm ${
                                    isNative ? "bg-[#1864AB] text-white hover:bg-[#13508A]" : "bg-[#6B0B20] text-white hover:bg-[#520818]"
                                  }`}
                                >
                                  + ADD
                                </button>
                              ) : (
                                <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-full border border-stone-200">
                                  <button type="button" onClick={() => updateCart(item.item_zsku, qty - 1, item)} className="w-7 h-7 rounded-full bg-white text-stone-800 font-black text-sm flex items-center justify-center">–</button>
                                  <input
                                    type="number"
                                    min="0"
                                    max={effectiveLimit || undefined}
                                    value={qty}
                                    onChange={e => updateCart(item.item_zsku, parseInt(e.target.value) || 0, item)}
                                    className="w-12 text-center font-black text-sm bg-transparent outline-none"
                                  />
                                  <button type="button" onClick={() => updateCart(item.item_zsku, qty + 1, item)} className={`w-7 h-7 rounded-full text-white font-black text-sm flex items-center justify-center ${
                                    isNative ? "bg-[#1864AB]" : "bg-[#6B0B20]"
                                  }`}>+</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {sec.subsections && sec.subsections.map(sub => (
                    <div key={sub.id} className="pt-3 pl-2 sm:pl-4 border-l-2 border-amber-300 space-y-3 mt-4">
                      <div>
                        <h4 className="text-sm font-black text-[#8C1826] tracking-tight">{sub.title}</h4>
                        <p className="text-xs text-stone-500">{sub.desc}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sub.items.map(item => {
                          const qty = cart[item.item_zsku] || 0;
                          const isSubko = isSubkoBean(item);
                          const isNiche = isSubkoNiche(item);
                          const isOos = !item.in_stock || item.max_qty === 0;
                          const effectiveLimit = getItemEffectiveLimit(item);

                          return (
                            <div key={item.item_zsku} className={`bg-white rounded-2xl p-4 shadow-sm border flex flex-col justify-between space-y-3 ${
                              isOos ? 'border-red-200 bg-red-50/20' : 'border-stone-200'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.brand && <span className="bg-stone-100 text-stone-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">{item.brand.replace(/_/g, " ")}</span>}
                                  {item.unit_size && item.unit_type && <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">{item.unit_size} {item.unit_type}</span>}
                                  {item.max_qty === 0 && <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">Max: 0</span>}
                                  {item.max_qty !== null && item.max_qty !== undefined && item.max_qty > 0 && !isSubko && (
                                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Max: {item.max_qty}</span>
                                  )}
                                  {isNiche && <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-md">Max: 1 / day (Monthly: 1–2)</span>}
                                  {isSubko && !isNiche && <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md">Max: 1 / day</span>}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOos ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {isOos ? "OUT OF STOCK" : "In Stock"}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h4 className={`font-extrabold text-base leading-snug ${isOos ? 'text-stone-500' : 'text-stone-900'}`}>{item.product_title}</h4>
                                <div className="text-[11px] font-mono text-stone-500">SKU: {item.item_zsku} {item.barcode && `• Barcode: ${item.barcode}`}</div>
                              </div>

                              {isOos && (
                                <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium p-2 rounded-xl">
                                  ⚠️ Currently Out of Stock (Limit: 0)
                                </div>
                              )}

                              <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-500">Order Qty:</span>
                                {isOos ? (
                                  <div className="px-3.5 py-1.5 rounded-full font-black text-xs bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed">
                                    OOS (Limit: 0)
                                  </div>
                                ) : qty === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => updateCart(item.item_zsku, 1, item)}
                                    className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm ${
                                      isNative ? "bg-[#1864AB] text-white hover:bg-[#13508A]" : "bg-[#6B0B20] text-white hover:bg-[#520818]"
                                    }`}
                                  >
                                    + ADD
                                  </button>
                                ) : (
                                  <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-full border border-stone-200">
                                    <button type="button" onClick={() => updateCart(item.item_zsku, qty - 1, item)} className="w-7 h-7 rounded-full bg-white text-stone-800 font-black text-sm flex items-center justify-center">–</button>
                                    <input
                                      type="number"
                                      min="0"
                                      max={effectiveLimit || undefined}
                                      value={qty}
                                      onChange={e => updateCart(item.item_zsku, parseInt(e.target.value) || 0, item)}
                                      className="w-12 text-center font-black text-sm bg-transparent outline-none"
                                    />
                                    <button type="button" onClick={() => updateCart(item.item_zsku, qty + 1, item)} className={`w-7 h-7 rounded-full text-white font-black text-sm flex items-center justify-center ${
                                      isNative ? "bg-[#1864AB]" : "bg-[#6B0B20]"
                                    }`}>+</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
        </div>
      </main>

      {/* FLOATING BOTTOM ORDER BAR */}
      {totalUnits > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white border-t border-stone-200 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFF000] text-black font-black text-[11px] px-2 py-0.5 rounded-md">{totalUnits} Units</span>
                <span className="text-xs font-bold text-stone-700">({totalSkus} SKUs)</span>
              </div>
              <div className="text-xs font-black text-stone-900 truncate">Store: {selectedStore?.ds_name}</div>
            </div>

            <div className="flex items-center space-x-2">
              <button type="button" onClick={() => setIsOrderSummaryOpen(true)} className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-black px-3.5 py-3 rounded-2xl">
                View Cart
              </button>
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-2xl font-black text-sm shadow-lg disabled:opacity-50 text-white ${
                  isNative ? "bg-[#1864AB] hover:bg-[#13508A]" : "bg-[#6B0B20] hover:bg-[#520818]"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit Order →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER REVIEW MODAL */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl p-6 max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900">Review Replenishment Order</h3>
                <p className="text-xs text-stone-500">{selectedStore?.ds_name} ({selectedStore?.ds_code}) • {selectedStore?.store_type}</p>
              </div>
              <button onClick={() => setIsOrderSummaryOpen(false)} className="w-8 h-8 rounded-full bg-stone-100 font-bold flex items-center justify-center">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {Object.entries(cart)
                .filter(([_, qty]) => qty > 0)
                .map(([zsku, qty]) => {
                  const it = items.find(i => i.item_zsku === zsku);
                  return (
                    <div key={zsku} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-black text-stone-900 truncate">{it?.product_title || zsku}</div>
                        <div className="text-[10px] text-stone-400 font-mono">SKU: {zsku}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={it ? getItemEffectiveLimit(it) || undefined : undefined}
                          value={qty}
                          onChange={e => updateCart(zsku, parseInt(e.target.value) || 0, it)}
                          className="w-14 text-center font-black text-xs border rounded-lg py-1 bg-white"
                        />
                        <button onClick={() => updateCart(zsku, 0, it)} className="text-stone-400 hover:text-red-600 text-xs font-bold px-1">✕</button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t">
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-md text-white ${
                  isNative ? "bg-[#1864AB] hover:bg-[#13508A]" : "bg-[#6B0B20] hover:bg-[#520818]"
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
