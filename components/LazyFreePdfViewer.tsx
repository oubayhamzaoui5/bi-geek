'use client';
import dynamic from 'next/dynamic';

const LazyFreePdfViewer = dynamic(() => import('./FreePdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
      Loading PDF viewer…
    </div>
  ),
});

export default LazyFreePdfViewer;
