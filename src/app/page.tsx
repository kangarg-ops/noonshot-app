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
        } else if (it && isSubkoBean
