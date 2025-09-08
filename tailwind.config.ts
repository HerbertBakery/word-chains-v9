import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:"#eef6ff",100:"#d9eaff",200:"#b9d7ff",300:"#8bbaff",400:"#5e9cff",
          500:"#3b82f6",600:"#2563eb",700:"#1d4ed8",800:"#1e40af",900:"#1e3a8a",
        },
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.06)" },
      borderRadius: { "2xl": "1rem" },
    },
  },
  plugins: [],
};

export default config;
