"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// 配置 NProgress
NProgress.configure({ showSpinner: false, trickleSpeed: 200, minimum: 0.08 });

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const current = pathname + searchParams.toString();
    if (prevPathRef.current !== null && prevPathRef.current !== current) {
      NProgress.done();
    }
    prevPathRef.current = current;
  }, [pathname, searchParams]);

  // 拦截 Link 点击，启动进度条
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || target.target === "_blank") return;
      NProgress.start();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <style>{`
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: #3b82f6;
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        border-radius: 0 2px 2px 0;
        box-shadow: 0 0 8px #3b82f6, 0 0 4px #3b82f6;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #3b82f6, 0 0 5px #3b82f6;
        opacity: 1;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}</style>
  );
}
