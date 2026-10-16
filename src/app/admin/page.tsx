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
  const [itemImage, setItemImage] = useState("");
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
    } catch (e) {
      setTimeZoneDisplay("IST (Indian Standard Time)");
    }
    loadData();
    setAuthChecked(true);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmailInput.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      alert("Please use a valid @noon.com email.");
      return;
    }
    localStorage.setItem("noon_user_email", email);
    setCurrentUserEmail(email);
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      alert("Must be a valid @noon.com email.");
      return;
    }
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        alert(`Admin access granted to ${email}`);
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
    if (!confirm(`Are you sure you want to revoke admin access for ${email}?`)) return;
    try {
      const res = await fetch("/api/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        alert("Admin removed");
        loadAdmins();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to remove admin");
      }
    } catch (e) {
      alert("Error removing admin");
    }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffTime }),
      });
      if (res.ok) alert("Settings saved!");
    } catch (e) {
      alert("Error saving settings");
    }
  };

  const downloadReport = (format: string = 'xlsx') => {
    window.open(`/api/report?date=${reportDate}&format=${format}`, "_blank");
  };

  const addStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ds_code: storeCode.trim().toUpperCase(),
          ds_name: storeName.trim(),
          email: storeEmail.trim().toLowerCase(),
          store_type: storeType
        }),
      });
      if (res.ok) {
        alert("Store added!");
        setStoreCode("");
        setStoreName("");
        setStoreEmail("");
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
    if (!confirm(`Are you sure you want to delete store "${ds_name}" (${ds_code})?`)) return;
    try {
      const res = await fetch("/api/stores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ds_code }),
      });
      if (res.ok) {
        alert("Store deleted");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete store");
      }
    } catch (e) {
      alert("Error deleting store");
    }
  };

  const deleteAllStores = async () => {
    if (!confirm("⚠️ DANGER: Are you sure you want to delete ALL stores? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/stores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        alert("All stores deleted");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete stores");
      }
    } catch (e) {
      alert("Error deleting all stores");
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
          imageUrl: itemImage.trim() || null,
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
        setItemImage("");
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

  const updateItemDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      if (res.ok) {
        alert("Item updated!");
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

  const toggleStock = async (item_zsku: string, in_stock: boolean) => {
    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_zsku, in_stock: !in_stock }),
      });
      if (res.ok) loadData();
    } catch (e) {
      alert("Error updating stock");
    }
  };

  const updateMaxQty = async (item_zsku: string, max_qty: string) => {
    try {
      const val = max_qty === "" ? null : parseInt(max_qty);
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_zsku, max_qty: val }),
      });
      if (res.ok) loadData();
    } catch (e) {
      alert("Error updating max qty");
    }
  };

  const removeItem = async (item_zsku: string, title: string) => {
    if (!confirm(`Are you sure you want to delete SKU "${title}" (${item_zsku})?`)) return;
    try {
      const res = await fetch("/api/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_zsku }),
      });
      if (res.ok) {
        alert("Item deleted");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete item");
      }
    } catch (e) {
      alert("Error deleting item");
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-bold">Checking admin permissions...</div>;
  }

  const isGlobalAdmin = currentUserEmail === "kangarg@noon.com" || adminList.includes(currentUserEmail);

  if (!currentUserEmail || !isGlobalAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Admin Sign In</h1>
            <p className="text-xs text-gray-500">noon Coffee Ops Admin Control Panel</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Your @noon.com Email</label>
              <input
                type="email"
                placeholder="name@noon.com"
                required
                value={loginEmailInput}
                onChange={(e) => setLoginEmailInput(e.target.value)}
                className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white"
              />
            </div>
            {currentUserEmail && !isGlobalAdmin && (
              <div className="bg-red-50 text-red-700 p-2.5 rounded-lg text-xs font-medium border border-red-200">
                ⚠️ Account <strong>{currentUserEmail}</strong> does not have Admin privileges.
              </div>
            )}
            <button type="submit" className="w-full bg-black hover:bg-gray-800 text-white font-bold py-2.5 rounded-lg text-sm transition">
              Verify & Enter Admin Portal →
            </button>
          </form>
          <div className="text-center pt-2">
            <a href="/" className="text-xs font-bold text-gray-500 hover:text-black">← Back to Barista Portal</a>
          </div>
        </div>
      </div>
    );
  }

  const filteredStores = stores.filter(s => 
    s.ds_name.toLowerCase().includes(storeSearch.toLowerCase()) || 
    s.ds_code.toLowerCase().includes(storeSearch.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(storeSearch.toLowerCase()))
  );

  const filteredItems = items.filter(i =>
    i.product_title.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.item_zsku.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.pbarcode && i.pbarcode.toLowerCase().includes(itemSearch.toLowerCase())) ||
    (i.brand && i.brand.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">⚙️ noon Cafe Ops - Admin Control</h1>
          <p className="text-xs text-gray-500 font-medium">Logged in as: <span className="font-bold text-gray-800">{currentUserEmail}</span> (Admin Mode)</p>
        </div>
        <div className="flex items-center space-x-3">
          <a href="/" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-1.5 rounded-lg text-xs font-bold transition">
            ☕ Go to Barista Portal
          </a>
          <button
            onClick={() => {
              localStorage.removeItem("noon_user_email");
              setCurrentUserEmail("");
            }}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-3.5 py-1.5 rounded-lg text-xs font-bold transition border border-red-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Edit SKU Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-bold text-lg text-gray-900">Edit SKU: {editingItem.item_zsku}</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>
            <form onSubmit={updateItemDetails} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={editingItem.product_title || ""}
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingItem.imageUrl || ""}
                  onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})}
                  className="w-full border p-2 rounded text-sm"
                />
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Substitute SKU</label>
                  <input
                    type="text"
                    value={editingItem.substitute_zsku || ""}
                    onChange={e => setEditingItem({...editingItem, substitute_zsku: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Order Limit</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Empty for none"
                    value={editingItem.max_qty ?? ""}
                    onChange={e => setEditingItem({...editingItem, max_qty: e.target.value})}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end space-x-2 border-t">
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 border rounded font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded font-bold text-xs hover:bg-gray-800">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Access Manager */}
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 space-y-4">
        <h2 className="text-xl font-bold">Admin Team Management</h2>
        <form onSubmit={addAdmin} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="colleague@noon.com"
            required
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            className="border p-2 rounded flex-1 text-sm"
          />
          <button
            type="submit"
            className="bg-black text-white px-5 py-2 rounded font-bold text-sm hover:bg-gray-800"
          >
            + Add Admin
          </button>
        </form>

        <div className="border rounded-lg divide-y">
          {adminList.map((adminEmail) => (
            <div key={adminEmail} className="p-3 flex justify-between items-center text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-800 break-all">{adminEmail}</span>
                {adminEmail === currentUserEmail && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex-shrink-0">You</span>
                )}
              </div>
              {adminList.length > 1 && (
                <button
                  onClick={() => removeAdmin(adminEmail)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 flex-shrink-0"
                >
                  Revoke Access
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-xl font-black text-stone-900">Daily Cut-off Settings</h2>
            <p className="text-xs text-stone-500 font-medium">Orders placed up to this cutoff time will be included in the daily replenishment batch.</p>
          </div>
          <span className="self-start sm:self-auto bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black px-3 py-1 rounded-full">
            🌐 Timezone: {timeZoneDisplay}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Daily Cut-off Time ({timeZoneDisplay.split(' ')[0]})
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="border border-stone-300 p-2.5 rounded-xl font-bold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-black outline-none w-full sm:w-48"
              />
              <span className="text-xs font-black text-stone-700 bg-stone-100 px-3 py-2.5 rounded-xl border border-stone-200">
                {timeZoneDisplay.split(' ')[0]}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5">
              Cutoff is strictly locked to <strong>{timeZoneDisplay}</strong>. Example: 19:00 IST = 17:30 GST (UAE Cafe Time).
            </p>
          </div>
          <button onClick={saveSettings} className="bg-stone-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-black text-sm transition self-start sm:self-auto shadow-sm">
            Save Settings
          </button>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-xl font-black text-stone-900">Export Daily Orders Report</h2>
          <p className="text-xs text-stone-500 font-medium">
            Aggregated by store & SKU taking <strong>MAX quantity</strong> per SKU across all submissions. OOS and un-ordered items are excluded.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Select Replenishment Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border border-stone-300 p-2.5 rounded-xl font-bold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-black outline-none w-full sm:w-48"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => downloadReport('xlsx')} className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl font-black hover:bg-yellow-500 text-sm flex items-center space-x-2 shadow-sm transition active:scale-95">
              <span>📊</span>
              <span>Download Excel (.xlsx)</span>
            </button>
            <button onClick={() => downloadReport('csv')} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black hover:bg-emerald-700 text-sm flex items-center space-x-2 shadow-sm transition active:scale-95">
              <span>📄</span>
              <span>Download CSV (.csv)</span>
            </button>
          </div>
        </div>

        <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl text-xs text-stone-600 space-y-1">
          <div className="font-bold text-stone-800">📋 Routing Rules Applied in Output:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="bg-white p-2 rounded-lg border border-stone-200">
              <span className="font-bold text-indigo-700">AUHID02</span>: Assigned to all <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold">AUHDS</code> & <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold">AINDS</code> stores.
            </div>
            <div className="bg-white p-2 rounded-lg border border-stone-200">
              <span className="font-bold text-indigo-700">DXBID04</span>: Assigned to all <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold">DXBDS</code> & <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold">SHJDS</code> stores.
            </div>
          </div>
        </div>
      </div>
      
      {/* Manage Stores */}
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
          <h2 className="text-xl font-bold">Manage Stores ({stores.length})</h2>
          {stores.length > 0 && (
            <button 
              onClick={deleteAllStores}
              className="self-start sm:self-auto bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition"
            >
              🗑️ Delete All Stores
            </button>
          )}
        </div>

        {/* Add Store Form */}
        <form onSubmit={addStore} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6 bg-gray-50 p-4 rounded-lg border">
          <input
            placeholder="Store Code (e.g. DXBDS01)"
            required
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            className="border p-2 rounded text-sm uppercase"
          />
          <input
            placeholder="Store Name (e.g. Downtown)"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="Assigned Email (e.g. cafe-downtown@noon.com)"
            required
            type="email"
            value={storeEmail}
            onChange={(e) => setStoreEmail(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <select
            value={storeType}
            onChange={(e) => setStoreType(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="SHOT">SHOT</option>
            <option value="NATIVE">NATIVE</option>
          </select>
          <button type="submit" className="bg-black text-white p-2 rounded font-bold text-sm hover:bg-gray-800">
            + Add Store
          </button>
        </form>

        {/* Search Stores */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search stores by code, name, or email..."
            value={storeSearch}
            onChange={(e) => setStoreSearch(e.target.value)}
            className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white"
          />
        </div>

        {/* Store List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1 border rounded-lg">
          {filteredStores.map((s) => (
            <div key={s.ds_code} className="border p-3 rounded-lg bg-gray-50 flex justify-between items-center text-sm shadow-sm">
              <div className="min-w-0 pr-2">
                <div className="font-bold text-gray-900 truncate">{s.ds_name}</div>
                <div className="text-xs text-gray-500 font-mono font-bold">{s.ds_code} • <span className={s.store_type === 'NATIVE' ? 'text-blue-700' : 'text-red-700'}>{s.store_type}</span></div>
                <div className="text-[11px] text-gray-400 truncate">{s.email || "No email assigned"}</div>
              </div>
              <button
                onClick={() => removeStore(s.ds_code, s.ds_name)}
                className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Items */}
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Manage Catalog & Inventory ({items.length})</h2>

        {/* Add Item Form */}
        <form onSubmit={addItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-gray-50 p-4 rounded-lg border">
          <input
            placeholder="ZSKU Code *"
            required
            value={itemZsku}
            onChange={(e) => setItemZsku(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="Barcode / EAN"
            value={itemBarcode}
            onChange={(e) => setItemBarcode(e.target.value)}
            className="border p-2 rounded text-sm"
          />
          <input
            placeholder="Product Title *"
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
          <div className="flex space-x-1">
            <input
              placeholder="Unit Size"
              value={itemUnitSize}
              onChange={(e) => setItemUnitSize(e.target.value)}
              className="border p-2 rounded text-sm w-2/3"
            />
            <select
              value={itemUnitType}
              onChange={(e) => setItemUnitType(e.target.value)}
              className="border p-2 rounded text-sm w-1/3"
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
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="GENERAL">GENERAL (All Stores)</option>
            <option value="NATIVE_ONLY">NATIVE_ONLY</option>
            <option value="SHOT_ONLY">SHOT_ONLY</option>
          </select>
          <select
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="COFFEE_BEANS">COFFEE_BEANS</option>
            <option value="MILK">MILK</option>
            <option value="PACKAGING">PACKAGING</option>
            <option value="INGREDIENTS">INGREDIENTS</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
          </select>
          <input
            placeholder="Image URL (optional)"
            type="url"
            value={itemImage}
            onChange={(e) => setItemImage(e.target.value)}
            className="border p-2 rounded text-sm sm:col-span-2"
          />
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
          <button type="submit" className="bg-black text-white p-2 rounded font-bold text-sm hover:bg-gray-800 sm:col-span-2 lg:col-span-4">
            + Add New SKU to Catalog
          </button>
        </form>

        {/* Search Items */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search SKUs by title, SKU code, brand, or barcode..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white"
          />
        </div>

        {/* Item List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredItems.map((i) => (
            <div 
              key={i.item_zsku} 
              className={`p-3 rounded-lg border transition shadow-sm ${
                !i.in_stock ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">
                      {i.item_zsku}
                    </span>
                    <span className="font-bold text-sm text-gray-900 leading-snug">
                      {i.product_title}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                      i.item_type === 'NATIVE_ONLY' ? 'bg-blue-100 text-blue-800' :
                      i.item_type === 'SHOT_ONLY' ? 'bg-rose-100 text-rose-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {i.item_type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {i.pbarcode && <span>Barcode: <span className="font-mono font-medium text-gray-700">{i.pbarcode}</span></span>}
                    {i.brand && <span>Brand: <span className="font-medium text-gray-700">{i.brand}</span></span>}
                    {i.unit_size && <span>Size: <span className="font-medium text-gray-700">{i.unit_size} {i.unit_type}</span></span>}
                    <span>Category: <span className="font-medium text-gray-700">{i.category}</span></span>
                    {i.substitute_zsku && (
                      <span className="text-amber-700 font-medium">Sub: {i.substitute_zsku}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  {/* Max Limit Input */}
                  <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                    <span className="text-[11px] font-semibold text-gray-500">Max:</span>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="∞" 
                      defaultValue={i.max_qty || ""} 
                      onBlur={(e) => updateMaxQty(i.item_zsku, e.target.value)}
                      className="border border-gray-300 bg-white p-1 rounded w-14 text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400" 
                    />
                  </div>

                  {/* Stock Toggle */}
                  <button 
                    onClick={() => toggleStock(i.item_zsku, i.in_stock)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center space-x-1 shadow-sm ${
                      i.in_stock 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    <span>{i.in_stock ? "✓ In Stock" : "✕ OOS"}</span>
                  </button>

                  {/* Edit SKU */}
                  <button
                    onClick={() => setEditingItem({...i})}
                    className="px-3 py-1.5 text-xs rounded-lg font-bold bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 transition flex items-center space-x-1"
                    title="Edit SKU and Image"
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
