import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`flex items-center group ${className}`}
      aria-label="Mr. Hatem Sameka"
    >
      <img
        src={logo}
        alt="Mr. Hatem Sameka — English Learning Platform"
        width={160}
        height={160}
        className="h-16 lg:h-20 w-auto object-contain transition-transform group-hover:scale-105"
      />
    </Link>
  );
}
