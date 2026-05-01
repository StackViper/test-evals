"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { Activity } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-blue-500/20">
              <Activity size={20} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white">HEALOS<span className="text-blue-500">BENCH</span></span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label }) => {
              const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link 
                  key={to} 
                  href={to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? "text-white bg-white/5" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
