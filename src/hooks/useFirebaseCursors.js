import { useEffect, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  onValue,
  remove,
  onDisconnect,
} from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

function initFirebase() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

export function countryToFlag(code) {
  if (!code || code.length !== 2 || code === "XX") return "🌍";
  try {
    return String.fromCodePoint(
      ...[...code.toUpperCase()].map((c) => 0x1f1e5 + c.charCodeAt(0) - 64)
    );
  } catch {
    return "🌍";
  }
}

export function normalizeCountryCode(code) {
  if (!code || code.length !== 2 || code === "XX") return null;
  return code.toLowerCase();
}

export function useFirebaseCursors() {
  const [cursors, setCursors] = useState({});
  const myIdRef = useRef(null);
  const cursorDbRef = useRef(null);
  const flagRef = useRef("🌍");
  const ccRef = useRef(null);
  const lastWriteRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    // Check for missing credentials
    const missingVars = [
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_DATABASE_URL",
      "VITE_FIREBASE_PROJECT_ID",
    ].filter((key) => !import.meta.env[key]);

    if (missingVars.length > 0) {
      console.error("[Cursors] Firebase not configured — missing env vars:", missingVars);
      return;
    }

    let mounted = true;

    let id = sessionStorage.getItem("cursor-id");
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("cursor-id", id);
    }
    myIdRef.current = id;

    let app, db;
    try {
      app = initFirebase();
      db = getDatabase(app);
    } catch (err) {
      console.error("[Cursors] Failed to initialize Firebase:", err);
      return;
    }

    const cursorRef = ref(db, `cursors/${id}`);
    cursorDbRef.current = cursorRef;

    const initCursor = async () => {
      let cc = sessionStorage.getItem("cursor-cc");
      let flag = sessionStorage.getItem("cursor-flag");
      if (!cc && !flag) {
        let countryCode = "XX";
        try {
          const res = await fetch("/api/country");
          if (res.ok) {
            const data = await res.json();
            countryCode = data.country || "XX";
          }
        } catch {
          // fallback to globe
        }
        if (!mounted) return;
        cc = normalizeCountryCode(countryCode);
        flag = countryToFlag(countryCode);
        sessionStorage.setItem("cursor-cc", cc || "");
        sessionStorage.setItem("cursor-flag", flag);
      }
      ccRef.current = cc || null;
      flagRef.current = flag || "🌍";

      if (!mounted) return;
      await onDisconnect(cursorRef).remove();
      if (!mounted) return;
      await set(cursorRef, {
        x: -9999,
        y: -9999,
        flag: flagRef.current,
        cc: ccRef.current,
        t: Date.now(),
      });
    };

    initCursor().catch((err) => {
      console.error("[Cursors] Failed to init cursor in Firebase:", err);
    });

    const cursorsRef = ref(db, "cursors");
    const unsubscribe = onValue(
      cursorsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const now = Date.now();
        const others = Object.fromEntries(
          Object.entries(data).filter(([k, v]) => k !== id && now - (v.t || 0) < 30000)
        );
        setCursors(others);
      },
      (err) => {
        console.error("[Cursors] Firebase onValue error (check DB rules or credentials):", err);
      }
    );

    const handleMouseMove = (e) => {
      if (!cursorDbRef.current) return;
      const now = Date.now();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (now - lastWriteRef.current < 66) {
        rafRef.current = requestAnimationFrame(() => {
          lastWriteRef.current = Date.now();
          set(cursorDbRef.current, {
            x: e.pageX,
            y: e.pageY,
            flag: flagRef.current,
            cc: ccRef.current,
            t: Date.now(),
          });
        });
        return;
      }

      lastWriteRef.current = now;
      set(cursorDbRef.current, {
        x: e.pageX,
        y: e.pageY,
        flag: flagRef.current,
        cc: ccRef.current,
        t: now,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      mounted = false;
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unsubscribe();
      if (cursorDbRef.current) remove(cursorDbRef.current);
    };
  }, []);

  return cursors;
}
