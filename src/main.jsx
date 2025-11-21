// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";           // your admin app
import Viewer from "./Viewer/Viewer"; // public viewer (adjust path if you placed Viewer.jsx elsewhere)
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* keep App at root path; viewer path mounts public viewer */}
        <Route path="/*" element={<App />} />
        <Route path="/viewer/*" element={<Viewer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
