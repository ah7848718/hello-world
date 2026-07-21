import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  message: string;
}

export function AnnouncementBanner() {
  const { data } = useQuery({
    queryKey: ["site-announcements-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_announcements")
        .select("id, message")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as Announcement[];
    },
    refetchInterval: 30000,
  });

  const items = data ?? [];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (items.length <= 1) {
      setVisible(items.length > 0);
      setIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setVisible(true);
      }, 450);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (!items.length) return null;
  const current = items[idx];

  return (
    <div className="w-full px-4 pt-24 md:pt-28 pointer-events-none">
      <div className="mx-auto max-w-5xl">
        <div
          key={current.id}
          className={`pointer-events-auto relative flex items-center gap-3 rounded-full px-6 py-3.5 border border-border bg-card shadow-sm transition-all duration-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          <p
            className="flex-1 text-center font-medium text-sm md:text-base leading-tight"
          >
            {current.message}
          </p>
        </div>
      </div>
    </div>
  );
}
