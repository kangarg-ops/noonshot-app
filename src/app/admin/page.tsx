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
        alert("Failed to add admin.");
      }
    } catch (e) {
      alert("Error adding admin.");
    }
  };

  const removeAdmin = async (email: string) => {
    if (adminList.length <= 1) {
      alert("Cannot remove the only remaining admin.");
      return;
    }
    if (!confirm(`Are you sure you want to revoke admin access from ${email}?`)) return;
    try {
      const res = await fetch(`/api/admins?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (res.ok) {
        alert(`Revoked admin access for ${email}`);
        loadAdmins();
      } else {
        alert("Failed to remove admin.");
      }
    } catch (e) {
      alert("Error removing admin.");
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
          ds_code: storeCode,
          ds_name: storeName,
          store_type: storeType,
          email: storeEmail
        }),
      });
      if (res.ok) {
        alert("Store added successfully!");
        setStoreCode("");
        setStoreName("");
        setStoreEmail("");
        setStoreType("SHOT");
        loadData();
      } else {
        alert("Failed to add store.");
      }
    } catch (e) {
      alert("Error adding store.");
    }
  };

  const toggleStoreBrand = async (ds_code: string, currentType: string) => {
    const newType = currentType === "NATIVE" ? "SHOT" : "NATIVE";
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ds_code, store_type: newType }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert("Failed to update store brand.");
      }
    } catch (e) {
      alert("Error updating store brand.");
    }
  };

  const updateStoreEmail = async (ds_code: string, email: string) => {
    try {
      await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ds_code, email }),
      });
      loadData();
    } catch (e) {
      alert("Error updating store email");
    }
  };

  const removeStore = async (ds_code: string, ds_name: string) => {
    if (!confirm(`Are you sure you want to delete store ${ds_name} (${ds_code})?`)) return;
    try {
      const res = await fetch(`/api/stores?ds_code=${ds_code}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        alert("Failed to delete store.");
      }
    } catch (e) {
      alert("Error deleting store.");
    }
  };

  const deleteAllStores = async () => {
    if (!confirm("⚠️ CAUTION: Are you sure you want to delete ALL stores? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/stores?all=true", { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        alert("Failed to delete all stores.");
      }
    } catch (e) {
      alert("Error deleting stores.");
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_zsku: itemZsku,
          pbarcode: itemBarcode,
          product_title: itemTitle,
          brand: itemBrand || null,
          unit_size: itemUnitSize || null,
          unit_type: itemUnitType || null,
          imageUrl: itemImage || null,
          substitute_zsku: itemSub || null,
          item_type: itemType,
          category: itemCategory,
          max_qty: itemMaxQty || null
        }),
      });
      if (res.ok) {
        alert("Item added successfully!");
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
        alert("Failed to add item.");
      }
    } catch (e) {
      alert("Error adding item.");
    }
  };

  const toggleStock = async (item_zsku: string, currentStock: boolean) => {
    try {
      await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_zsku, in_stock: !currentStock }),
      });
      loadData();
    } catch (e) {
      alert("Error updating stock status");
    }
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_zsku: editingItem.item_zsku,
          pbarcode: editingItem.pbarcode,
          product_title: editingItem.product_title,
          brand: editingItem.brand || null,
          unit_size: editingItem.unit_size || null,
          unit_type: editingItem.unit_type || null,
          imageUrl: editingItem.imageUrl || null,
          substitute_zsku: editingItem.substitute_zsku || null,
          item_type: editingItem.item_type || "GENERAL",
          category: editingItem.category || "INGREDIENTS",
          max_qty: editingItem.max_qty || null
        }),
      });
      if (res.ok) {
        alert("Item updated!");
        setEditingItem(null);
        loadData();
      } else {
        alert("Failed to update item");
      }
    } catch (e) {
      alert("Error saving edit");
    }
  };

  const removeItem = async (item_zsku: string, title: string) => {
    if (!confirm(`Are you sure you want to remove ${title}?`)) return;
    try {
      await fetch(`/api/items?item_zsku=${item_zsku}`, { method: "DELETE" });
      loadData();
    } catch (e) {
      alert("Error removing item");
    }
  };

  const updateMaxQty = async (item_zsku: string, max_qty: string) => {
    try {
      await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_zsku, max_qty }),
      });
      loadData();
    } catch (e) {
      alert("Error updating limit");
    }
  };

  const isCurrentAdmin = adminList.includes(currentUserEmail) || currentUserEmail === "kangarg@noon.com";

  if (authChecked && !isCurrentAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full space-y-5 text-center">
          <div className="text-4xl">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal Restricted</h1>
          <p className="text-sm text-gray-500">
            {currentUserEmail ? (
              <>The email <span className="font-semibold text-gray-800">{currentUserEmail}</span> does not have admin permissions.</>
            ) : (
              <>Please enter an authorized admin email to access this page.</>
            )}
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-3 pt-2">
            <input
              type="email"
              placeholder="admin@noon.com"
              required
              value={loginEmailInput}
              onChange={(e) => setLoginEmailInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-center focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition"
            >
              Sign In as Admin
            </button>
          </form>

          <div className="pt-2 border-t">
            <a href="/" className="text-xs text-blue-600 hover:underline font-semibold">
              ← Return to Barista Ordering Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filteredStores = stores.filter(s => 
    s.ds_name?.toLowerCase().includes(storeSearch.toLowerCase()) ||
    s.ds_code?.toLowerCase().includes(storeSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredItems = items.filter(i => 
    i.product_title?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.item_zsku?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.brand?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.category?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Logged in as Admin: <span className="font-semibold text-gray-700">{currentUserEmail}</span>
          </p>
        </div>
        <a 
          href="/" 
          className="self-start sm:self-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg font-bold transition flex items-center space-x-1"
        >
          <span>☕ Go to Cafe Portal</span>
        </a>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">Edit SKU Details</h2>
            <p className="text-xs font-mono text-gray-400 mb-2">SKU: {editingItem.item_zsku}</p>

            {/* Image Preview & URL Controls */}
            <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">Product Image</label>
              {editingItem.imageUrl ? (
                <div className="flex items-center space-x-3">
                  <img src={editingItem.imageUrl} alt="preview" className="w-16 h-16 object-cover rounded-lg border bg-white" />
                  <div className="space-y-1">
                    <p className="text-xs text-green-700 font-semibold">Image connected</p>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, imageUrl: "" })}
                      className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded font-bold border border-red-200"
                    >
                      🗑️ Remove Image
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No image assigned yet. Paste a link below to add one.</p>
              )}
              <input 
                type="url" 
                placeholder="Paste Image URL (e.g. https://...)" 
                value={editingItem.imageUrl || ""} 
                onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} 
                className="border p-2 rounded w-full text-xs bg-white" 
              />
            </div>

            <input type="text" placeholder="Product Title" value={editingItem.product_title || ""} onChange={e => setEditingItem({...editingItem, product_title: e.target.value})} className="border p-2 rounded w-full text-sm" />
            <input type="text" placeholder="Brand" value={editingItem.brand || ""} onChange={e => setEditingItem({...editingItem, brand: e.target.value})} className="border p-2 rounded w-full text-sm" />
            
            <div className="flex space-x-2">
              <input type="text" placeholder="Unit Size (e.g. 250, 1)" value={editingItem.unit_size || ""} onChange={e => setEditingItem({...editingItem, unit_size: e.target.value})} className="border p-2 rounded w-1/2 text-sm" />
              <select value={editingItem.unit_type || "ml"} onChange={e => setEditingItem({...editingItem, unit_type: e.target.value})} className="border p-2 rounded w-1/2 bg-white text-sm">
                <option value="ml">ml</option>
                <option value="L">Litres (L)</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
            
            <input type="text" placeholder="Barcodes" value={editingItem.pbarcode || ""} onChange={e => setEditingItem({...editingItem, pbarcode: e.target.value})} className="border p-2 rounded w-full text-sm font-mono" />
            <input type="text" placeholder="Substitute ZSKU (Optional)" value={editingItem.substitute_zsku || ""} onChange={e => setEditingItem({...editingItem, substitute_zsku: e.target.value})} className="border p-2 rounded w-full text-sm font-mono" />
            <input type="number" placeholder="Max Order Qty (Optional)" value={editingItem.max_qty || ""} onChange={e => setEditingItem({...editingItem, max_qty: e.target.value})} className="border p-2 rounded w-full text-sm" />
            
            <select value={editingItem.category || "INGREDIENTS"} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="border p-2 rounded w-full bg-white text-sm">
              <option value="INGREDIENTS">Category: Ingredients</option>
              <option value="COFFEE_BEANS">Category: Coffee Beans</option>
              <option value="PACKAGING">Category: Packaging</option>
            </select>
            
            <select value={editingItem.item_type || "GENERAL"} onChange={e => setEditingItem({...editingItem, item_type: e.target.value})} className="border p-2 rounded w-full bg-white text-sm font-medium">
              <option value="GENERAL">Available to ALL stores</option>
              <option value="SHOT_ONLY">Available to SHOT stores only</option>
              <option value="NATIVE_ONLY">Available to NATIVE stores only</option>
            </select>

            <div className="flex space-x-3 pt-3">
              <button onClick={saveEdit} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 flex-1 text-sm shadow-sm transition">Save Changes</button>
              <button onClick={() => setEditingItem(null)} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-300 flex-1 text-sm transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Access Management Section */}
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-2">Admin Access Management</h2>
        <p className="text-xs text-gray-500 mb-4">
          Only users with emails in this list can access the Admin Dashboard.
        </p>

        <form onSubmit={addAdmin} className="flex flex-col sm:flex-row gap-2 sm:space-x-3 mb-4">
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
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Daily Cut-off Time
            </label>
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="border p-2 rounded w-full sm:w-48"
            />
          </div>
          <button onClick={saveSettings} className="bg-black text-white px-6 py-2 rounded font-semibold hover:bg-gray-800 self-start sm:self-auto">
            Save
          </button>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Export Daily Orders Report</h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border p-2 rounded w-full sm:w-48"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => downloadReport('xlsx')} className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 text-sm flex items-center space-x-1.5 shadow-sm">
              <span>📊</span>
              <span>Download Excel (.xlsx)</span>
            </button>
            <button onClick={() => downloadReport('csv')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 text-sm flex items-center space-x-1.5 shadow-sm">
              <span>📄</span>
              <span>Download CSV (.csv)</span>
            </button>
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
        <form onSubmit={addStore} className="space-y-3 bg-gray-50 p-4 rounded-lg mb-6 border">
          <h3 className="font-semibold text-sm text-gray-700">Add New Store</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input 
              type="text" 
              placeholder="DS Code (e.g. DXBDS22)" 
              required 
              value={storeCode} 
              onChange={(e) => setStoreCode(e.target.value)} 
              className="border p-2 rounded bg-white text-sm" 
            />
            <input 
              type="text" 
              placeholder="Store Name (e.g. Downtown)" 
              required 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)} 
              className="border p-2 rounded bg-white text-sm" 
            />
            <input 
              type="email" 
              placeholder="Store Email (e.g. cafe-Downtown@noon.com)" 
              value={storeEmail} 
              onChange={(e) => setStoreEmail(e.target.value)} 
              className="border p-2 rounded bg-white text-sm" 
            />
            <select 
              value={storeType} 
              onChange={(e) => setStoreType(e.target.value)} 
              className="border p-2 rounded bg-white font-medium text-sm"
            >
              <option value="SHOT">Brand: SHOT</option>
              <option value="NATIVE">Brand: NATIVE (SUBKO)</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 text-sm">
            + Add Store
          </button>
        </form>

        {/* Search stores */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
          <h3 className="font-bold text-gray-800">Active Stores List ({filteredStores.length})</h3>
          <input 
            type="text"
            placeholder="Search stores..."
            value={storeSearch}
            onChange={e => setStoreSearch(e.target.value)}
            className="border p-1.5 rounded text-sm w-full sm:w-56"
          />
        </div>

        <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
          {filteredStores.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">No stores found.</div>
          ) : (
            filteredStores.map(s => (
              <div key={s.ds_code} className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-gray-50 text-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-bold text-gray-900">{s.ds_name}</span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono">{s.ds_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      s.store_type === "NATIVE" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {s.store_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center space-x-1">
                    <span>✉️</span>
                    <span>{s.email || "No email assigned"}</span>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-1.5">
                  <button
                    onClick={() => toggleStoreBrand(s.ds_code, s.store_type)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                      s.store_type === "NATIVE"
                        ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                    title="Click to toggle store brand between SHOT and NATIVE"
                  >
                    Switch to {s.store_type === "NATIVE" ? "SHOT" : "NATIVE"}
                  </button>

                  <button 
                    onClick={() => {
                      const newEmail = prompt(`Enter new email for ${s.ds_name} (${s.ds_code}):`, s.email || "");
                      if (newEmail !== null) updateStoreEmail(s.ds_code, newEmail);
                    }}
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                    title="Edit Email"
                  >
                    ✏️ Email
                  </button>

                  <button 
                    onClick={() => removeStore(s.ds_code, s.ds_name)} 
                    className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manage Items */}
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Add New Item SKU</h2>
        <form onSubmit={addItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input type="text" placeholder="Item ZSKU" required value={itemZsku} onChange={(e) => setItemZsku(e.target.value)} className="border p-2 rounded text-sm font-mono" />
            <input type="text" placeholder="Barcodes (comma separated)" required value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} className="border p-2 rounded text-sm font-mono" />
            <input type="text" placeholder="Product Title" required value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="border p-2 rounded sm:col-span-2 text-sm" />
            <input type="text" placeholder="Brand (e.g. just_chill, davinci, subko)" value={itemBrand} onChange={(e) => setItemBrand(e.target.value)} className="border p-2 rounded sm:col-span-2 text-sm" />
            <div className="flex space-x-2 sm:col-span-2">
              <input type="text" placeholder="Unit Size (e.g. 250, 1, 1.89)" value={itemUnitSize} onChange={(e) => setItemUnitSize(e.target.value)} className="border p-2 rounded w-1/2 text-sm" />
              <select value={itemUnitType} onChange={(e) => setItemUnitType(e.target.value)} className="border p-2 rounded w-1/2 bg-white text-sm">
                <option value="ml">ml</option>
                <option value="L">Litres (L)</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
            <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="border p-2 rounded bg-white text-sm">
              <option value="INGREDIENTS">Category: Ingredients</option>
              <option value="COFFEE_BEANS">Category: Coffee Beans</option>
              <option value="PACKAGING">Category: Packaging</option>
            </select>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="border p-2 rounded bg-white text-sm font-medium">
              <option value="GENERAL">Available to ALL stores</option>
              <option value="SHOT_ONLY">Available to SHOT stores only</option>
              <option value="NATIVE_ONLY">Available to NATIVE stores only</option>
            </select>
            <input type="url" placeholder="Image URL (Optional)" value={itemImage} onChange={(e) => setItemImage(e.target.value)} className="border p-2 rounded text-sm" />
            <input type="number" placeholder="Order Limit / Max Qty (Optional)" value={itemMaxQty} onChange={(e) => setItemMaxQty(e.target.value)} className="border p-2 rounded text-sm" />
            <input type="text" placeholder="Substitute ZSKU (Optional)" value={itemSub} onChange={(e) => setItemSub(e.target.value)} className="border p-2 rounded sm:col-span-2 text-sm font-mono" />
          </div>
          <button type="submit" className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 text-sm shadow-sm transition">
            + Add SKU
          </button>
        </form>

        {/* Item Search & Management List */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mt-8 mb-3">
          <h3 className="font-bold text-gray-800 text-base sm:text-lg">All Items ({filteredItems.length})</h3>
          <input
            type="text"
            placeholder="Search items by name, SKU, brand..."
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            className="border p-2 rounded-lg text-sm w-full sm:w-72 shadow-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          />
        </div>

        <div className="max-h-[600px] overflow-y-auto border rounded-xl divide-y bg-white shadow-inner">
          {filteredItems.map(i => (
            <div key={i.item_zsku} className="p-3 sm:p-4 hover:bg-gray-50 text-sm transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Product Info (Left) */}
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  {i.imageUrl ? (
                    <img 
                      src={i.imageUrl} 
                      alt={i.product_title} 
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border bg-white flex-shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium flex-shrink-0">
                      No img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 leading-snug text-sm sm:text-base break-words">
                      {i.product_title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        {i.item_zsku}
                      </span>
                      {i.brand && (
                        <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                          {i.brand}
                        </span>
                      )}
                      {i.unit_size && i.unit_type && (
                        <span className="text-gray-600 font-medium text-[11px]">
                          • {i.unit_size} {i.unit_type}
                        </span>
                      )}
                      <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">
                        {i.category}
                      </span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                        i.item_type === "NATIVE_ONLY" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                        i.item_type === "SHOT_ONLY" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-600"
                      }`}>
                        {i.item_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SKU Actions & Controls (Right / Bottom on mobile) */}
                <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 flex-wrap">
                  {/* Limit input */}
                  <div className="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Limit</label>
                    <input 
                      type="number" 
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
