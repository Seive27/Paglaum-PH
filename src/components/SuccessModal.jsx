// src/components/SuccessModal.jsx
import React from "react";

export default function SuccessModal({ show, message, onClose }) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }} // transparent dark overlay
    >
      <div className="bg-white rounded-xl shadow-lg p-6 w-80 max-w-full text-center relative animate-fadeIn">
        <h2 className="text-xl font-bold text-green-600 mb-3">Success!</h2>
        <p className="text-gray-700">{message}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
