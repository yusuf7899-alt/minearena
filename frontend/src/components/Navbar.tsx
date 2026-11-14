import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { LogOut, User as UserIcon, Menu } from "lucide-react";
import { Button } from "./Button";

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Overview", path: "/" },
    { name: "Workbench", path: "/workbench" },
    { name: "Directory", path: "/companies" },
    { name: "Upload", path: "/upload" },
    { name: "Privacy", path: "/privacy" },
    { name: "Terms", path: "/terms" },
  ];

  return (
    <header className="sticky top-3 z-30 px-3 max-w-7xl mx-auto w-full">
      <nav
        aria-label="Top navigation"
        className="bg-white/95 backdrop-blur-md rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-md px-4 py-2.5 flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Open sidebar menu"
            className="md:hidden p-1.5 rounded-lg text-[#405881] hover:text-[#273869] hover:bg-[#EDF1F4] transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Moneta Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.svg"
              alt="Moneta"
              className="w-8 h-8 rounded-lg object-contain bg-[#273869] p-1 shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base text-[#273869] leading-tight">
                MONETA
              </span>
              <span className="text-[9px] tracking-wider font-semibold text-[#405881] uppercase hidden sm:block">
                Pre-Audit Agent
              </span>
            </div>
          </Link>
        </div>

        {/* Sliding Pill Navigation */}
        <div className="hidden lg:flex items-center bg-[#EDF1F4] rounded-full p-1 border border-[rgba(64,88,129,0.08)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                  isActive ? "text-[#273869]" : "text-[#405881] hover:text-[#273869]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="topNavPill"
                    className="absolute inset-0 bg-white rounded-full shadow-soft-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Auth / Action */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF1F4] text-[#273869] text-xs font-semibold hover:bg-[#E2E7EC] transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#405881]" />
                <span className="max-w-[110px] truncate">{user.full_name || user.email}</span>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 text-[#405881] hover:text-[#B91C1C] rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:inline-block px-3 py-1.5 text-xs font-semibold text-[#273869] hover:text-[#405881] transition-colors"
              >
                Sign In
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/workbench")}
              >
                Open Terminal
              </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
