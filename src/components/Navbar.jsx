import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/paglaumhub 3.png"; // adjust path if needed
import { FiMenu, FiX } from "react-icons/fi";

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Crisis Map" },
    { to: "/requests", label: "Requests" },
    { to: "/shelters", label: "Shelters" },
    { to: "/family-locator", label: "Find My Family" },
  ];

  return (
    <nav className="bg-[var(--paglaum-navy)] text-white shadow-md fixed w-full z-20">
      <div className="container mx-auto flex justify-between items-center px-4 py-3">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src={logo}
            alt="Paglaum Hub Logo"
            className="h-8 w-8 object-contain"
          />
          <span className="text-xl font-extrabold tracking-wide text-[var(--paglaum-gray)]">
            Paglaum PH
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`transition-colors ${
                location.pathname === link.to
                  ? "text-[var(--paglaum-orange)] font-semibold"
                  : "hover:text-[var(--paglaum-orange)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--paglaum-navy)] px-4 pb-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block transition-colors ${
                location.pathname === link.to
                  ? "text-[var(--paglaum-orange)] font-semibold"
                  : "hover:text-[var(--paglaum-orange)]"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
