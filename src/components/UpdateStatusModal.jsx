// src/components/UpdateStatusModal.jsx
import React from "react";

export default function UpdateStatusModal({ show, currentStatus, onClose, onConfirm }) {
  if (!show) return null;

  const handleConfirm = (newStatus) => {
    if (newStatus) {
      onConfirm(newStatus);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }} // Transparent dark overlay
    >
      <div className="bg-white rounded-xl shadow-lg p-6 w-80 max-w-full text-center relative animate-fadeIn">
        <h3 className="text-lg font-semibold mb-4">Update Status</h3>
        <p className="mb-4">Current status: <strong>{currentStatus}</strong></p>
        <select
          className="w-full p-2 border rounded-md mb-4"
          onChange={(e) => handleConfirm(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Select new status</option>
          <option value="Missing">🟥 Missing</option>
          <option value="Found">🟩 Found</option>
          <option value="Looking for family">🟨 Looking for Family</option>
        </select>
        <div className="flex justify-center gap-4">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => handleConfirm(document.querySelector("select").value)}
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}