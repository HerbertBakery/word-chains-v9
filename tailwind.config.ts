import type { Config } from "tailwindcss";
export default { content:["./app/**/*.{js,ts,jsx,tsx}","./components/**/*.{js,ts,jsx,tsx}"], theme:{ extend:{ colors:{ brand:{500:"#22a885",600:"#14886d",700:"#126c58"}}, boxShadow:{soft:"0 10px 24px -8px rgba(0,0,0,0.12)"} } }, plugins:[] } satisfies Config;
