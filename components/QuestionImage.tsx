"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface QuestionImageProps {
  src: string;
  alt?: string;
  className?: string;
}

type ImageState = "loading" | "loaded" | "error";

// ── 灯箱组件 ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // ESC 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 滚轮缩放
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale(s => Math.min(5, Math.max(0.5, s - e.deltaY * 0.001)));
  }

  // 拖拽平移
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  }

  function onMouseUp() {
    setDragging(false);
    dragStart.current = null;
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 工具栏 */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setScale(s => Math.min(5, s + 0.25))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors text-sm font-bold"
          title="放大"
        >+</button>
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors text-sm font-bold"
          title="缩小"
        >−</button>
        <button
          onClick={resetView}
          className="flex h-8 items-center justify-center rounded-full bg-white/20 px-3 text-white hover:bg-white/30 transition-colors text-xs"
          title="重置"
        >重置</button>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          title="关闭 (ESC)"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 缩放比例提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70">
        {Math.round(scale * 100)}% · 滚轮缩放 · 拖拽平移
      </div>

      {/* 图片容器 */}
      <div
        className="overflow-hidden"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.1s ease",
            maxWidth: "90vw",
            maxHeight: "85vh",
            userSelect: "none",
          }}
        />
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function QuestionImage({ src, alt = "image", className = "" }: QuestionImageProps) {
  const [state, setState] = useState<ImageState>("loading");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleClose = useCallback(() => setLightboxOpen(false), []);

  return (
    <>
      <span className="inline-block">
        {/* 骨架屏：加载中 */}
        {state === "loading" && (
          <span className="block h-40 w-64 animate-pulse rounded-lg bg-gray-200" />
        )}

        {/* 加载失败占位符 */}
        {state === "error" && (
          <span className="flex h-20 w-48 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            图片加载失败
          </span>
        )}

        {/* 实际图片：固定最大尺寸，点击放大 */}
        <span
          className={`relative inline-block ${state !== "loaded" ? "hidden" : ""}`}
          onClick={() => state === "loaded" && setLightboxOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`max-h-64 max-w-full cursor-zoom-in rounded-lg object-contain ${className}`}
            style={{ display: "block" }}
            onLoad={() => setState("loaded")}
            onError={() => setState("error")}
          />
          {/* 放大提示角标 */}
          {state === "loaded" && (
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white/80 pointer-events-none">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              点击放大
            </span>
          )}
        </span>

        {/* 隐藏的 img 用于触发 onLoad/onError（当 state=loading 时） */}
        {state === "loading" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="hidden"
            onLoad={() => setState("loaded")}
            onError={() => setState("error")}
          />
        )}
      </span>

      {/* 灯箱 */}
      {lightboxOpen && (
        <Lightbox src={src} alt={alt} onClose={handleClose} />
      )}
    </>
  );
}
