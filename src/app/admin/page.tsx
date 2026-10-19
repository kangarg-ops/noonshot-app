"use client";
import { useState, useEffect } from "react";

export default function AdminPortal() {
  const [cutoffTime, setCutoffTime] = useState("19:00");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Auth / Admin protection
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [adminList, setAdminList] = useState<string[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [timeZoneDisplay, setTimeZoneDisplay] = useState("IST (Indian Standard Time)");

  // Store form states
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeType, setStoreType] = useState("SHOT");
  const [storeSearch, setStoreSearch] = useState("");
  
  // Item form states
  const [itemZsku, setItemZsku] = useState("");
  const [itemBarcode, setItemBarcode] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemBrand, setItemBrand] = useState("");
  const [itemUnitSize, setItemUnitSize] = useState("");
  const [itemUnitType, setItemUnitType] = useState("ml");
  const [itemSub, setItemSub] = useState("");
  const [itemType, setItemType] = useState("GENERAL");
  const [itemCategory, setItemCategory] = useState("INGREDIENTS");
  const [itemMaxQty, setItemMaxQty] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);

  const loadAdmins = async () => {
    try {
      const res = await fetch("/api/admins");
      const data = await res.json();
      if (Array.isArray(data)) {
        const emails = data.map((a: any) => a.email.toLowerCase());
        setAdminList(emails);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = () => {
    fetch("/api/stores").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setStores(data);
    });
    fetch("/api/items").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setItems(data);
    });
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data && data.cutoffTime) setCutoffTime(data.cutoffTime);
    });
    loadAdmins();
  };

  useEffect(() => {
    const saved = localStorage.getItem("noon_user_email") || "";
    setCurrentUserEmail(saved.toLowerCase());
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") {
        setTimeZoneDisplay("IST (Indian Standard Time)");
      } else if (tz === "Asia/Dubai") {
        setTimeZoneDisplay("GST (Gulf Standard Time - UAE)");
      } else {
        const short = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ')[2] || tz;
        setTimeZoneDisplay(`${short} (${tz})`);
      }
    } catch (e) {}
    loadData();
    setAuthChecked(true);
  }, []);

  const isSuperAdmin = currentUserEmail === "kangarg@noon.com";
  const isAdmin = isSuperAdmin || adminList.includes(currentUserEmail);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = loginEmailInput.trim().toLowerCase();
    if (!clean.endsWith("@noon.com")) {
      alert("Please enter a valid @noon.com email");
      return;
    }
    if (clean === "kangarg@noon.com" || adminList.includes(clean)) {
      localStorage.setItem("noon_user_email", clean);
      setCurrentUserEmail(clean);
    } else {
      alert(`Access Denied: ${clean} is not an authorized Admin. Contact kangarg@noon.com for access.`);
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminEmail.trim().toLowerCase();
    if (!clean.endsWith("@noon.com")) {
      alert("Must be an @noon.com email");
      return;
    }
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      if (res.ok) {
        alert(`Admin ${clean} added!`);
        setNewAdminEmail("");
        loadAdmins();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add admin");
      }
    } catch (e) {
      alert("Error adding admin");
    }
  };

  const removeAdmin = async (email: string) => {
    if (!confirm(`Revoke admin access for ${email}?`)) return;
    try {
      const res = await fetch(`/api/admins?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert(`Admin ${email} removed`);
        loadAdmins();
      }
    } catch (e) {
      alert("Error removing admin");
    }
  };

  const saveCutoff = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffTime }),
      });
      if (res.ok) alert("Cutoff time updated!");
      else alert("Failed to update cutoff time");
    } catch (e) {
      alert("Error saving cutoff time");
    }
  };

  const addStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ds_name: storeName.trim(),
          ds_code: storeCode.trim().toUpperCase(),
          email: storeEmail.trim(),
          store_type: storeType
        }),
      });
      if (res.ok) {
        alert("Store added!");
        setStoreName("");
        setStoreCode("");
        setStoreEmail("");
        setStoreType("SHOT");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add store");
      }
    } catch (e) {
      alert("Error adding store");
    }
  };

  const removeStore = async (ds_code: string, ds_name: string) => {
    if (!confirm(`Are you sure you want to remove ${ds_name} (${ds_code})?`)) return;
    try {
      const res = await fetch(`/api/stores?ds_code=${encodeURIComponent(ds_code)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Store removed!");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to remove store");
      }
    } catch (e) {
      alert("Error removing store");
    }
  };

  const toggleStoreType = async (store: any) => {
    const nextType = store.store_type === "NATIVE" ? "SHOT" : "NATIVE";
    const promptMsg = `Swap store concept for "${store.ds_name}" (${store.ds_code})?\n\n` +
      `Current: ${store.store_type}\n` +
      `New: ${nextType}\n\n` +
      `This will immediately isolate or grant access to ${nextType} catalog items for baristas at this location. Proceed?`;
    
    if (!confirm(promptMsg)) return;

    try {
      const res = await fetch("/api/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ds_code: store.ds_code,
          store_type: nextType,
        }),
      });
      if (res.ok) {
        setStores(prev => prev.map(s => s.ds_code === store.ds_code ? { ...s, store_type: nextType } : s));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to swap store concept");
      }
    } catch (e) {
      alert("Network error swapping store concept");
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_zsku: itemZsku.trim(),
          pbarcode: itemBarcode.trim(),
          product_title: itemTitle.trim(),
          brand: itemBrand.trim() || null,
          unit_size: itemUnitSize.trim() || null,
          unit_type: itemUnitType,
          substitute_zsku: itemSub.trim() || null,
          item_type: itemType,
          category: itemCategory,
          max_qty: itemMaxQty ? parseInt(itemMaxQty) : null
        }),
      });
      if (res.ok) {
        alert("Item added!");
        setItemZsku("");
        setItemBarcode("");
        setItemTitle("");
        setItemBrand("");
        setItemUnitSize("");
        setItemSub("");
        setItemMaxQty("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add item");
      }
    } catch (e) {
      alert("Error adding item");
    }
  };

  const saveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_zsku: editingItem.item_zsku,
          pbarcode: editingItem.pbarcode || "",
          product_title: editingItem.product_title,
          brand: editingItem.brand || null,
          unit_size: editingItem.unit_size || null,
          unit_type: editingItem.unit_type || "ml",
          substitute_zsku: editingItem.substitute_zsku || null,
          item_type: editingItem.item_type || "GENERAL",
          category: editingItem.category || "INGREDIENTS",
          max_qty: editingItem.max_qty !== null && editingItem.max_qty !== undefined && editingItem.max_qty !== "" ? parseInt(editingItem.max_qty) : null
        }),
      });
      if (res.ok) {
        alert("SKU updated!");
        setEditingItem(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update item");
      }
    } catch (e) {
      alert("Error updating item");
    }
  };

  const removeItem = async (item_zsku: string, product_title: string) => {
    if (!confirm(`Are you sure you want to remove ${product_title} (${item_zsku})?`)) return;
    try {
      const res = await fetch(`/api/items?item_zsku=${encodeURIComponent(item_zsku)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Item removed!");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to remove item");
      }
    } catch (e) {
      alert("Error removing item");
    }
  };

  const toggleStock = async (item_zsku: string, currentStock: boolean) => {
    try {
      const res = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_zsku,
          in_stock: !currentStock
        }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.item_zsku === item_zsku ? { ...i, in_stock: !currentStock } : i));
      } else {
        alert("Failed to toggle stock status");
      }
    } catch (e) {
      alert("Error toggling stock status");
    }
  };

  const updateMaxQty = async (item_zsku: string, max_qty: number | null) => {
    try {
      const res = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_zsku,
          max_qty
        }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.item_zsku === item_zsku ? { ...i, max_qty } : i));
      } else {
        alert("Failed to update max qty");
      }
    } catch (e) {
      alert("Error updating max qty");
    }
  };

  const downloadReport = async () => {
    try {
      const res = await fetch(`/api/reports?date=${reportDate}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to download report");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Replenishment_Master_${reportDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Error generating report");
    }
  };

  if (!authChecked) {
    return <div className="p-8 text-center text-sm font-bold text-gray-500">Checking Authorization...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10 space-y-6">
            <div className="text-center space-y-2">
              <span className="text-3xl">🔒</span>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Admin Authentication Required</h2>
              <p className="text-xs text-gray-500">Sign in with an authorized @noon.com admin address.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Official @noon.com Email</label>
                <input
                  type="email"
                  required
                  placeholder="yourname@noon.com"
                  value={loginEmailInput}
                  onChange={e => setLoginEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition"
              >
                Access Admin Portal →
              </button>
            </form>

            <div className="pt-2 border-t border-gray-100 text-center">
              <a href="/" className="text-xs font-semibold text-blue-600 hover:underline">← Back to Barista Portal</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredStores = stores.filter(s =>
    (s.ds_name || "").toLowerCase().includes(storeSearch.toLowerCase()) ||
    (s.ds_code || "").toLowerCase().includes(storeSearch.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredItems = items.filter(i =>
    (i.product_title || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.item_zsku || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.brand || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.pbarcode || "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Operations Administration</h1>
            <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Super Admin</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Logged in: <strong className="text-gray-800 font-mono">{currentUserEmail}</strong></p>
        </div>
        <div className="flex items-center space-x-2">
          <a href="/" className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl border border-gray-200 transition">
            ← Barista Portal
          </a>
          <button
            onClick={() => {
              localStorage.removeItem("noon_user_email");
              setCurrentUserEmail("");
            }}
            className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Edit SKU Information</h3>
                <p className="text-xs text-gray-400 font-mono">{editingItem.item_zsku}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEditItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={editingItem.product_title}
                  onChange={e => setEditingItem({...editingItem, product_title: e.target.value})}
                  className="w-full border p-2 rounded text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editingItem.pbarcode || ""}
                    onChange={e => setEditingItem({...editingItem, pbarcode: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editingItem.brand || ""}
                    onChange={e => setEditingItem({...editingItem, brand: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Size</label>
                  <input
                    type="text"
                    value={editingItem.unit_size || ""}
                    onChange={e => setEditingItem({...editingItem, unit_size: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Type</label>
                  <select
                    value={editingItem.unit_type || "ml"}
                    onChange={e => setEditingItem({...editingItem, unit_type: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="roll">roll</option>
                    <option value="box">box</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Portal Type</label>
                  <select
                    value={editingItem.item_type || "GENERAL"}
                    onChange={e => setEditingItem({...editingItem, item_type: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="GENERAL">GENERAL (All Stores)</option>
                    <option value="NATIVE_ONLY">NATIVE_ONLY</option>
                    <option value="SHOT_ONLY">SHOT_ONLY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={editingItem.category || "INGREDIENTS"}
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="COFFEE_BEANS">COFFEE_BEANS</option>
                    <option value="MILK">MILK</option>
                    <option value="PACKAGING">PACKAGING</option>
                    <option value="INGREDIENTS">INGREDIENTS</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Substitute ZSKU (if OOS)</label>
                  <input
                    type="text"
                    placeholder="Optional backup SKU"
                    value={editingItem.substitute_zsku || ""}
                    onChange={e => setEditingItem({...editingItem, substitute_zsku: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Order Qty</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No limit"
                    value={editingItem.max_qty !== null && editingItem.max_qty !== undefined ? editingItem.max_qty : ""}
                    onChange={e => setEditingItem({...editingItem, max_qty: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Row: Cut-off + Excel Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cutoff Setting */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⏰</span>
            <h2 className="text-base font-black text-gray-900 tracking-tight">Daily Cut-off Time (UAE)</h2>
          </div>
          <p className="text-xs text-gray-500">
            Current server & UI cutoff configured for orders dispatch.
          </p>
          <div className="flex items-center space-x-3">
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="border p-2.5 rounded-xl font-mono text-sm font-bold bg-gray-50"
            />
            <button
              onClick={saveCutoff}
              className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800 transition"
            >
              Update Cut-off
            </button>
          </div>
        </div>

        {/* Excel Reports */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📊</span>
            <h2 className="text-base font-black text-gray-900 tracking-tight">Download Replenishment Master</h2>
          </div>
          <p className="text-xs text-gray-500">
            Export consolidated Excel order matrix for dispatch and store replenishment.
          </p>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border p-2.5 rounded-xl font-mono text-sm font-bold bg-gray-50"
            />
            <button
              onClick={downloadReport}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition flex items-center space-x-1"
            >
              <span>📥</span>
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Access Control */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">👥</span>
            <h2 className="text-base font-black text-gray-900 tracking-tight">Admin Portal Access List</h2>
          </div>
          <span className="text-xs text-gray-400 font-semibold">{adminList.length + 1} Authorized Admins</span>
        </div>

        <form onSubmit={addAdmin} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="Add new admin email (e.g. name@noon.com)"
            value={newAdminEmail}
            onChange={e => setNewAdminEmail(e.target.value)}
            className="flex-1 border p-2.5 rounded-xl text-xs font-medium"
          />
          <button type="submit" className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800">
            + Grant Admin
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          <div className="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-2">
            <span className="font-mono font-bold text-yellow-900">kangarg@noon.com</span>
            <span className="text-[10px] font-black uppercase text-yellow-700">(Super Admin)</span>
          </div>
          {adminList.map(email => (
            <div key={email} className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-2">
              <span className="font-mono text-gray-800">{email}</span>
              <button
                onClick={() => removeAdmin(email)}
                className="text-red-500 hover:text-red-700 font-bold ml-1 text-sm leading-none"
                title="Revoke access"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Store Master */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Store Directory ({stores.length})</h2>
            <p className="text-xs text-gray-500">Configure retail cafes, DS codes, store emails, and concept brand (SHOT vs NATIVE).</p>
          </div>
          <input
            type="text"
            placeholder="Search stores..."
            value={storeSearch}
            onChange={(e) => setStoreSearch(e.target.value)}
            className="border p-2 rounded-xl text-xs w-60"
          />
        </div>

        {/* Add Store Form */}
        <form onSubmit={addStore} className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <input
            placeholder="Store Name (e.g. Dubai Mall)"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="DS Code (e.g. DXB_01)"
            required
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            className="border p-2 rounded text-sm uppercase font-mono"
          />
          <input
            placeholder="Store Email(s) - comma separated"
            required
            value={storeEmail}
            onChange={(e) => setStoreEmail(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <select
            value={storeType}
            onChange={(e) => setStoreType(e.target.value)}
            className="border p-2 rounded text-sm font-bold"
          >
            <option value="SHOT">SHOT (Express Concept)</option>
            <option value="NATIVE">NATIVE (Subko Collab)</option>
          </select>
          <button type="submit" className="bg-black text-white rounded font-bold text-xs py-2 hover:bg-gray-800">
            + Add Store
          </button>
        </form>

        {/* Store List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredStores.map(s => (
            <div key={s.ds_code} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start">
              <div className="space-y-1 min-w-0 pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm text-gray-900 truncate">{s.ds_name}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    s.store_type === 'NATIVE' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {s.store_type}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-gray-500 font-bold">{s.ds_code}</div>
                <div className="text-[11px] text-gray-500 truncate">{s.email}</div>
              </div>
              <div className="flex flex-col items-end space-y-1.5 shrink-0">
                {/* Swap Store Concept Button */}
                <button
                  type="button"
                  onClick={() => toggleStoreType(s)}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition shadow-sm flex items-center space-x-1 ${
                    s.store_type === "NATIVE"
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
                  }`}
                  title={`Swap store concept to ${s.store_type === "NATIVE" ? "SHOT" : "NATIVE"}`}
                >
                  <span>⇄</span>
                  <span>To {s.store_type === "NATIVE" ? "SHOT" : "NATIVE"}</span>
                </button>
                <button
                  onClick={() => removeStore(s.ds_code, s.ds_name)}
                  className="text-xs text-red-500 hover:text-red-700 font-bold"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item Master */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Item Master Catalog ({items.length})</h2>
            <p className="text-xs text-gray-500">Add SKUs, toggle in-stock/OOS status, configure max order quantities, and brand isolation.</p>
          </div>
          <input
            type="text"
            placeholder="Search items by title, ZSKU, brand..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            className="border p-2 rounded-xl text-xs w-72"
          />
        </div>

        {/* Add Item Form */}
        <form onSubmit={addItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <input
            placeholder="ZSKU (e.g. ZSKU1234)"
            required
            value={itemZsku}
            onChange={(e) => setItemZsku(e.target.value)}
            className="border p-2 rounded text-sm uppercase font-mono"
          />
          <input
            placeholder="Barcode (optional)"
            value={itemBarcode}
            onChange={(e) => setItemBarcode(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="Product Title"
            required
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            className="border p-2 rounded text-sm sm:col-span-2"
          />
          <input
            placeholder="Brand (e.g. SUBKO, MONIN)"
            value={itemBrand}
            onChange={(e) => setItemBrand(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="Unit Size (e.g. 1000)"
            value={itemUnitSize}
            onChange={(e) => setItemUnitSize(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <select
            value={itemUnitType}
            onChange={(e) => setItemUnitType(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="ml">ml</option>
            <option value="l">l</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="pcs">pcs</option>
            <option value="roll">roll</option>
            <option value="box">box</option>
            <option value="pack">pack</option>
          </select>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className="border p-2 rounded text-sm font-semibold"
          >
            <option value="GENERAL">GENERAL (All Stores)</option>
            <option value="NATIVE_ONLY">NATIVE_ONLY</option>
            <option value="SHOT_ONLY">SHOT_ONLY</option>
          </select>
          <select
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            className="border p-2 rounded text-sm font-semibold"
          >
            <option value="COFFEE_BEANS">COFFEE_BEANS</option>
            <option value="MILK">MILK</option>
            <option value="PACKAGING">PACKAGING</option>
            <option value="INGREDIENTS">INGREDIENTS</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
          </select>

          <input
            placeholder="Substitute ZSKU (if OOS)"
            value={itemSub}
            onChange={(e) => setItemSub(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="Max Order Qty (optional)"
            type="number"
            min="0"
            value={itemMaxQty}
            onChange={(e) => setItemMaxQty(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <button type="submit" className="bg-black text-white rounded font-bold text-xs py-2 hover:bg-gray-800 sm:col-span-2">
            + Add SKU to Catalog
          </button>
        </form>

        {/* Item Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(i => (
            <div key={i.item_zsku} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 bg-white ${
              !i.in_stock ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-gray-500">{i.item_zsku}</span>
                  <div className="flex items-center space-x-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      i.item_type === 'NATIVE_ONLY' ? 'bg-sky-100 text-sky-800' :
                      i.item_type === 'SHOT_ONLY' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {i.item_type}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {i.category}
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-sm text-gray-900 leading-snug">{i.product_title}</h3>

                <div className="flex flex-wrap gap-1 text-[11px] text-gray-500">
                  {i.brand && <span className="font-semibold text-gray-700">{i.brand} •</span>}
                  {i.unit_size && <span>{i.unit_size} {i.unit_type} •</span>}
                  {i.pbarcode && <span className="font-mono">BC: {i.pbarcode}</span>}
                </div>

                {i.substitute_zsku && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md font-semibold">
                    Backup SKU: <span className="font-mono font-bold">{i.substitute_zsku}</span>
                  </div>
                )}
              </div>

              {/* Stock toggle and limits */}
              <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-600">Daily Max Qty:</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="∞"
                      defaultValue={i.max_qty !== null && i.max_qty !== undefined ? i.max_qty : ""}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        updateMaxQty(i.item_zsku, val === "" ? null : parseInt(val));
                      }}
                      className="w-14 border rounded px-1.5 py-0.5 text-xs text-center font-bold"
                    />
                    <span className="text-[10px] text-gray-400">units</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Stock Toggle */}
                  <button
                    onClick={() => toggleStock(i.item_zsku, i.in_stock)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center space-x-1 ${
                      i.in_stock
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <span>{i.in_stock ? "✓ In Stock" : "✕ OOS"}</span>
                  </button>

                  {/* Edit SKU */}
                  <button
                    onClick={() => setEditingItem({...i})}
                    className="px-3 py-1.5 text-xs rounded-lg font-bold bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 transition flex items-center space-x-1"
                    title="Edit SKU"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>

                  {/* Remove SKU */}
                  <button
                    onClick={() => removeItem(i.item_zsku, i.product_title)}
                    className="px-2.5 py-1.5 text-xs rounded-lg font-bold text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition"
                    title="Remove SKU"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
