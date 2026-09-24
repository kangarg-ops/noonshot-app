"use client";
import { useState, useEffect } from "react";

export default function BaristaPortal() {
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load store from localStorage if exists
    const savedStore = localStorage.getItem("noonShot_store");
    if (savedStore) {
      setSelectedStore(JSON.parse(savedStore));
    }

    // Fetch stores and items
    Promise.all([
      fetch("/api/stores").then((res) => res.json()),
      fetch("/api/items").then((res) => res.json()),
    ]).then(([storesData, itemsData]) => {
      setStores(storesData);
      setItems(itemsData);
      setLoading(false);
    });
  }, []);

  const handleStoreSelect = (store: any) => {
    localStorage.setItem("noonShot_store", JSON.stringify(store));
    setSelectedStore(store);
  };

  const logoutStore = () => {
    localStorage.removeItem("noonShot_store");
    setSelectedStore(null);
    setOrderItems({});
  };

  const handleQtyChange = (zsku: string, qty: number) => {
    setOrderItems((prev) => ({
      ...prev,
      [zsku]: qty,
    }));
  };

  const submitOrder = async () => {
    const payloadItems = Object.entries(orderItems)
      .filter(([_, qty]) => qty > 0)
      .map(([zsku, qty]) => {
        // Substitute logic: if item is not in stock, replace with substitute if available
        const item = items.find((i) => i.item_zsku === zsku);
        if (item && !item.in_stock && item.substitute_zsku) {
          return { item_zsku: item.substitute_zsku, zsku_qty: qty };
        }
        return { item_zsku: zsku, zsku_qty: qty };
      });

    if (payloadItems.length === 0) {
      alert("Please add at least one item to order.");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ds_code: selectedStore.ds_code,
          items: payloadItems,
        }),
      });

      if (res.ok) {
        alert("Order submitted successfully!");
        setOrderItems({}); // Reset form
      } else {
        alert("Failed to submit order.");
      }
    } catch (e) {
      alert("Error submitting order.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // STORE SELECTION VIEW
  if (!selectedStore) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mt-10 border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-center">Select Your Store</h1>
        <div className="space-y-4">
          {stores.map((store) => (
            <button
              key={store.ds_code}
              onClick={() => handleStoreSelect(store)}
              className="w-full text-left p-4 rounded-lg bg-noonGray hover:bg-noonYellow transition border border-gray-300 font-semibold"
            >
              {store.ds_name} <span className="text-sm text-gray-500 font-normal">({store.ds_code})</span>
            </button>
          ))}
          {stores.length === 0 && (
            <p className="text-gray-500 text-center">No stores available.</p>
          )}
        </div>
      </div>
    );
  }

  // ORDERING VIEW
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">New Order</h1>
          <p className="text-gray-600">
            Store: <span className="font-semibold">{selectedStore.ds_name}</span> ({selectedStore.ds_code})
          </p>
        </div>
        <button
          onClick={logoutStore}
          className="text-sm text-red-600 hover:underline"
        >
          Change Store
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.item_zsku} className="flex justify-between items-center p-4 bg-noonGray rounded border border-gray-300">
            <div className="flex items-center space-x-4">
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.product_title} className="w-16 h-16 object-cover rounded" />
              )}
              <div>
                <h3 className="font-semibold">{item.product_title}</h3>
                <p className="text-sm text-gray-500">SKU: {item.item_zsku}</p>
                {!item.in_stock && item.substitute_zsku && (
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    Out of stock. Will be substituted.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded hover:bg-gray-400 font-bold"
                onClick={() => handleQtyChange(item.item_zsku, Math.max(0, (orderItems[item.item_zsku] || 0) - 1))}
              >
                -
              </button>
              <input
                type="number"
                min="0"
                value={orderItems[item.item_zsku] || ""}
                placeholder="0"
                onChange={(e) => handleQtyChange(item.item_zsku, parseInt(e.target.value) || 0)}
                className="w-16 text-center border p-1 rounded"
              />
              <button
                className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded hover:bg-gray-400 font-bold"
                onClick={() => handleQtyChange(item.item_zsku, (orderItems[item.item_zsku] || 0) + 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 text-center">No items available.</p>}
      </div>

      <button
        onClick={submitOrder}
        className="w-full bg-noonYellow text-noonBlack font-bold py-3 rounded-lg hover:bg-yellow-400 transition"
      >
        Submit Order
      </button>
    </div>
  );
}
