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
