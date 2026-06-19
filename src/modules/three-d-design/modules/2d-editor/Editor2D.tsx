/**
 * Editor2D — host frame for the Konva-based DesignStudio2D.
 * Owns ONLY the resize-observer; all CAD logic lives in DesignStudio2D.
 */

import { useEffect, useRef, useState } from 'react';
import DesignStudio2D from './DesignStudio2D';

export default function Editor2D() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="h-full w-full">
      {size.width > 0 && size.height > 0 && (
        <DesignStudio2D width={size.width} height={size.height} />
      )}
    </div>
  );
}
