import React from "react";
import ReactDOM from "react-dom/client";
import UaiConta from "./App.jsx";
import "./index.css";
import "./styles/part-1.css";
import "./styles/part-2.css";
import "./styles/part-3.css";
import "./styles/part-4.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><UaiConta /></React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => null));
}
