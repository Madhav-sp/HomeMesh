import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-4 z-50 rounded-lg border border-white/10 bg-[#171a21] p-2 text-white transition-all ${
          open ? "left-[270px]" : "left-4"
        }`}
      >
        {open ? "←" : "☰"}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#111318] p-5 text-white transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <h1 className="text-xl font-bold">HomeMesh</h1>
          <p className="mt-1 text-xs text-gray-500">
            Device Monitor
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
          >
            Dashboard
          </Link>
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          {user && (
            <p className="mb-3 truncate text-xs text-gray-500">
              {user.email}
            </p>
          )}

          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}