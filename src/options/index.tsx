import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Options } from "./Options";
import { initPageTheme } from "@/lib/theme";
import "@/styles/globals.css";

void initPageTheme();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Context-X options root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
