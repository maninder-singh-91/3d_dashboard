import React from "react";
import ReactDOM from "react-dom/client";
import ConsoleEntry from "./components/ConsoleEntry";
import ErrorBoundary from "./components/ErrorBoundary";
import { arViewModel } from "./lib/arView";
const ArView = React.lazy(() => import("./components/ArView"));
const arModel = arViewModel(window.location.search);
import "./styles.css";
import "./fynd-theme.css";
import "./batch-generation.css";
import "./import-products.css";
import "./todo-task.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {arModel ? <React.Suspense fallback={<p>Loading AR view…</p>}><ArView modelUrl={arModel} name={new URLSearchParams(window.location.search).get("name") || "Product"} /></React.Suspense> : <ConsoleEntry />}
    </ErrorBoundary>
  </React.StrictMode>,
);
