"use client";
import { useState, useEffect } from "react";

export default function AdminPortal() {
  const [cutoffTime, setCutoffTime] = useState("19:00");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form states
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [storeType, setStoreType] = useState("SHOT");
  
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

  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);

  const loadData = () => {
    fetch("/api/stores").then(r => r.json()).then(setStores);
    fetch("/api/items").then(r => r.json()).then(setItems);
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data && data.cutoffTime) setCutoffTime(data.cutoffTime);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const downloadReport = () => {
    window.open(`/api/report?date=${reportDate}`, "_blank");
  };

  const addStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ds_code: storeCode, ds_name: storeName, store_type: storeType }),
      });
      if (res.ok) {
        alert("Store added successfully!");
        setStoreCode("");
        setStoreName("");
        loadData();
      } else {
        alert("Failed to add store. Check if code already exists.");
      }
    } catch (e) {
      alert("Error adding store.");
    }
  };

  const removeStore = async (ds_code: string) => {
    if (!confirm("Are you sure you want to deactivate this store?")) return;
    try {
      await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ds_code, isActive: false }),
      });
      loadData();
    } catch (e) {
      alert("Error removing store");
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          item_zsku: itemZsku, pbarcode: itemBarcode, product_title: itemTitle, 
          brand: itemBrand, unit_size: itemUnitSize, unit_type: itemUnitType,
          imageUrl: itemImage, substitute_zsku: itemSub,
          item_type: itemType, category: itemCategory, max_qty: itemMaxQty 
        }),
      });
      if (res.ok) {
        alert("Item added successfully!");
        setItemZsku(""); setItemBarcode(""); setItemTitle(""); setItemBrand(""); setItemUnitSize(""); setItemUnitType("ml"); setItemImage(""); setItemSub(""); setItemMaxQty("");
        loadData();
      } else {
        alert("Failed to add item. Check if SKU already exists.");
      }
    } catch (e) {
      alert("Error adding item.");
    }
  };

  const toggleStock = async (item_zsku: string, current_stock: boolean) => {
    try {
      await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_zsku, in_stock: !current_stock }),
      });
      loadData();
    } catch (e) {
      alert("Error updating stock");
    }
  };

  const removeItem = async (item_zsku: string, product_title: string) => {
    if (!confirm(`Are you sure you want to permanently remove "${product_title}"?`)) return;
    try {
      await fetch(`/api/items?item_zsku=${encodeURIComponent(item_zsku)}`, { method: "DELETE" });
      loadData();
    } catch (e) {
      alert("Error removing item");
    }
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      if (res.ok) {
        alert("Item updated successfully!");
        setEditingItem(null);
        loadData();
      } else {
        alert("Failed to update item.");
      }
    } catch (e) {
      alert("Error updating item");
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-3 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Edit Item</h2>
            <p className="text-xs text-gray-400 mb-2">SKU: {editingItem.item_zsku}</p>
            <input type="text" placeholder="Product Title" value={editingItem.product_title || ""} onChange={e => setEditingItem({...editingItem, product_title: e.target.value})} className="border p-2 rounded w-full" />
            <input type="text" placeholder="Brand" value={editingItem.brand || ""} onChange={e => setEditingItem({...editingItem, brand: e.target.value})} className="border p-2 rounded w-full" />
            <div className="flex space-x-2">
              <input type="text" placeholder="Unit Size (e.g. 250)" value={editingItem.unit_size || ""} onChange={e => setEditingItem({...editingItem, unit_size: e.target.value})} className="border p-2 rounded w-1/2" />
              <select value={editingItem.unit_type || "ml"} onChange={e => setEditingItem({...editingItem, unit_type: e.target.value})} className="border p-2 rounded w-1/2 bg-white">
                <option value="ml">ml</option>
                <option value="L">Litres (L)</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
            <input type="text" placeholder="Barcodes (comma separated)" value={editingItem.pbarcode || ""} onChange={e => setEditingItem({...editingItem, pbarcode: e.target.value})} className="border p-2 rounded w-full" />
            <input type="url" placeholder="Image URL" value={editingItem.imageUrl || ""} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} className="border p-2 rounded w-full" />
            <input type="text" placeholder="Substitute ZSKU" value={editingItem.substitute_zsku || ""} onChange={e => setEditingItem({...editingItem, substitute_zsku: e.target.value})} className="border p-2 rounded w-full" />
            <input type="number" placeholder="Max Order Qty" value={editingItem.max_qty || ""} onChange={e => setEditingItem({...editingItem, max_qty: e.target.value})} className="border p-2 rounded w-full" />
            <select value={editingItem.category || "INGREDIENTS"} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="border p-2 rounded w-full bg-white">
              <option value="INGREDIENTS">Ingredients</option>
              <option value="COFFEE_BEANS">Coffee Beans</option>
              <option value="PACKAGING">Packaging</option>
            </select>
            <select value={editingItem.item_type || "GENERAL"} onChange={e => setEditingItem({...editingItem, item_type: e.target.value})} className="border p-2 rounded w-full bg-white">
              <option value="GENERAL">Available to ALL stores</option>
              <option value="SHOT_ONLY">SHOT stores only</option>
              <option value="NATIVE_ONLY">NATIVE stores only</option>
            </select>
            <div className="flex space-x-3 pt-2">
              <button onClick={saveEdit} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex-1">Save Changes</button>
              <button onClick={() => setEditingItem(null)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-bold hover:bg-gray-300 flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <div className="flex items-end space-x-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Daily Cut-off Time
            </label>
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="border p-2 rounded w-48"
            />
          </div>
          <button onClick={saveSettings} className="bg-noonBlack text-white px-6 py-2 rounded font-semibold hover:bg-gray-800">
            Save
          </button>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Export Daily Orders Report</h2>
        <div className="flex items-end space-x-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border p-2 rounded w-48"
            />
          </div>
          <button onClick={downloadReport} className="bg-noonYellow text-noonBlack px-6 py-2 rounded font-bold hover:bg-yellow-400">
            Download Excel Report
          </button>
        </div>
      </div>
      
      {/* Manage Stores */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Add New Store</h2>
        <form onSubmit={addStore} className="space-y-4">
          <div className="flex space-x-4">
            <input type="text" placeholder="DS Code (e.g. DXB-01)" required value={storeCode} onChange={(e) => setStoreCode(e.target.value)} className="border p-2 rounded w-1/4" />
            <input type="text" placeholder="Store Name" required value={storeName} onChange={(e) => setStoreName(e.target.value)} className="border p-2 rounded w-2/4" />
            <select value={storeType} onChange={(e) => setStoreType(e.target.value)} className="border p-2 rounded w-1/4 bg-white">
              <option value="SHOT">Standard SHOT</option>
              <option value="NATIVE">NATIVE (SUBKO)</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">Add Store</button>
        </form>

        <h3 className="font-bold mt-6 mb-2">Active Stores List</h3>
        <div className="max-h-48 overflow-y-auto border rounded p-2">
          {stores.map(s => (
            <div key={s.ds_code} className="flex justify-between items-center p-2 border-b last:border-0 text-sm">
              <div><span className="font-bold">{s.ds_name}</span> ({s.ds_code}) - <span className="text-blue-600">{s.store_type}</span></div>
              <button onClick={() => removeStore(s.ds_code)} className="text-red-500 hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Items */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Add New Item</h2>
        <form onSubmit={addItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Item ZSKU" required value={itemZsku} onChange={(e) => setItemZsku(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Barcodes (comma separated)" required value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Product Title" required value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="border p-2 rounded col-span-2" />
            <input type="text" placeholder="Brand (e.g. SUBKO, noonSHOT)" value={itemBrand} onChange={(e) => setItemBrand(e.target.value)} className="border p-2 rounded col-span-2" />
            <div className="flex space-x-2 col-span-2">
              <input type="text" placeholder="Unit Size (e.g. 250, 1)" value={itemUnitSize} onChange={(e) => setItemUnitSize(e.target.value)} className="border p-2 rounded w-1/2" />
              <select value={itemUnitType} onChange={(e) => setItemUnitType(e.target.value)} className="border p-2 rounded w-1/2 bg-white">
                <option value="ml">ml</option>
                <option value="L">Litres (L)</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
            <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="border p-2 rounded bg-white">
              <option value="INGREDIENTS">Category: Ingredients</option>
              <option value="COFFEE_BEANS">Category: Coffee Beans</option>
              <option value="PACKAGING">Category: Packaging</option>
            </select>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="border p-2 rounded bg-white">
              <option value="GENERAL">Available to ALL stores</option>
              <option value="SHOT_ONLY">Available to SHOT stores only</option>
              <option value="NATIVE_ONLY">Available to NATIVE stores only</option>
            </select>
            <input type="url" placeholder="Image URL (Optional)" value={itemImage} onChange={(e) => setItemImage(e.target.value)} className="border p-2 rounded" />
            <input type="number" placeholder="Order Limit / Max Qty (Optional)" value={itemMaxQty} onChange={(e) => setItemMaxQty(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Substitute ZSKU (Optional)" value={itemSub} onChange={(e) => setItemSub(e.target.value)} className="border p-2 rounded col-span-2" />
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">Add Item</button>
        </form>

        <h3 className="font-bold mt-6 mb-2">Item Management (OOS & Limits)</h3>
        <div className="max-h-64 overflow-y-auto border rounded p-2">
          {items.map(i => (
            <div key={i.item_zsku} className="flex justify-between items-center p-3 border-b last:border-0 bg-gray-50 mb-2 rounded">
              <div className="w-1/2">
                <div className="font-bold text-sm">{i.product_title}</div>
                <div className="text-xs text-gray-500">{i.item_zsku} {i.brand && <span className="text-blue-500 font-semibold">| {i.brand}</span>} | {i.category} | {i.item_type}</div>
              </div>
              <div className="flex items-center space-x-3 w-1/2 justify-end">
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 mb-1">Limit</label>
                  <input type="number" placeholder="No limit" defaultValue={i.max_qty || ""} 
                    onBlur={(e) => updateMaxQty(i.item_zsku, e.target.value)}
                    className="border p-1 rounded w-20 text-center text-sm" />
                </div>
                <button 
                  onClick={() => toggleStock(i.item_zsku, i.in_stock)}
                  className={`px-3 py-1 text-sm rounded font-bold ${i.in_stock ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                >
                  {i.in_stock ? "In Stock" : "Out of Stock"}
                </button>
                <button
                  onClick={() => setEditingItem({...i})}
                  className="px-3 py-1 text-sm rounded font-bold bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                  title="Edit item"
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeItem(i.item_zsku, i.product_title)}
                  className="px-3 py-1 text-sm rounded font-bold bg-gray-100 text-red-500 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
