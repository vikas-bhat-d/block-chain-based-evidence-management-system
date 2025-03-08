import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Login from "./pages/LoginPage/Login.jsx";
import { Web3Provider } from "./context/Web3Context";
import FileSystem from "./pages/RepositoryPage/FileSystem.jsx";
import { UserProvider } from "./context/UserContext.jsx";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserProvider>
      <Web3Provider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />}></Route>
            <Route path="/home" element={<App />}></Route>
            <Route path="/case/:id" element={<FileSystem />}></Route>
          </Routes>
        </BrowserRouter>
      </Web3Provider>
    </UserProvider>
  </StrictMode>
);
