import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {BrowserRouter} from "react-router-dom";
import {PreferencesProvider} from "./context/PreferencesContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "bootstrap-icons/font/bootstrap-icons.css";


ReactDOM.createRoot(document.getElementById("root")).render(
<BrowserRouter>
<PreferencesProvider>
<App/>
</PreferencesProvider>
</BrowserRouter>
);
