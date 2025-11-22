import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // BetFun Arena Brand Colors
        'electric-purple': '#A020F0',
        'neon-green': '#39FF14',
        'sol-blue': '#14F195',
        'hot-pink': '#FF1493',
        'blood-red': '#DC143C',
        
        // Neutrals
        'true-black': '#000000',
        'dark-gray': '#1A1A1A',
        'medium-gray': '#2D2D2D',
        'light-gray': '#A0A0A0',
        
        // Semantic
        success: '#39FF14',
        error: '#DC143C',
        warning: '#FFD700',
        info: '#14F195',
        
        // Default theme
        background: '#000000',
        foreground: '#FFFFFF',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      height: {
        '18': '72px', // 18 * 4px = 72px
      },
      borderRadius: {
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(160, 32, 240, 0.5)',
        'glow-green': '0 0 20px rgba(57, 255, 20, 0.5)',
        'glow-blue': '0 0 20px rgba(20, 241, 149, 0.5)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.8)',
      },
      fontFamily: {
        header: ['"Eurostile"', '"Kabel"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        meme: ['"Impact"', 'sans-serif'],
      },
      fontSize: {
        'display': '64px',
        'h1': '48px',
        'h2': '36px',
        'h3': '24px',
        'body-large': '18px',
        'body-small': '14px',
      },
      animation: {
        'fadeInUp': 'fadeInUp 300ms ease-out',
        'pulse-slow': 'pulse 2s infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

