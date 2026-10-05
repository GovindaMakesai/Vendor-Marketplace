import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/auth-context";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/vendors", label: "Vendors" },
  { to: "/work-requirements", label: "Requirements" },
];

function navClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-white/10 text-white" : "text-stone-300 hover:bg-white/5 hover:text-white"}`;
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="relative bg-ink text-white md:min-h-screen">
        <div className="flex items-center justify-between gap-4 px-5 py-5 md:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Operations</p>
            <h1 className="mt-1 text-lg font-semibold leading-tight">Vendor Recommendation</h1>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:px-3 md:pb-28">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `block whitespace-nowrap ${navClass(isActive)}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 md:block md:absolute md:bottom-0 md:w-[240px]">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-stone-400">{user?.email}</p>
          <button type="button" className="mt-3 text-sm text-teal-200" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <div>
        <div className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <p className="text-sm font-medium">{user?.name}</p>
          <button type="button" className="text-sm text-accent" onClick={logout}>
            Log out
          </button>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
