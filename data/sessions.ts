export interface Session {
  id: string
  dateISO: string
  programId: string
  modality: "En ligne" | "Sur site"
  instructor: string
  seatsLeft: number
}

export const sessions: Session[] = [
  {
    id: "s1",
    dateISO: "2025-11-15",
    programId: "1",
    modality: "En ligne",
    instructor: "Sophie Martin",
    seatsLeft: 5,
  },
  {
    id: "s2",
    dateISO: "2025-11-22",
    programId: "2",
    modality: "Sur site",
    instructor: "Marc Dubois",
    seatsLeft: 8,
  },
  {
    id: "s3",
    dateISO: "2025-12-01",
    programId: "3",
    modality: "En ligne",
    instructor: "Julie Lefebvre",
    seatsLeft: 3,
  },
  {
    id: "s4",
    dateISO: "2025-12-10",
    programId: "4",
    modality: "En ligne",
    instructor: "Thomas Bernard",
    seatsLeft: 12,
  },
  {
    id: "s5",
    dateISO: "2025-12-15",
    programId: "5",
    modality: "Sur site",
    instructor: "Sophie Martin",
    seatsLeft: 6,
  },
]
