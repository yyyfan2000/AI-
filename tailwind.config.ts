import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        mist: "#f6f7f9",
        moss: "#3d6b4f",
        coral: "#e66b5b",
        amber: "#f4b860",
        lagoon: "#2c7a7b"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
