import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./Popup";
import { initPageTheme } from "@/lib/theme";
import "@/styles/globals.css";

void initPageTheme();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Context-X popup root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
