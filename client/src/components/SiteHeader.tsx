import { Menu, Plus, ShieldCheck, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import V3ryaMark from "@/components/V3ryaMark";

const links = [
  {
    label: "Discover",
    mobileLabel: "Discover",
    path: "/browse",
    secondary: false,
  },
  {
    label: "City guides",
    mobileLabel: "Guides",
    path: "/guides",
    secondary: false,
  },
  {
    label: "Your space",
    mobileLabel: "Your space",
    path: "/profile",
    secondary: false,
  },
  { label: "Safety", mobileLabel: "Safety", path: "/safety", secondary: true },
] as const;
const isActive = (location: string, path: string) =>
  location === path || location.startsWith(`${path}/`);

export default function SiteHeader() {
  const [location, setLocation] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const go = (path: string) => {
    setLocation(path);
    setOpen(false);
  };
  useEffect(() => {
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#080d1df2] backdrop-blur-xl">
      <div className="container relative flex h-[76px] items-center justify-between gap-5">
        <button
          onClick={() => go("/")}
          className="group flex items-center gap-3 text-left"
          aria-label="v3rya home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e1c687]/40 bg-[#e1c687]/10 text-[#e1c687] transition group-hover:bg-[#e1c687]/20">
            <V3ryaMark />
          </span>
          <span>
            <span className="block font-serif text-xl leading-none tracking-tight text-white">
              V3rya
            </span>
            <span className="mt-1 block text-[10px] font-medium tracking-[.18em] text-slate-500 uppercase">
              Private connections
            </span>
          </span>
        </button>
        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label="Main navigation"
        >
          {links.map(link => {
            const active = isActive(location, link.path);
            return (
              <button
                key={link.path}
                onClick={() => go(link.path)}
                aria-current={active ? "page" : undefined}
                className={`${link.secondary ? "ml-1 text-xs" : "text-sm"} border-b pb-1 transition ${active ? "border-[#e1c687] text-[#e1c687]" : "border-transparent text-slate-300 hover:border-white/25 hover:text-[#e1c687]"}`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {!loading && isAuthenticated ? (
            <>
              <button
                onClick={() => go("/post")}
                className="hidden items-center gap-2 rounded-xl bg-[#e1c687] px-4 py-2.5 text-sm font-semibold text-[#10172c] sm:flex"
              >
                <Plus className="h-4 w-4" />
                Create listing
              </button>
              <button
                onClick={() => go("/inbox")}
                className="hidden rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 md:block"
              >
                Messages
              </button>
              <button
                onClick={logout}
                className="hidden text-xs text-slate-500 lg:block"
              >
                Sign out
              </button>
              <button
                onClick={() => go("/profile")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-[#e1c687]"
              >
                {(user?.name || "V").slice(0, 1).toUpperCase()}
              </button>
            </>
          ) : (
            <Button
              onClick={() => startLogin()}
              className="hidden h-10 rounded-xl bg-[#e1c687] px-4 text-sm font-semibold text-[#10172c] sm:inline-flex"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {open && (
          <div
            id={menuId}
            role="dialog"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-[calc(100%+1px)] border-b border-white/10 bg-[#0b1124]/98 px-5 py-5 shadow-2xl backdrop-blur-xl md:hidden"
          >
            <nav className="grid gap-1">
              {links.map(link => {
                const active = isActive(location, link.path);
                return (
                  <button
                    key={link.path}
                    onClick={() => go(link.path)}
                    className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-left ${active ? "bg-[#e1c687]/12 text-[#e1c687]" : "text-slate-200"}`}
                  >
                    <span
                      className={
                        link.secondary
                          ? "text-sm text-slate-400"
                          : "text-base font-medium"
                      }
                    >
                      {link.mobileLabel}
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#e1c687]" />
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-white/10 pt-4">
              {isAuthenticated ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => go("/post")}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#e1c687] text-sm font-semibold text-[#10172c]"
                  >
                    <Plus className="h-4 w-4" />
                    Create listing
                  </button>
                  <button
                    onClick={() => go("/inbox")}
                    className="min-h-11 rounded-xl border border-white/10 text-sm text-slate-200"
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="col-span-2 min-h-10 text-sm text-slate-500"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setOpen(false);
                    startLogin();
                  }}
                  className="h-11 w-full rounded-xl bg-[#e1c687] text-sm font-semibold text-[#10172c]"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
