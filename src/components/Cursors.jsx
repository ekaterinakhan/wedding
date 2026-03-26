import { useEffect, memo } from "react";
import { motion, useSpring, useMotionValue, AnimatePresence } from "framer-motion";
import { useFirebaseCursors } from "../hooks/useFirebaseCursors";

const OtherCursor = memo(function OtherCursor({ id, cursor }) {
  const x = useMotionValue(cursor.x ?? -9999);
  const y = useMotionValue(cursor.y ?? -9999);
  const springX = useSpring(x, { stiffness: 180, damping: 28, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 180, damping: 28, mass: 0.6 });

  useEffect(() => {
    x.set(cursor.x ?? -200);
    y.set(cursor.y ?? -200);
  }, [cursor.x, cursor.y, x, y]);

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        x: springX,
        y: springY,
        pointerEvents: "none",
        zIndex: 9999,
        userSelect: "none",
        transform: "translate(-50%, -50%)",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Cursor dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(93, 52, 38, 0.5)",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* Country flag */}
        {cursor.cc ? (
          <img
            src={`https://flagcdn.com/24x18/${cursor.cc}.png`}
            srcSet={`https://flagcdn.com/48x36/${cursor.cc}.png 2x`}
            alt=""
            width={24}
            height={18}
            style={{
              display: "block",
              filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
              transform: "translate(6px, -10px)",
              pointerEvents: "none",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 22,
              lineHeight: 1,
              display: "block",
              filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
              transform: "translate(6px, -10px)",
            }}
          >
            🌍
          </span>
        )}
      </div>
    </motion.div>
  );
}, (prev, next) => prev.cursor.x === next.cursor.x && prev.cursor.y === next.cursor.y && prev.cursor.cc === next.cursor.cc);

export function Cursors() {
  const cursors = useFirebaseCursors();
  const entries = Object.entries(cursors);

  if (entries.length === 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      <AnimatePresence>
        {entries.map(([id, cursor]) => (
          <OtherCursor key={id} id={id} cursor={cursor} />
        ))}
      </AnimatePresence>
    </div>
  );
}
