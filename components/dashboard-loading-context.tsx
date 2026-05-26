"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import LoadingBI from "@/components/LoadingBI"

type Ctx = { loading: boolean; setPageLoading: (v: boolean) => void }

const Ctx = createContext<Ctx>({ loading: false, setPageLoading: () => {} })

export function DashboardLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pageLoading, setPageLoading] = useState(false)
  const [routeLoading, setRouteLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    setRouteLoading(true)
    const t = setTimeout(() => setRouteLoading(false), 400)
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <Ctx.Provider value={{ loading: pageLoading || routeLoading, setPageLoading }}>
      {children}
      {(pageLoading || routeLoading) && <LoadingBI />}
    </Ctx.Provider>
  )
}

export function useDashboardLoading() {
  return useContext(Ctx)
}

export function useSetDashboardLoading(loading: boolean) {
  const { setPageLoading } = useContext(Ctx)
  useEffect(() => {
    setPageLoading(loading)
    return () => setPageLoading(false)
  }, [loading, setPageLoading])
}
