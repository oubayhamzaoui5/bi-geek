"use client";

import { useMemo, useState } from "react";
import JitsiRoom from "@/components/live/JitsiRoom";

const randomRoom = () =>
  "course_" +
  Math.random().toString(36).slice(2, 8) +
  "_" +
  Date.now().toString(36);

export default function MeetPage() {
  const [displayName, setDisplayName] = useState("Instructor");
  const [roomName, setRoomName] = useState(randomRoom());
  const [started, setStarted] = useState(false);
  const [key, setKey] = useState(0); // to force re-mount on leave

  const canStart = useMemo(
    () => roomName.trim().length > 3 && displayName.trim().length > 0,
    [roomName, displayName]
  );

  const handleStart = () => {
    if (!canStart) return;
    setStarted(true);
  };

  const handleLeave = () => {
    // Re-render JitsiRoom to dispose cleanly
    setStarted(false);
    setKey((k) => k + 1);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Test a Jitsi Meeting (Hosted)</h1>

      {!started && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Room name</label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-md border px-3 py-2"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <button
                className="rounded-md border px-3 py-2"
                onClick={() => setRoomName(randomRoom())}
                type="button"
                title="Generate"
              >
                ↻
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tip: keep it long and random so others can’t guess it.
            </p>
          </div>

          <div className="col-span-1">
            <button
              className={`w-full rounded-md px-4 py-2 font-semibold ${
                canStart
                  ? "bg-black text-white hover:opacity-90"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
              disabled={!canStart}
              onClick={handleStart}
              type="button"
            >
              Start meeting
            </button>
          </div>
        </div>
      )}

      {started && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <b>Room:</b> {roomName} &nbsp; <b>As:</b> {displayName}
            </div>
            <div className="flex gap-2">
              {/* You can also call api.executeCommand('hangup') from inside the JitsiRoom with a ref pattern */}
              <button
                className="rounded-md border px-3 py-2"
                onClick={handleLeave}
                type="button"
              >
                Leave
              </button>
            </div>
          </div>

          {/* The actual meeting */}
          <JitsiRoom key={key} roomName={roomName} displayName={displayName} height={640} />
        </div>
      )}
    </div>
  );
}
