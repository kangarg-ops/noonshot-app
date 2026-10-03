"use client";
import { useState, useEffect } from "react";

export default function BaristaPortal() {
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/stores").then((res) => res.json()).then(setStores);
    fetch("/api/items").then((res) => res.json()).then(setItems);
  }, []);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ds_code = e.target.value;
    const store = stores.find(s => s.ds_code === ds_code);
    setSelectedStore(store);
    setCart({}); // Reset cart on store change
  };

  const updateCart = (zsku: string, qty: number, max: number | null) => {
    if (qty < 0) return;
    if (max !== null && qty > max) {
      alert(`Maximum order limit for this item is ${max}`);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [zsku]: qty,
    }));
  };

  const submitOrder = async () => {
    if (!selectedStore) return;
    setIsSubmitting(true);
    
    // Prepare items, substituting if out of stock
    const orderPayloadItems = [];
    for (const [zsku, qty] of Object.entries(cart)) {
      if (qty > 0) {
        const item = items.find(i => i.item_zsku === zsku);
        if (item && !item.in_stock && item.substitute_zsku) {
          orderPayloadItems.push({ item_zsku: item.substitute_zsku, zsku_qty: qty });
        } else {
          orderPayloadItems.push({ item_zsku: zsku, zsku_qty: qty });
        }
      }
    }

    if (orderPayloadItems.length === 0) {
      alert("Cart is empty");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ds_code: selectedStore.ds_code,
          items: orderPayloadItems
        }),
      });

      if (res.ok) {
        alert("Order submitted successfully!");
        setCart({});
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit order");
      }
    } catch (e) {
      alert("Error submitting order");
    }
    setIsSubmitting(false);
  };

  // Filter items based on selected store type
  const filteredItems = items.filter(item => {
    if (!selectedStore) return false;
    if (item.item_type === "GENERAL") return true;
    if (selectedStore.store_type === "NATIVE" && item.item_type === "NATIVE_ONLY") return true;
    if (selectedStore.store_type === "SHOT" && item.item_type === "SHOT_ONLY") return true;
    return false;
  });

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-noonYellow text-noonBlack p-6 rounded-b-xl shadow-md mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight mb-2">noonSHOT Ordering</h1>
        <p className="font-medium text-gray-800">Daily Ingredient Requisition Portal</p>
      </div>

      {/* Store Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-2">Select Your Store</label>
        <select 
          className="w-full border-2 border-gray-300 p-3 rounded-lg bg-gray-50 focus:outline-none focus:border-noonBlack font-medium"
          onChange={handleStoreChange}
          defaultValue=""
        >
          <option value="" disabled>-- Choose a store --</option>
          {stores.map((s) => (
            <option key={s.ds_code} value={s.ds_code}>
              {s.ds_name} ({s.ds_code}) {s.store_type === "NATIVE" ? "⭐ NATIVE" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Item List by Category */}
      {selectedStore && (
        <>
          {Object.entries(groupedItems).map((entry) => {
            const category = entry[0];
            const catItems = entry[1] as any[];
            return (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-bold mb-4 border-b-2 border-noonYellow pb-2 inline-block">
                {category.replace("_", " ")}
              </h2>
              <div className="space-y-4">
                {catItems.map((item) => (
                  <div key={item.item_zsku} className="flex justify-between items-center p-4 bg-noonGray rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-4">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.product_title} className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800">{item.product_title}</h3>
                        {item.brand && <p className="text-xs font-semibold text-blue-600">{item.brand}</p>}
                        <p className="text-xs text-gray-500 font-medium">SKU: {item.item_zsku}</p>
                        
                        {!item.in_stock ? (
                          item.substitute_zsku ? (
                            <p className="text-xs text-orange-600 font-bold mt-1 bg-orange-100 inline-block px-2 py-0.5 rounded">
                              Will be substituted automatically
                            </p>
                          ) : (
                            <p className="text-xs text-red-600 font-bold mt-1 bg-red-100 inline-block px-2 py-0.5 rounded">
                              Out of Stock
                            </p>
                          )
                        ) : null}

                        {item.max_qty && (
                          <p className="text-xs text-blue-600 font-medium mt-1">Limit: {item.max_qty} per order</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-white border rounded-lg p-1">
                      <button
                        onClick={() => updateCart(item.item_zsku, (cart[item.item_zsku] || 0) - 1, item.max_qty)}
                        disabled={!item.in_stock && !item.substitute_zsku}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-lg">
                        {cart[item.item_zsku] || 0}
                      </span>
                      <button
                        onClick={() => updateCart(item.item_zsku, (cart[item.item_zsku] || 0) + 1, item.max_qty)}
                        disabled={!item.in_stock && !item.substitute_zsku}
                        className="w-8 h-8 flex items-center justify-center bg-noonYellow rounded text-noonBlack font-bold hover:bg-yellow-400 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })}

          {/* Sticky Checkout Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center max-w-3xl mx-auto z-50">
            <div>
              <p className="text-sm text-gray-500 font-bold">Total Items</p>
              <p className="text-2xl font-black">{totalItems}</p>
            </div>
            <button
              onClick={submitOrder}
              disabled={totalItems === 0 || isSubmitting}
              className="bg-noonBlack text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Order"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
