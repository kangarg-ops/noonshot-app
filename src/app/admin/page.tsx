"use client";
import { useState, useEffect } from "react";

export default function AdminPortal() {
  const [cutoffTime, setCutoffTime] = useState("19:00");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

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
        <p className="text-sm text-gray-500 mt-2">
          Orders submitted after this time will roll over to the next day's report.
        </p>
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
        <p className="text-sm text-gray-500 mt-2">
          Downloads all aggregated orders for the selected date window (Yesterday's Cut-off to Selected Date's Cut-off).
          Applies MAX quantity logic for multiple submissions from the same store.
        </p>
      </div>
      
      {/* Informational Section for other CRUD */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Manage Catalog & Stores</h2>
        <p className="text-gray-600 mb-4">
          Item and Store management UI can be added here. For now, they are managed directly via the database (or Prisma Studio).
        </p>
      </div>
    </div>
  );
}
