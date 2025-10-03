// src/components/QuickLinks.jsx
import React from "react";
import { FiHelpCircle, FiMapPin } from "react-icons/fi";

export default function QuickLinks({ onRequest, onPin }) {
  return (
    <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
      {/* Request Help Button */}
      <button
        onClick={onRequest}
        className="flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-7 rounded-full shadow-lg transition-all duration-200 transform hover:-translate-y-1"
      >
        <FiHelpCircle className="w-7 h-7" />
        <span className="text-lg">Request Help</span>
      </button>

      {/* Pin Location Button */}
      <button
        onClick={onPin}
        className="flex items-center gap-3 bg-[#1A3D7C] hover:bg-[#15305C] text-white font-semibold py-4 px-7 rounded-full shadow-lg transition-all duration-200 transform hover:-translate-y-1"
      >
        <FiMapPin className="w-7 h-7" />
        <span className="text-lg">Pin Location</span>
      </button>
    </div>
  );
}
