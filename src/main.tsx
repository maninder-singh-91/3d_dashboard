import React from "react";
import ReactDOM from "react-dom/client";
import ConsoleEntry from "./components/ConsoleEntry";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles.css";
import "./fynd-theme.css";
import "./batch-generation.css";
import "./import-products.css";
import "./todo-task.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConsoleEntry />
    </ErrorBoundary>
  </React.StrictMode>,
);
