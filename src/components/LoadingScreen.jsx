// src/components/LoadingScreen.jsx
import React from "react";
import paglaumhub3 from "../assets/paglaumhub 3.png"; // Adjust the path to your logo file

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "#0d1b2a" }} // Custom background color
    >
      <div className="text-center">
        <img
          src={paglaumhub3}
          alt="PaglaumHub Logo"
          className="w-32 h-auto mb-6" // Adjust size as needed
        />
        <div className="flex justify-center gap-2">
          <div className="dot-jump bg-[#e94e1b] w-4 h-4 rounded-full"></div>
          <div className="dot-jump bg-[#e94e1b] w-4 h-4 rounded-full" style={{ animationDelay: "0.2s" }}></div>
          <div className="dot-jump bg-[#e94e1b] w-4 h-4 rounded-full" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  );
}