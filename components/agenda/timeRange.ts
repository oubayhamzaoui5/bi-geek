type AgendaTimedItem = {
  start_time?: string | null
  duration?: number | null
}

export type AgendaHourRange = {
  startHour: number
  endHour: number
  hours: number[]
}

function parseHourMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const [rawHour, rawMinute] = time.split(":")
  const hour = Number(rawHour)
  const minute = Number(rawMinute)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

export function getAgendaHourRange(
  items: AgendaTimedItem[],
  {
    defaultStartHour = 7,
    defaultEndHour = 22,
    startPaddingHours = 1,
    endPaddingHours = 1,
    minVisibleHours = 5,
  }: {
    defaultStartHour?: number
    defaultEndHour?: number
    startPaddingHours?: number
    endPaddingHours?: number
    minVisibleHours?: number
  } = {}
): AgendaHourRange {
  const spans = items
    .map(item => {
      const start = parseHourMinutes(item.start_time)
      if (start === null) return null
      return {
        start,
        end: start + Math.max(item.duration ?? 60, 1),
      }
    })
    .filter((span): span is { start: number; end: number } => span !== null)

  if (spans.length === 0) {
    return {
      startHour: defaultStartHour,
      endHour: defaultEndHour,
      hours: Array.from({ length: defaultEndHour - defaultStartHour }, (_, i) => defaultStartHour + i),
    }
  }

  const earliestStart = Math.min(...spans.map(span => span.start))
  const latestEnd = Math.max(...spans.map(span => span.end))
  const earliestHour = Math.floor(earliestStart / 60)
  const latestHour = Math.ceil(latestEnd / 60)

  const startHour = earliestHour >= defaultStartHour
    ? Math.max(defaultStartHour, earliestHour - startPaddingHours)
    : Math.max(0, earliestHour)

  const paddedEndHour = Math.min(24, latestHour + endPaddingHours)
  const endHour = Math.min(24, Math.max(paddedEndHour, startHour + minVisibleHours))

  return {
    startHour,
    endHour,
    hours: Array.from({ length: Math.max(endHour - startHour, 1) }, (_, i) => startHour + i),
  }
}
