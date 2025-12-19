'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  createRef,
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  file: string;
  height?: string | number; // total viewer height (use "100%" from parent)
};

export default function FreePdfViewer({ file, height = '100%' }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(1);

  // --- Smooth zoom model ---
  // visualScale: applied via CSS transform (instant, no rerender)
  // renderScale: used to compute <Page width>, updated after debounce (rerender)
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.15;

  const [visualScale, setVisualScale] = useState(1);
  const [renderScale, setRenderScale] = useState(1);
  const [commitTick, setCommitTick] = useState(0); // bump to trigger debounce

  // scroll + width measurement
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef<HTMLDivElement | null>(null);
  const [baseWidth, setBaseWidth] = useState(0);

  useLayoutEffect(() => {
    const el = widthRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth; // excludes vertical scrollbar
      if (w > 0) setBaseWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // reset on file change
  useEffect(() => {
    setNumPages(0);
    setVisualScale(1);
    setRenderScale(1);
    setActivePage(1);
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [file]);

  // refs for pages (scroll / observe)
  const pageRefs = useMemo(
    () => Array.from({ length: numPages }, () => createRef<HTMLDivElement>()),
    [numPages]
  );

  // observe visible page
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || numPages === 0) return;
    const observers: IntersectionObserver[] = [];
    pageRefs.forEach((ref, idx) => {
      const el = ref.current;
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio >= 0.6) {
              setActivePage(idx + 1);
            }
          });
        },
        { root: scroller, threshold: [0.6] }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [pageRefs, numPages]);

  // goto page
  const scrollToPage = (n: number) => {
    const target = pageRefs[n - 1]?.current;
    if (!scrollRef.current || !target) return;
    // Account for visualScale when scrolling: scroll container is at scaled coords,
    // so we can simply use scrollIntoView; pages are inside a scaled wrapper starting at (0,0)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // page input
  const [pageInput, setPageInput] = useState('1');
  useEffect(() => setPageInput(String(activePage)), [activePage]);
  const commitPageInput = () => {
    const n = Math.max(1, Math.min(numPages || 1, Number(pageInput) || 1));
    scrollToPage(n);
  };

  // toolbar zoom helpers (update visual instantly; schedule commit)
  const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
  const scheduleCommit = () => setCommitTick((t) => t + 1);

  const zoomIn = () => {
    setVisualScale((s) => {
      const next = clamp(s + ZOOM_STEP);
      scheduleCommit();
      return next;
    });
  };
  const zoomOut = () => {
    setVisualScale((s) => {
      const next = clamp(s - ZOOM_STEP);
      scheduleCommit();
      return next;
    });
  };
  const fitWidth = () => {
    setVisualScale(1);
    scheduleCommit();
  };

  // pinch-to-zoom (smooth, visual only)
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // only trackpad pinch gestures
      e.preventDefault();

      const oldV = visualScale;
      const factor = 1 + (-e.deltaY) / 1000;
      const newV = clamp(oldV * factor);
      if (Math.abs(newV - oldV) < 0.001) return;

      // Zoom around pointer in *visual* space.
      const rect = scroller.getBoundingClientRect();
      const px = e.clientX - rect.left + scroller.scrollLeft;
      const py = e.clientY - rect.top + scroller.scrollTop;

      const k = newV / oldV;
      setVisualScale(newV);

      // Adjust scroll to keep pointer content stationary
      requestAnimationFrame(() => {
        scroller.scrollLeft = px * k - (e.clientX - rect.left);
        scroller.scrollTop = py * k - (e.clientY - rect.top);
      });

      // Debounce commit to re-render at the new scale when user stops zooming
      scheduleCommit();
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel as any);
  }, [visualScale]);

  // Debounced commit: after 200ms idle, re-render pages at visualScale (no flash)
  useEffect(() => {
    const id = setTimeout(() => {
      setRenderScale((prev) => {
        if (Math.abs(prev - visualScale) < 0.001) return prev;
        return visualScale;
      });
    }, 200);
    return () => clearTimeout(id);
  }, [commitTick, visualScale]);

  // Compute page width from *render* scale; CSS scales visually to visualScale
  const pageWidth =
    baseWidth > 0 ? Math.max(1, Math.floor(baseWidth * renderScale)) : 0;

  // document callbacks
  type OnLoadSuccessArg = Parameters<
    NonNullable<React.ComponentProps<typeof Document>['onLoadSuccess']>
  >[0];
  const handleLoadSuccess = ({ numPages }: OnLoadSuccessArg) => setNumPages(numPages);
  const handleDocError = (e: unknown) => console.error('Document error:', e);

  const prev = () => activePage > 1 && scrollToPage(activePage - 1);
  const next = () => activePage < numPages && scrollToPage(activePage + 1);

  // dynamic input width (in ch units) with clamps
  const [pageInputLen, setPageInputLen] = useState(1);
  useEffect(() => setPageInputLen(String(activePage).length), [activePage]);
  const inputCh = Math.min(6, Math.max(1, pageInputLen));

  // CSS scale applied relative to rendered pages
  const visualFactor = renderScale > 0 ? visualScale / renderScale : 1;

  return (
    <div className="relative bg-transparent overflow-hidden" style={{ height }}>
      {/* Scroll area (viewer) */}
      <div ref={scrollRef} className="pdf-scroll h-full w-full overflow-auto bg-transparent">
        {/* Width measuring rail (full width). Pages live inside. */}
        <div ref={widthRef} className="w-full max-w-full bg-transparent px-0 mx-auto">
          <Document
            file={file}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleDocError}
            onSourceError={handleDocError}
            loading={<div className="h-[30vh] flex items-center justify-center text-white/70">Loading…</div>}
            error={
              <div className="h-[30vh] flex items-center justify-center text-red-400">
                Failed to load PDF.
              </div>
            }
          >
            {numPages > 0 && pageWidth > 0 ? (
              /* This wrapper scales visually (instant) while pages rerender lazily. */
              <div
                className="space-y-6"
                style={{
                  transformOrigin: '0 0',
                  transform: `scale(${visualFactor})`,
                  willChange: 'transform',
                }}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} ref={pageRefs[i]}>
                    <Page
                      pageNumber={i + 1}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      renderMode="canvas"
                      onLoadError={(e) => console.error(`Page ${i + 1} onLoadError`, e)}
                      onRenderError={(e) => console.error(`Page ${i + 1} onRenderError`, e)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[30vh]" />
            )}
          </Document>

          {/* Sticky, centered-to-PAGE navigation (inside scroll area) */}
          <div className="sticky bottom-4 pointer-events-none">
            <div
              style={{ width: (pageWidth * visualFactor) || undefined, margin: '0 auto' }}
              className="flex justify-center"
            >
              <div
                className="
                  pointer-events-auto flex items-center gap-2 rounded-full
                  bg-black/60 px-3 py-2 shadow-lg border border-white/10
                  backdrop-blur-md transition-colors
                "
                role="toolbar"
                aria-label="PDF navigation"
              >
                <button
                  onClick={prev}
                  className="px-2 py-1 rounded hover:bg-white/10 text-white"
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Page input: [ current ] / total */}
                <div className="flex items-center gap-2 text-white">
                  <input
                    value={pageInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '');
                      setPageInput(v);
                    }}
                    onBlur={commitPageInput}
                    onKeyDown={(e) => e.key === 'Enter' && commitPageInput()}
                    className="text-center bg-white/10 focus:bg-white/15 outline-none rounded px-2 py-1 font-mono"
                    inputMode="numeric"
                    aria-label="Current page"
                    style={{ width: `${inputCh}ch` }}
                  />
                  <div className="w-px h-5 bg-white/80 mx-1" />
                  <span className="opacity-80 tabular-nums">{numPages || '—'}</span>
                </div>

                <button
                  onClick={next}
                  className="px-2 py-1 rounded hover:bg-white/10 text-white"
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="w-px h-5 bg-white/40 mx-1" />
                <button
                  onClick={zoomOut}
                  className="px-2 py-1 rounded hover:bg-white/10 text-white"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={fitWidth}
                  className="px-2 py-1 rounded hover:bg-white/10 text-white"
                  aria-label="Fit width"
                  title="Fit width"
                >
                  100%
                </button>
                <button
                  onClick={zoomIn}
                  className="px-2 py-1 rounded hover:bg-white/10 text-white"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          {/* End sticky nav */}
        </div>
      </div>
    </div>
  );
}
