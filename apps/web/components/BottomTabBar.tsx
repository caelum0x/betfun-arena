"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { triggerHaptic } from "../lib/utils";

interface TabItem {
  href: string;
  icon: string;
  label: string;
  isSpecial?: boolean; // For the create button
}

const tabs: TabItem[] = [
  { href: "/feed", icon: "🏠", label: "Home" },
  { href: "/create", icon: "⚔️", label: "Create", isSpecial: true },
  { href: "/leaderboard", icon: "🏆", label: "Top" },
  { href: "/profile", icon: "👤", label: "Profile" },
];

/**
 * Bottom Tab Bar Component
 * USERFLOW.md spec: 64px height, blur bg, active icon purple
 * Microinteractions: bounce on mount, haptic feedback
 */
export function BottomTabBar() {
  const pathname = usePathname();

  const handleTabClick = () => {
    triggerHaptic("light");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-dark-gray/95 backdrop-blur-sm border-t border-medium-gray flex items-center justify-around h-16 z-50">
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.href || 
          (tab.href === "/feed" && pathname === "/") ||
          (tab.href === "/leaderboard" && pathname?.startsWith("/leaderboard")) ||
          (tab.href === "/profile" && pathname?.startsWith("/profile"));

        if (tab.isSpecial) {
          // Special floating create button
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={handleTabClick}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-full bg-electric-purple flex items-center justify-center -mt-6 shadow-glow-purple"
              >
                <span className="text-3xl">{tab.icon}</span>
              </motion.div>
              <span className="text-xs font-medium text-transparent">Create</span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={handleTabClick}
            className="flex flex-col items-center gap-1 py-2 px-4"
          >
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ 
                scale: isActive ? 1.1 : 1,
                y: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
              className="relative"
            >
              <span className="text-2xl">{tab.icon}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-electric-purple"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </motion.div>
            <span
              className={`text-xs ${
                isActive
                  ? "text-electric-purple font-medium"
                  : "text-light-gray"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

