'use client';

import { useSearchParams } from 'next/navigation';
import LazyFreePdfViewer from '@/components/LazyFreePdfViewer';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MessagesTab } from '@/components/messages-tab';
import { SidebarProvider } from "@/components/ui/sidebar-context"

export default function PDFViewerPage() {
  const params = useSearchParams();
  const file = params.get('file') || '/test.pdf';

  return (
    // Use h-dvh for mobile-safe “full window” height
    <SidebarProvider>
    <div className="flex h-dvh bg-background">
      <Sidebar />

      {/* Column layout that can actually shrink */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Header />

        {/* This region must stretch to the bottom */}
        <section className="flex-1 min-h-0 overflow-hidden">
          {/* If you want side/top padding but still touch bottom, avoid bottom padding */}
          <div className="h-full px-6 md:px-8 pt-6 pb-0">
            {/* Viewer consumes 100% of the available height */}
            <div className="h-full">
              <LazyFreePdfViewer file={file} height="100%" />
            </div>
          </div>
        </section>
      </main>

      <MessagesTab />
    </div>
    </SidebarProvider>
  );
}
