import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Image,
  UploadCloud,
  ArrowRightLeft,
  Cpu,
  Shield,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/photos", label: "Photos", icon: Image },
  { to: "/upload", label: "Upload File", icon: UploadCloud },
  { to: "/files", label: "Transfers", icon: ArrowRightLeft },
  { to: "/compute", label: "Compute Nodes", icon: Cpu },
];

export default function Sidebar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  function isActive(path: string) {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-[#0f172a]/90 text-slate-300 shadow-md backdrop-blur-md transition-all duration-300 hover:bg-slate-800 hover:text-white ${
          open ? "left-[268px]" : "left-4"
        }`}
        aria-label="Toggle navigation"
      >
        {open ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-[#0f172a] text-slate-200 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">HomeMesh</h1>
              <p className="text-[11px] font-medium tracking-wide text-slate-400">
                Personal Cloud OS
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-slate-800" />

        {/* Navigation */}
        <nav className="mt-5 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500 pl-3"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <IconComponent className={`h-4 w-4 ${active ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="border-t border-slate-800 p-4">
          {user && (
            <div className="mb-3 flex items-center gap-2.5 px-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-blue-400 border border-slate-700">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <p className="truncate text-xs font-medium text-slate-300">{user.email}</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}