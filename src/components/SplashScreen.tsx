import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const STORAGE_KEY = "splash-shown-v1";

export function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    setShow(true);
    sessionStorage.setItem(STORAGE_KEY, "1");
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--navy) 85%, white) 0%, var(--navy) 60%, #0a1530 100%)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
        >
          {/* زرار تخطي */}
          <button
            onClick={() => setShow(false)}
            className="absolute top-5 left-5 text-xs font-semibold px-4 py-2 rounded-full border hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.25)" }}
          >
            Skip
          </button>

          {/* هالة ذهبية */}
          <motion.div
            className="absolute h-[600px] w-[600px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--brand-gold) 40%, transparent) 0%, transparent 65%)",
              filter: "blur(40px)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 0.9, 0.7] }}
            transition={{ duration: 2.4, ease: "easeOut" }}
          />

          {/* نجوم متطايرة */}
          {Array.from({ length: 14 }).map((_, i) => {
            const angle = (i / 14) * Math.PI * 2;
            const radius = 220 + (i % 3) * 40;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{ color: "var(--brand-gold)" }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ x: [0, x], y: [0, y], opacity: [0, 1, 0], scale: [0, 1, 0.6] }}
                transition={{ duration: 2.6, delay: 0.8 + i * 0.04, ease: "easeOut" }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            );
          })}

          {/* الكتاب */}
          <div className="relative" style={{ perspective: "1400px", width: 280, height: 360 }}>
            {/* الخلفية */}
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{
                background: "linear-gradient(135deg, color-mix(in oklab, var(--navy) 70%, black), var(--navy))",
                boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), inset 0 0 0 1px color-mix(in oklab, var(--brand-gold) 30%, transparent)",
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />

            {/* اللوجو جوه */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-6"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.img
                src={logo}
                alt="Logo"
                className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(217,178,93,0.6)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
              />
            </motion.div>

            {/* الغلاف الشمال */}
            <motion.div
              className="absolute inset-y-0 left-0 w-1/2 origin-right rounded-l-xl"
              style={{
                background: "linear-gradient(135deg, var(--brand-gold), color-mix(in oklab, var(--brand-gold) 70%, white))",
                boxShadow: "inset -8px 0 20px -10px rgba(0,0,0,0.4), inset 0 0 0 1px color-mix(in oklab, var(--navy) 20%, transparent)",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: -160 }}
              transition={{ delay: 1.0, duration: 1.1, ease: [0.7, 0, 0.3, 1] }}
            />

            {/* الغلاف اليمين */}
            <motion.div
              className="absolute inset-y-0 right-0 w-1/2 origin-left rounded-r-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(225deg, var(--brand-gold), color-mix(in oklab, var(--brand-gold) 70%, white))",
                boxShadow: "inset 8px 0 20px -10px rgba(0,0,0,0.4), inset 0 0 0 1px color-mix(in oklab, var(--navy) 20%, transparent)",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 160 }}
              transition={{ delay: 1.0, duration: 1.1, ease: [0.7, 0, 0.3, 1] }}
            >
              <motion.div
                className="font-extrabold text-3xl"
                style={{ color: "var(--navy)" }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 0.9, duration: 0.3 }}
              >
                MHS
              </motion.div>
            </motion.div>
          </div>

          {/* اسم البراند تحت */}
          <motion.div
            className="absolute bottom-[18%] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.6, ease: "easeOut" }}
          >
            <div className="font-extrabold text-2xl md:text-3xl tracking-wide" style={{ color: "var(--brand-gold)" }}>
              YOUR BRAND
            </div>
            <div className="mt-1 text-xs tracking-[0.35em]" style={{ color: "rgba(255,255,255,0.7)" }}>
              YOUR TAGLINE
            </div>
          </motion.div>

          {/* فلاش أبيض في الآخر */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ delay: 3.5, duration: 0.5, times: [0, 0.5, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
