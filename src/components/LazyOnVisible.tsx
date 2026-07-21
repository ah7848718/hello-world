import { useEffect, useRef, useState, type ComponentType } from "react";

export function LazyOnVisible({
  load,
  minHeight = 400,
  rootMargin = "400px",
}: {
  load: () => Promise<ComponentType<any>>;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [Comp, setComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    if (!ref.current || visible) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  useEffect(() => {
    if (visible && !Comp) {
      load().then((C) => setComp(() => C));
    }
  }, [visible, Comp, load]);

  return (
    <div ref={ref} style={{ minHeight: Comp ? undefined : minHeight }}>
      {Comp ? <Comp /> : null}
    </div>
  );
}
