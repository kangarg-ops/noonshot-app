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
