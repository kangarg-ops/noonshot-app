import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        noonYellow: "#fee000",
        noonBlack: "#000000",
        noonGray: "#f4f4f4"
      }
    },
  },
  plugins: [],
};
export default config;
