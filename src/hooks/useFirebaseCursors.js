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

export function useFirebaseCursors() {
  const [cursors, setCursors] = useState({});
  const myIdRef = useRef(null);
  const cursorDbRef = useRef(null);
  const flagRef = useRef("🌍");
  const lastWriteRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    // Skip if Firebase isn't configured
    if (!import.meta.env.VITE_FIREBASE_DATABASE_URL) return;

    let id = sessionStorage.getItem("cursor-id");
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("cursor-id", id);
    }
    myIdRef.current = id;

    const app = initFirebase();
    const db = getDatabase(app);
    const cursorRef = ref(db, `cursors/${id}`);
    cursorDbRef.current = cursorRef;

    const initCursor = async () => {
      let flag = sessionStorage.getItem("cursor-flag");
      if (!flag) {
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
        flag = countryToFlag(countryCode);
        sessionStorage.setItem("cursor-flag", flag);
      }
      flagRef.current = flag;

      onDisconnect(cursorRef).remove();
      await set(cursorRef, {
        x: -9999,
        y: -9999,
        flag: flagRef.current,
        t: Date.now(),
      });
    };

    initCursor();

    const cursorsRef = ref(db, "cursors");
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const others = Object.fromEntries(
        Object.entries(data).filter(([k]) => k !== id)
      );
      setCursors(others);
    });

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
            t: Date.now(),
          });
        });
        return;
      }

      lastWriteRef.current = now;
      set(cursorDbRef.current, {
        x: e.pageX,
        y: e.pageY,
        flag: countryToFlag(countryCodeRef.current),
        t: now,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unsubscribe();
      if (cursorDbRef.current) remove(cursorDbRef.current);
    };
  }, []);

  return cursors;
}
