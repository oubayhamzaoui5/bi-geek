// components/ui/sidebar-context.tsx
"use client"

import {
  createContext,
  useContext,
  useLayoutEffect, // <- key change
  useState,
  ReactNode,
} from "react"

type SidebarCtx = { isCollapsed: boolean; setIsCollapsed: (v: boolean) => void }
const SidebarContext = createContext<SidebarCtx | null>(null)
const STORAGE_KEY = "sidebar:isCollapsed"

export function SidebarProvider({ children }: { children: ReactNode }) {
  // null = not yet hydrated -> don't render children to avoid flash
  const [isCollapsed, setIsCollapsedState] = useState<boolean | null>(null)

  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setIsCollapsedState(raw === "true")
    } catch {
      setIsCollapsedState(false)
    }
  }, [])

  const setIsCollapsed = (v: boolean) => {
    setIsCollapsedState(v)
    try {
      localStorage.setItem(STORAGE_KEY, String(v))
    } catch {}
  }

  // (optional) cross-tab sync
  useLayoutEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue != null) {
        setIsCollapsedState(e.newValue === "true")
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Avoid SSR -> CSR mismatch flash
  if (isCollapsed === null) return null

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>")
  return ctx
}
