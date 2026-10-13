                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => updateCart(item.item_zsku, (cart[item.item_zsku] || 0) - 1, item.max_qty)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-sm">
                      {cart[item.item_zsku] || 0}
                    </span>
                    <button 
                      onClick={() => updateCart(item.item_zsku, (cart[item.item_zsku] || 0) + 1, item.max_qty)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
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
