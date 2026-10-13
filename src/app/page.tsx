"use client";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    const savedEmail = localStorage.getItem("noon_user_email");
    if (savedEmail) {
      setUserEmail(savedEmail.toLowerCase());
    }

    fetch("/api/stores").then((res) => res.json()).then(data => {
      if (Array.isArray(data)) setStores(data);
    });
    fetch("/api/items").then((res) => res.json()).then(data => {
      if (Array.isArray(data)) setItems(data);
    });
    fetch("/api/admins").then((res) => res.json()).then(data => {
      if (Array.isArray(data)) setAdmins(data.map((a: any) => a.email.toLowerCase()));
    });
  }, []);

  useEffect(() => {
    if (!userEmail || stores.length === 0) return;

    const normalizedEmail = userEmail.trim().toLowerCase();
    const isUserAdmin = admins.includes(normalizedEmail) || normalizedEmail === "kangarg@noon.com";
    const matched = stores.find(s => s.email && s.email.trim().toLowerCase() === normalizedEmail);

    if (matched) {
      setSelectedStore(matched);
      setIsAdminMode(isUserAdmin);
    } else if (isUserAdmin) {
      setIsAdminMode(true);
      if (!selectedStore && stores.length > 0) {
        setSelectedStore(stores[0]);
      }
    }
  }, [userEmail, stores, admins]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const email = loginInput.trim().toLowerCase();
    if (!email.endsWith("@noon.com")) {
      setLoginError("Access restricted. Please use your official @noon.com email address.");
      return;
    }

    const matched = stores.find(s => s.email && s.email.trim().toLowerCase() === email);
    const isUserAdmin = admins.includes(email) || email === "kangarg@noon.com";

    if (matched) {
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setSelectedStore(matched);
      setIsAdminMode(isUserAdmin);
    } else if (isUserAdmin) {
      localStorage.setItem("noon_user_email", email);
      setUserEmail(email);
      setIsAdminMode(true);
      if (stores.length > 0) setSelectedStore(stores[0]);
    } else {
      setLoginError("This email is not assigned to any cafe store. Please contact your manager or admin.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("noon_user_email");
    setUserEmail("");
    setSelectedStore(null);
    setCart({});
    setIsAdminMode(false);
  };

  const updateCart = (zsku: string, qty: number, max: number | null) => {
    const finalQty = Math.max(0, isNaN(qty) ? 0 : qty); // Strictly minimum 0
    if (max !== null && max !== undefined && max > 0 && finalQty > max) {
      alert(`Maximum order limit for this item is ${max}`);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [zsku]: finalQty,
    }));
  };

  const submitOrder = async () => {
    if (!selectedStore) return;
    setIsSubmitting(true);
    
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

  const filteredItems = items.filter(item => {
    if (!selectedStore) return false;
    if (item.item_type === "GENERAL") return true;
    if (selectedStore.store_type === "NATIVE" && item.item_type === "NATIVE_ONLY") return true;
    if (selectedStore.store_type === "SHOT" && item.item_type === "SHOT_ONLY") return true;
    return false;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  if (!userEmail) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-block bg-yellow-400 text-black font-extrabold px-3 py-1 rounded-lg text-lg tracking-wider">
              noonSHOT
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cafe Ordering Portal</h1>
            <p className="text-sm text-gray-500">
              Please enter your official noon store email to proceed.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Store Email ID
              </label>
              <input
                type="email"
                placeholder="cafe-Downtown@noon.com"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg text-xs font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition duration-150 shadow"
            >
              Sign In with noon Email
            </button>
          </form>

          <div className="text-center text-xs text-gray-400">
            Restricted to authorized @noon.com cafe accounts.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Logged In Header Banner */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-yellow-400 text-black font-extrabold px-2 py-0.5 rounded">
              noonSHOT
            </span>
            {selectedStore && (
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                selectedStore.store_type === "NATIVE" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>
                {selectedStore.store_type === "NATIVE" ? "NATIVE (SUBKO Collab)" : "SHOT Store"}
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-gray-800">
            {selectedStore ? `${selectedStore.ds_name} (${selectedStore.ds_code})` : "Selecting store..."}
          </div>
          <div className="text-xs text-gray-500">
            Logged in as: <span className="font-medium text-gray-700">{userEmail}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAdminMode && (
            <a
              href="/admin"
              className="text-xs bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
            >
              ⚙️ Admin Portal
            </a>
          )}

          {isAdminMode && stores.length > 0 && (
            <select
              value={selectedStore?.ds_code || ""}
              onChange={(e) => {
                const s = stores.find(st => st.ds_code === e.target.value);
                if (s) {
                  setSelectedStore(s);
                  setCart({});
                }
              }}
              className="border p-1.5 rounded text-xs bg-gray-50 font-medium"
            >
              {stores.map(s => (
                <option key={s.ds_code} value={s.ds_code}>
                  {s.ds_name} ({s.store_type})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleLogout}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Special Window Notice for NATIVE stores */}
      {selectedStore?.store_type === "NATIVE" && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center space-x-3">
          <span className="text-2xl">☕</span>
          <div>
            <h4 className="font-bold text-purple-900 text-sm">NATIVE Store Catalog Active</h4>
            <p className="text-xs text-purple-700">
              This store is configured as a NATIVE location. Exclusive SUBKO coffee beans and NATIVE-branded packaging are unlocked below.
            </p>
          </div>
        </div>
      )}

      {/* Product List Grouped by Category */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border text-gray-400">
          No items currently available for this store type.
        </div>
      ) : (
        (Object.entries(groupedItems) as [string, any[]][]).map(([category, catItems]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-black tracking-wide text-gray-800 uppercase mb-3 flex items-center space-x-2">
              <span>{category.replace('_', ' ')}</span>
              <span className="text-xs font-normal text-gray-400">({catItems.length})</span>
            </h2>

            <div className="space-y-3">
              {catItems.map((item) => (
                <div key={item.item_zsku} className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 transition">
                  <div className="flex items-center space-x-4">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.product_title} className="w-16 h-16 object-cover rounded-lg border" />
                    )}
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">{item.product_title}</h3>
                      <div className="flex items-center space-x-2 flex-wrap mt-0.5">
                        {item.brand && (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {item.brand}
                          </span>
                        )}
                        {item.unit_size && item.unit_type && (
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            {item.unit_size} {item.unit_type}
                          </span>
                        )}
                        {item.max_qty && (
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            Max: {item.max_qty}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">SKU: {item.item_zsku}</p>
                      
                      {!item.in_stock && (
                        <div className="mt-1">
                          {item.substitute_zsku ? (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              OOS (Will substitute with SKU: {item.substitute_zsku})
                            </span>
                          ) : (
                            <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controls - Min 0 */}
                  <div className="flex items-center space-x-1.5">
                    <button 
                      type="button"
                      onClick={() => updateCart(item.item_zsku, (cart[item.item_zsku] || 0) - 1, item.max_qty)}
                      disabled={(cart[item.item_zsku] || 0) <= 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={item.max_qty || undefined}
                      value={cart[item.item_zsku] ?? 0}
                      onChange={(e) => updateCart(item.item_zsku, parseInt(e.target.value) || 0, item.max_qty)}
                      className="w-14 text-center font-bold text-sm border rounded py-1 bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                    <button 
                      type="button"
                      onClick={() => updateCart(item.item_zsku, (cart[item.item_zsku] || 0) + 1, item.max_qty)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Floating Bottom Order Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg flex justify-between items-center max-w-3xl mx-auto rounded-t-2xl z-40">
          <div>
            <div className="text-xs text-gray-500">Ordering for</div>
            <div className="font-bold text-gray-800 text-sm">
              {selectedStore?.ds_name} ({totalItems} item{totalItems > 1 ? 's' : ''})
            </div>
          </div>
          <button
            onClick={submitOrder}
            disabled={isSubmitting}
            className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold shadow hover:bg-yellow-500 transition duration-150 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : `Submit Order (${totalItems})`}
          </button>
        </div>
      )}
    </div>
  );
}
