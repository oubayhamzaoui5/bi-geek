// components/live/JitsiRoom.tsx
"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { JitsiMeetExternalAPI?: any }
}

type Props = {
  roomName: string;
  displayName?: string;
  height?: number | string;
  domain?: string; // try "meet.jit.si" (default) or "8x8.vc"
};

export default function JitsiRoom({
  roomName,
  displayName = "Guest",
  height = 640,
  domain = "meet.jit.si",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const [status, setStatus] = useState("loading jitsi…");

  useEffect(() => {
    let mounted = true;

    const init = () => {
      if (!mounted || !containerRef.current) return;
      if (!window.JitsiMeetExternalAPI) {
        setStatus("Jitsi API not present after load");
        return;
      }

      try { apiRef.current?.dispose?.() } catch {}

      const options = {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height,
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          startWithAudioMuted: true,
        },
        interfaceConfigOverwrite: { TILE_VIEW_MAX_COLUMNS: 3 },
      };

      try {
        // @ts-ignore
        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      } catch (e: any) {
        setStatus("Failed to create Jitsi iframe: " + (e?.message ?? e));
        return;
      }

      setStatus("loading meeting…");

      apiRef.current.addListener("videoConferenceJoined", () =>
        setStatus("joined ✅")
      );
      apiRef.current.addListener("readyToClose", () =>
        setStatus("ended")
      );

      // Safety timeout: if nothing happens, surface it
      setTimeout(() => {
        if (mounted && status.startsWith("loading")) {
          setStatus("still loading… if blank, check CSP/ad-blockers/console");
        }
      }, 5000);
    };

    const injectScript = () => {
      if (window.JitsiMeetExternalAPI) return init();

      const existing = document.getElementById("jitsi-external-api") as HTMLScriptElement | null;

      // If a tag exists but isn't ready yet, attach an extra onload
      if (existing) {
        existing.addEventListener("load", init, { once: true });
        return;
      }

      const s = document.createElement("script");
      s.id = "jitsi-external-api";
      s.src = "https://meet.jit.si/external_api.js";
      s.async = true;
      s.onload = init;
      s.onerror = () => setStatus("Failed to load external_api.js (network/CSP?)");
      document.body.appendChild(s);
    };

    injectScript();

    return () => {
      mounted = false;
      try { apiRef.current?.dispose?.() } catch {}
    };
  }, [roomName, displayName, height, domain]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border"
        style={{ height }}
      />
      {/* Debug line you can hide later */}
      <div className="mt-2 text-xs text-gray-500">status: {status}</div>
    </div>
  );
}
