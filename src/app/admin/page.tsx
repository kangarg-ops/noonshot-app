"use client";
import { useState, useEffect } from "react";

export default function AdminPortal() {
  const [cutoffTime, setCutoffTime] = useState("19:00");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form states
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  
  const [itemZsku, setItemZsku] = useState("");
  const [itemBarcode, setItemBarcode] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemSub, setItemSub] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.cutoffTime) {
          setCutoffTime(data.cutoffTime);
        }
      });
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
        body: JSON.stringify({ ds_code: storeCode, ds_name: storeName }),
      });
      if (res.ok) {
        alert("Store added successfully!");
        setStoreCode("");
        setStoreName("");
      } else {
        alert("Failed to add store. Check if code already exists.");
      }
    } catch (e) {
      alert("Error adding store.");
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
          substitute_zsku: itemSub 
        }),
      });
      if (res.ok) {
        alert("Ingredient added successfully!");
        setItemZsku("");
        setItemBarcode("");
        setItemTitle("");
        setItemSub("");
      } else {
        alert("Failed to add ingredient. Check if SKU already exists.");
      }
    } catch (e) {
      alert("Error adding ingredient.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

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
          <button
            onClick={saveSettings}
            className="bg-noonBlack text-white px-6 py-2 rounded font-semibold hover:bg-gray-800"
          >
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
          <button
            onClick={downloadReport}
            className="bg-noonYellow text-noonBlack px-6 py-2 rounded font-bold hover:bg-yellow-400"
          >
            Download Excel Report
          </button>
        </div>
      </div>
      
      {/* Manage Stores */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Add New Store</h2>
        <form onSubmit={addStore} className="space-y-4">
          <div className="flex space-x-4">
            <input type="text" placeholder="DS Code (e.g. DXB-01)" required value={storeCode} onChange={(e) => setStoreCode(e.target.value)} className="border p-2 rounded w-1/3" />
            <input type="text" placeholder="Store Name" required value={storeName} onChange={(e) => setStoreName(e.target.value)} className="border p-2 rounded w-2/3" />
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">Add Store</button>
        </form>
      </div>

      {/* Manage Items */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Add New Ingredient</h2>
        <form onSubmit={addItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Item ZSKU" required value={itemZsku} onChange={(e) => setItemZsku(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Barcode (pbarcode)" required value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Product Title" required value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="border p-2 rounded col-span-2" />
            <input type="text" placeholder="Substitute ZSKU (Optional)" value={itemSub} onChange={(e) => setItemSub(e.target.value)} className="border p-2 rounded col-span-2" />
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">Add Ingredient</button>
        </form>
      </div>
    </div>
  );
}
