import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Search, UserPlus, X, LogOut, LayoutDashboard, BookOpen, Package } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useApp } from "@/lib/providers";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { theme, toggleTheme, t, lang, toggleLang } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    navigate({ to: "/search", search: { q } });
    setSearchOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-20 lg:h-24 gap-4">
          <Logo />

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Nav links */}
            <Link
              to="/courses"
              className="text-sm font-semibold hover:text-primary transition-colors hidden sm:inline-flex items-center gap-1 px-3"
            >
              <BookOpen className="h-4 w-4" />
              {lang === "ar" ? "كورسات" : "Courses"}
            </Link>
            <Link
              to="/bundles"
              className="text-sm font-semibold hover:text-primary transition-colors hidden sm:inline-flex items-center gap-1 px-3"
            >
              <Package className="h-4 w-4" />
              {lang === "ar" ? "باقات" : "Bundles"}
            </Link>

            {/* Theme toggle pill */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="relative h-9 w-16 rounded-full border border-border bg-secondary/80 transition-colors overflow-hidden"
            >
              <span
                className={`absolute inset-y-1 ${theme === "dark" ? "end-1" : "start-1"} h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-[0_12px_22px_-10px_rgba(0,0,0,0.35)] transition-all duration-300 flex items-center justify-center`}
              >
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <span className="absolute inset-y-0 start-3 flex items-center justify-center text-[11px] font-semibold text-muted-foreground opacity-80">
                ☀
              </span>
              <span className="absolute inset-y-0 end-3 flex items-center justify-center text-[11px] font-semibold text-muted-foreground opacity-80">
                ☾
              </span>
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className="h-9 px-3 rounded-full bg-secondary border border-border text-xs font-bold tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {lang === "ar" ? "EN" : "ع"}
            </button>






            {/* Creative expanding search */}
            <form
              onSubmit={submitSearch}
              className={`relative flex items-center transition-all duration-500 ease-out ${
                searchOpen ? "w-56 md:w-72" : "w-9"
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={lang === "ar" ? "ابحث عن كورس، ملزمة، درس..." : "Search courses, notes, lessons..."}
                onBlur={() => { if (!searchValue) setSearchOpen(false); }}
                className={`absolute inset-0 h-9 w-full rounded-full bg-secondary/80 backdrop-blur-sm border border-border ps-9 pe-16 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all ${
                  searchOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />
              <button
                type={searchOpen ? "submit" : "button"}
                aria-label="Search"
                onClick={() => { if (!searchOpen) setSearchOpen(true); }}
                className={`relative z-10 h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer group ${
                  searchOpen
                    ? "text-primary"
                    : "bg-gradient-to-br from-primary to-[color:var(--primary-glow)] text-primary-foreground shadow-elegant hover:scale-105"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-full ${
                    searchOpen ? "" : "bg-primary/30 blur-md -z-10 animate-pulse"
                  }`}
                />
                <Search className="h-4 w-4" />
              </button>


              {/* Keyboard hint */}
              <kbd
                className={`absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none hidden md:flex items-center gap-1 h-6 px-1.5 rounded-md bg-background border border-border text-[10px] font-mono text-muted-foreground transition-opacity ${
                  searchOpen ? "opacity-100" : "opacity-0"
                }`}
              >
                ⌘K
              </kbd>

              {searchOpen && (
                <button
                  type="button"
                  aria-label="Close search"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearchOpen(false)}
                  className="absolute end-9 top-1/2 -translate-y-1/2 md:hidden text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-semibold text-brand-gold hover:underline underline-offset-4 hidden sm:inline-flex items-center gap-1"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {lang === "ar" ? "لوحتي" : "Dashboard"}
                </Link>
                <Button
                  size="sm"
                  onClick={signOut}
                  variant="outline"
                  className="h-10 px-4 rounded-full gap-2 text-sm font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  {lang === "ar" ? "خروج" : "Logout"}
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-brand-gold hover:underline underline-offset-4 hidden sm:inline"
                >
                  {t("nav.login")}
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="h-10 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm font-semibold"
                >
                  <Link to="/register">
                    <UserPlus className="h-4 w-4" />
                    {t("nav.register")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
