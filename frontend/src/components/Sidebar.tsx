import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  LayoutDashboard,
  Building2,
  User,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export interface NavSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: {
    label: string;
    path: string;
    badge?: string;
  }[];
}

const SECTIONS: NavSection[] = [
  {
    id: "audit",
    title: "Pre-Audit Core",
    icon: <LayoutDashboard className="w-4 h-4" />,
    items: [
      { label: "Four-Factor Ledger", path: "/workbench" },
      { label: "Tie-Out Matrix", path: "/workbench?tab=tieouts" },
      { label: "Confidence & XBRL", path: "/workbench?tab=metrics" },
      { label: "SEC Snippet Inspector", path: "/workbench?tab=evidence" },
      { label: "Audit Working Memo", path: "/workbench?tab=report" },
    ],
  },
  {
    id: "ingestion",
    title: "Filings & Ingestion",
    icon: <Building2 className="w-4 h-4" />,
    items: [
      { label: "SEC Benchmark Registry", path: "/companies" },
      { label: "Upload Statement (CSV/PDF)", path: "/upload" },
    ],
  },
  {
    id: "security",
    title: "Reviewer & Security",
    icon: <User className="w-4 h-4" />,
    items: [
      { label: "Reviewer Profile", path: "/account" },
      { label: "Access Terminal (Sign In)", path: "/login" },
      { label: "Register Reviewer", path: "/signup" },
      { label: "Credential Recovery", path: "/forgot-password" },
    ],
  },
  {
    id: "governance",
    title: "Governance & Legal",
    icon: <Shield className="w-4 h-4" />,
    items: [
      { label: "Platform Overview", path: "/" },
      { label: "Privacy & Data Boundary", path: "/privacy" },
      { label: "Terms & PCAOB Standard", path: "/terms" },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Desktop rail collapse toggle
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("moneta_sidebar_collapsed") === "true";
  });

  // Open accordion sections stored in localStorage
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("moneta_sidebar_sections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Default open all
    return { audit: true, ingestion: true, security: true, governance: true };
  });

  // Automatically expand the section matching current route
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    for (const section of SECTIONS) {
      const hasMatch = section.items.some((item) => {
        if (item.path.includes("?")) {
          return currentPath === item.path;
        }
        return location.pathname === item.path;
      });
      if (hasMatch) {
        setOpenSections((prev) => ({ ...prev, [section.id]: true }));
      }
    }
  }, [location.pathname, location.search]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem("moneta_sidebar_sections", JSON.stringify(openSections));
  }, [openSections]);

  useEffect(() => {
    localStorage.setItem("moneta_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    if (mobileOpen) {
      onMobileClose();
    }
  }, [location.pathname, location.search]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Keyboard navigation for accordion header
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSection(id);
    }
  };

  const isCurrent = (path: string) => {
    if (path.includes("?")) {
      return (location.pathname + location.search) === path;
    }
    return location.pathname === path && !location.search;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[rgba(64,88,129,0.12)] select-none">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-[rgba(64,88,129,0.08)]">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <img
            src="/logo.svg"
            alt="Moneta"
            className="w-8 h-8 rounded-lg object-contain bg-[#273869] p-1 shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-[#273869] leading-tight truncate">
                MONETA
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-[#405881] uppercase truncate">
                Pre-Audit Agent
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse to icon rail"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse to icon rail"}
          className="hidden md:flex p-1.5 rounded-lg text-[#405881] hover:text-[#273869] hover:bg-[#EDF1F4] transition-colors cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onMobileClose}
          aria-label="Close navigation drawer"
          className="md:hidden p-1.5 rounded-lg text-[#405881] hover:text-[#273869] hover:bg-[#EDF1F4] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 overflow-y-auto px-2.5 py-4 space-y-4"
      >
        {SECTIONS.map((section) => {
          const isOpen = openSections[section.id];
          const sectionHasActive = section.items.some((item) => isCurrent(item.path));

          if (collapsed) {
            return (
              <div key={section.id} className="relative group py-1 flex justify-center">
                <button
                  onClick={() => setCollapsed(false)}
                  title={section.title}
                  aria-label={section.title}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    sectionHasActive
                      ? "bg-[#273869] text-white shadow-soft-sm"
                      : "text-[#405881] hover:text-[#273869] hover:bg-[#EDF1F4]"
                  }`}
                >
                  {section.icon}
                </button>
              </div>
            );
          }

          return (
            <div key={section.id} className="space-y-1">
              {/* Accordion Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                onKeyDown={(e) => handleKeyDown(e, section.id)}
                aria-expanded={isOpen}
                aria-controls={`section-${section.id}`}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#273869] hover:bg-[#EDF1F4]/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#405881] group-hover:text-[#273869]">
                    {section.icon}
                  </span>
                  <span className="uppercase tracking-wider text-[11px]">
                    {section.title}
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: isOpen ? 0 : -90 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-[#405881]"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </button>

              {/* Accordion Content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`section-${section.id}`}
                    role="region"
                    aria-label={section.title}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden pl-3 space-y-0.5 border-l-2 border-[rgba(64,88,129,0.12)] ml-4"
                  >
                    {section.items.map((item, idx) => {
                      const active = isCurrent(item.path);
                      return (
                        <motion.div
                          key={item.path}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.15 }}
                        >
                          <Link
                            to={item.path}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              active
                                ? "bg-[#273869] text-white shadow-soft-sm font-bold"
                                : "text-[#405881] hover:text-[#273869] hover:bg-[#EDF1F4]"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                  active
                                    ? "bg-white/20 text-white"
                                    : "bg-[#EDF1F4] text-[#405881]"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Reviewer Session Footer */}
      <div className="p-3 border-t border-[rgba(64,88,129,0.08)] bg-[#EDF1F4]/40">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#273869] truncate">
                  {user.full_name || user.email}
                </div>
                <div className="text-[10px] text-[#405881] font-mono">
                  Lead Auditor
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-[#405881] hover:text-[#B91C1C] rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          !collapsed && (
            <Link
              to="/login"
              className="block w-full py-2 px-3 text-center bg-[#273869] hover:bg-[#1E2D55] text-white rounded-xl text-xs font-semibold shadow-soft-sm transition-colors"
            >
              Sign In Reviewer
            </Link>
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:block sticky top-0 h-screen z-40 transition-all duration-300 ease-out shrink-0 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer with Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 max-w-[85vw] h-full shadow-soft-lg z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
