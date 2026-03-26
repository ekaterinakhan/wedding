import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import PrivateBoards from "./PrivateBoards";
import AdminGuests from "./AdminGuests";
import "./index.css";

function Root() {
  const [path, setPath] = useState(window.location.pathname);
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    const onPopState = () => { setPath(window.location.pathname); setHash(window.location.hash); };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    return () => { window.removeEventListener("hashchange", onHashChange); window.removeEventListener("popstate", onPopState); };
  }, []);

  if (path === "/admin" || path.startsWith("/admin/")) return <AdminGuests />;
  if (hash.startsWith("#/private/guests")) return <AdminGuests />;
  if (hash.startsWith("#/private/")) return <PrivateBoards />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
