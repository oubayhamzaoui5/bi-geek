"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Role = "admin" | "instructor" | "student"

type StoredUser = {
  id: string
  username?: string
  email?: string
  role?: Role | string
}

type EnrollmentStatus = "pending" | "contacted" | "confirmed"

/* ---------- Level options ---------- */

const LEVEL_OPTIONS = [
  "Débutant",
  "Intermédiaire",
  "Avancé",
  "Débutant - Intermédiaire",
  "Intermédiaire - Avancé",
]

/* ---------- Data types used in admin UI ---------- */

type AdminLesson = {
  id?: string
  title: string
  durationLabel: string
}

type AdminModule = {
  id?: string
  title: string
  durationLabel: string
  lessons: AdminLesson[]
}

type AdminCourse = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  levelLabel: string
  certificate: boolean
  rating: number
  reviewsCount: number
  whatYouWillLearn: string[]
  tags: string[]
  modules: AdminModule[]
}

type AdminBootcamp = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  levelLabel: string
  certificate: boolean
  rating: number
  reviewsCount: number
  isPublished: boolean
  courseIds: string[]
}

type OverviewCourse = {
  id: string
  title: string
  enrollmentsCount: number
}

type OverviewBootcamp = {
  id: string
  title: string
  enrollmentsCount: number
}

type AdminEnrollment = {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  birthDate: string
  hasExperience: boolean
  note: string
  courseTitle?: string
  bootcampTitle?: string
  created: string
  status: EnrollmentStatus
}

type AdminInstructor = {
  id?: string
  avatar: string | null
  firstName: string
  lastName: string
  description: string
}

/* ---------- Main page ---------- */

type Tab = "courses" | "bootcamps" | "enrollments" | "instructors"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("courses")

  // Data
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [bootcamps, setBootcamps] = useState<AdminBootcamp[]>([])
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([])
  const [overviewCourses, setOverviewCourses] = useState<OverviewCourse[]>([])
  const [overviewBootcamps, setOverviewBootcamps] = useState<OverviewBootcamp[]>([])
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])

  // Selection / edit states
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [editingBootcamp, setEditingBootcamp] = useState<AdminBootcamp | null>(null)
  const [editingInstructor, setEditingInstructor] = useState<AdminInstructor | null>(null)

  // Loading states
  const [loadingData, setLoadingData] = useState(false)
  const [savingCourse, setSavingCourse] = useState(false)
  const [savingBootcamp, setSavingBootcamp] = useState(false)
  const [savingInstructor, setSavingInstructor] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Avatar state for current instructor form
  const [instructorAvatarFile, setInstructorAvatarFile] = useState<File | null>(null)
  const [removeInstructorAvatar, setRemoveInstructorAvatar] = useState(false)

  /* ---------- Auth check ---------- */
  useEffect(() => {
    try {
      if (typeof window === "undefined") return

      const raw = localStorage.getItem("user")
      if (!raw) {
        router.replace("/login")
        return
      }

      const parsed: StoredUser = JSON.parse(raw)
      const role = (parsed.role as Role) || "student"

      if (role !== "admin") {
        if (role === "instructor") router.replace("/instructor-dashboard")
        else router.replace("/student-dashboard")
        return
      }

      setUser(parsed)
    } catch {
      router.replace("/login")
      return
    } finally {
      setChecking(false)
    }
  }, [router])

  /* ---------- Load data once authenticated ---------- */
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoadingData(true)
      setError(null)
      try {
        // Courses (with modules + lessons)
        const coursesRes = await fetch("/api/admin/courses")
        const coursesData = await coursesRes.json().catch(() => ({}))
        if (!coursesRes.ok) throw new Error(coursesData?.error || "Erreur chargement cours")

        // Bootcamps (with assigned courses)
        const bootcampsRes = await fetch("/api/admin/bootcamps")
        const bootcampsData = await bootcampsRes.json().catch(() => ({}))
        if (!bootcampsRes.ok) throw new Error(bootcampsData?.error || "Erreur chargement bootcamps")

        // Enrollments
        const enrollRes = await fetch("/api/admin/enrollments")
        const enrollData = await enrollRes.json().catch(() => ({}))
        if (!enrollRes.ok) throw new Error(enrollData?.error || "Erreur chargement inscriptions")

        // Instructors (formateurs)
        const instructorsRes = await fetch("/api/admin/instructors")
        const instructorsData = await instructorsRes.json().catch(() => ({}))
        if (!instructorsRes.ok) throw new Error(instructorsData?.error || "Erreur chargement formateurs")

        // Optional overview
        const overviewRes = await fetch("/api/admin/overview").catch(() => null)
        let overviewData: any = {}
        if (overviewRes && overviewRes.ok) {
          overviewData = await overviewRes.json().catch(() => ({}))
        }

        if (!cancelled) {
          setCourses(coursesData.courses || [])
          setBootcamps(bootcampsData.bootcamps || [])
          setEnrollments(enrollData.enrollments || [])
          setOverviewCourses(overviewData.courses || [])
          setOverviewBootcamps(overviewData.bootcamps || [])
          setInstructors(
            (instructorsData.instructors || []).map((i: any) => ({
              id: i.id,
              avatar: i.avatar ?? null,
              firstName: i.firstName ?? "",
              lastName: i.lastName ?? "",
              description: i.description ?? "",
            })),
          )

          // default editing course/bootcamp/instructor
          if (!editingCourse && (coursesData.courses || []).length > 0) {
            setEditingCourse(structuredClone(coursesData.courses[0]))
          }
          if (!editingBootcamp && (bootcampsData.bootcamps || []).length > 0) {
            setEditingBootcamp(structuredClone(bootcampsData.bootcamps[0]))
          }
          if (!editingInstructor && (instructorsData.instructors || []).length > 0) {
            setEditingInstructor(
              structuredClone({
                ...instructorsData.instructors[0],
                description: instructorsData.instructors[0].description ?? "",
                avatar: instructorsData.instructors[0].avatar ?? null,
              }),
            )
          }
        }
      } catch (err: any) {
        console.error("ADMIN LOAD ERROR:", err)
        if (!cancelled) setError(err?.message || "Erreur lors du chargement des données.")
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Chargement du tableau de bord administrateur…</p>
      </div>
    )
  }

  if (!user) return null

  const displayName = user.username || user.email || "Admin"

  const pendingEnrollmentsCount = enrollments.filter(
    (e) => e.status === "pending",
  ).length

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user")
      }
    } finally {
      setUser(null)
      router.replace("/login")
    }
  }

  /* ---------- Helpers to create blank entities ---------- */

  const blankCourse = (): AdminCourse => ({
    title: "",
    shortDescription: "",
    longDescription: "",
    durationLabel: "",
    levelLabel: "",
    certificate: true,
    rating: 4.8,
    reviewsCount: 0,
    whatYouWillLearn: [],
    tags: [],
    modules: [],
  })

  const blankBootcamp = (): AdminBootcamp => ({
    title: "",
    shortDescription: "",
    longDescription: "",
    durationLabel: "",
    levelLabel: "",
    certificate: true,
    rating: 4.8,
    reviewsCount: 0,
    isPublished: true,
    courseIds: [],
  })

  const blankInstructor = (): AdminInstructor => ({
    id: undefined,
    avatar: null,
    firstName: "",
    lastName: "",
    description: "",
  })

  /* ---------- Course handlers ---------- */

  const handleSelectCourse = (id: string) => {
    const found = courses.find((c) => c.id === id)
    if (found) {
      setEditingCourse(structuredClone(found))
    }
  }

  const handleNewCourse = () => {
    setEditingCourse(blankCourse())
  }

  const handleCourseFieldChange = <K extends keyof AdminCourse>(key: K, value: AdminCourse[K]) => {
    if (!editingCourse) return
    setEditingCourse({ ...editingCourse, [key]: value })
  }

  const handleAddModule = () => {
    if (!editingCourse) return
    const next: AdminModule = {
      title: "Nouveau module",
      durationLabel: "",
      lessons: [],
    }
    setEditingCourse({ ...editingCourse, modules: [...editingCourse.modules, next] })
  }

  const handleRemoveModule = (index: number) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    modules.splice(index, 1)
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleMoveModule = (index: number, direction: "up" | "down") => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= modules.length) return
    const [item] = modules.splice(index, 1)
    modules.splice(target, 0, item)
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleModuleChange = (
    index: number,
    key: keyof AdminModule,
    value: AdminModule[keyof AdminModule],
  ) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    modules[index] = { ...modules[index], [key]: value } as AdminModule
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleAddLesson = (moduleIndex: number) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    const module = modules[moduleIndex]
    if (!module) return
    const nextLesson: AdminLesson = {
      title: "Nouvelle leçon",
      durationLabel: "",
    }
    module.lessons = [...module.lessons, nextLesson]
    modules[moduleIndex] = { ...module }
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleRemoveLesson = (moduleIndex: number, lessonIndex: number) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    const module = modules[moduleIndex]
    if (!module) return
    const lessons = module.lessons.slice()
    lessons.splice(lessonIndex, 1)
    module.lessons = lessons
    modules[moduleIndex] = { ...module }
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleMoveLesson = (moduleIndex: number, lessonIndex: number, direction: "up" | "down") => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    const module = modules[moduleIndex]
    if (!module) return
    const lessons = module.lessons.slice()
    const target = direction === "up" ? lessonIndex - 1 : lessonIndex + 1
    if (target < 0 || target >= lessons.length) return
    const [item] = lessons.splice(lessonIndex, 1)
    lessons.splice(target, 0, item)
    module.lessons = lessons
    modules[moduleIndex] = { ...module }
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleLessonChange = (
    moduleIndex: number,
    lessonIndex: number,
    key: keyof AdminLesson,
    value: AdminLesson[keyof AdminLesson],
  ) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.slice()
    const module = modules[moduleIndex]
    if (!module) return
    const lessons = module.lessons.slice()
    const lesson = lessons[lessonIndex]
    if (!lesson) return
    lessons[lessonIndex] = { ...lesson, [key]: value } as AdminLesson
    module.lessons = lessons
    modules[moduleIndex] = { ...module }
    setEditingCourse({ ...editingCourse, modules })
  }

  const handleSaveCourse = async () => {
    if (!editingCourse) return
    if (!editingCourse.title.trim()) {
      alert("Le titre du cours est obligatoire.")
      return
    }

    setSavingCourse(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST", // create or update (server decides based on id)
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCourse),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l’enregistrement du cours.")

      const saved: AdminCourse = data.course

      // update local list
      setCourses((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id)
        if (idx === -1) return [...prev, saved]
        const clone = prev.slice()
        clone[idx] = saved
        return clone
      })
      setEditingCourse(structuredClone(saved))
    } catch (err: any) {
      console.error("SAVE COURSE ERROR:", err)
      setError(err?.message || "Erreur lors de l’enregistrement du cours.")
    } finally {
      setSavingCourse(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!editingCourse?.id) {
      alert("Aucun cours sélectionné.")
      return
    }
    if (!confirm("Supprimer ce cours ? Cette action est irréversible.")) return

    setSavingCourse(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la suppression du cours.")

      setCourses((prev) => prev.filter((c) => c.id !== editingCourse.id))
      setEditingCourse(null)
    } catch (err: any) {
      console.error("DELETE COURSE ERROR:", err)
      setError(err?.message || "Erreur lors de la suppression du cours.")
    } finally {
      setSavingCourse(false)
    }
  }

  /* ---------- Bootcamp handlers ---------- */

  const handleSelectBootcamp = (id: string) => {
    const found = bootcamps.find((b) => b.id === id)
    if (found) {
      setEditingBootcamp(structuredClone(found))
    }
  }

  const handleNewBootcamp = () => {
    setEditingBootcamp(blankBootcamp())
  }

  const handleBootcampFieldChange = <K extends keyof AdminBootcamp>(
    key: K,
    value: AdminBootcamp[K],
  ) => {
    if (!editingBootcamp) return
    setEditingBootcamp({ ...editingBootcamp, [key]: value })
  }

  const handleBootcampCourseToggle = (courseId: string) => {
    if (!editingBootcamp) return
    const ids = [...editingBootcamp.courseIds]
    const idx = ids.indexOf(courseId)
    if (idx >= 0) {
      ids.splice(idx, 1)
    } else {
      ids.push(courseId)
    }
    setEditingBootcamp({
      ...editingBootcamp,
      courseIds: ids,
    })
  }

  const handleBootcampCourseMove = (courseId: string, direction: "up" | "down") => {
    if (!editingBootcamp) return
    const ids = [...editingBootcamp.courseIds]
    const idx = ids.indexOf(courseId)
    if (idx === -1) return
    const target = direction === "up" ? idx - 1 : idx + 1
    if (target < 0 || target >= ids.length) return
    const [item] = ids.splice(idx, 1)
    ids.splice(target, 0, item)
    setEditingBootcamp({
      ...editingBootcamp,
      courseIds: ids,
    })
  }

  const handleBootcampCourseRemove = (courseId: string) => {
    if (!editingBootcamp) return
    const ids = editingBootcamp.courseIds.filter((id) => id !== courseId)
    setEditingBootcamp({
      ...editingBootcamp,
      courseIds: ids,
    })
  }

  const handleSaveBootcamp = async () => {
    if (!editingBootcamp) return
    if (!editingBootcamp.title.trim()) {
      alert("Le titre du bootcamp est obligatoire.")
      return
    }

    setSavingBootcamp(true)
    setError(null)
    try {
      const payload: AdminBootcamp = {
        ...editingBootcamp,
        isPublished: true, // toujours publié
      }

      const res = await fetch("/api/admin/bootcamps", {
        method: "POST", // create or update
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l’enregistrement du bootcamp.")

      const saved: AdminBootcamp = data.bootcamp

      setBootcamps((prev) => {
        const idx = prev.findIndex((b) => b.id === saved.id)
        if (idx === -1) return [...prev, saved]
        const clone = prev.slice()
        clone[idx] = saved
        return clone
      })
      setEditingBootcamp(structuredClone(saved))
    } catch (err: any) {
      console.error("SAVE BOOTCAMP ERROR:", err)
      setError(err?.message || "Erreur lors de l’enregistrement du bootcamp.")
    } finally {
      setSavingBootcamp(false)
    }
  }

  const handleDeleteBootcamp = async () => {
    if (!editingBootcamp?.id) {
      alert("Aucun bootcamp sélectionné.")
      return
    }
    if (!confirm("Supprimer ce bootcamp ? Cette action est irréversible.")) return

    setSavingBootcamp(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bootcamps/${editingBootcamp.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la suppression du bootcamp.")

      setBootcamps((prev) => prev.filter((b) => b.id !== editingBootcamp.id))
      setEditingBootcamp(null)
    } catch (err: any) {
      console.error("DELETE BOOTCAMP ERROR:", err)
      setError(err?.message || "Erreur lors de la suppression du bootcamp.")
    } finally {
      setSavingBootcamp(false)
    }
  }

  /* ---------- Instructor handlers ---------- */

  const handleSelectInstructor = (id: string) => {
    const found = instructors.find((i) => i.id === id)
    if (found) {
      setEditingInstructor(structuredClone(found))
      setInstructorAvatarFile(null)
      setRemoveInstructorAvatar(false)
    }
  }

  const handleNewInstructor = () => {
    setEditingInstructor(blankInstructor())
    setInstructorAvatarFile(null)
    setRemoveInstructorAvatar(false)
  }

  const handleInstructorFieldChange = <K extends keyof AdminInstructor>(
    key: K,
    value: AdminInstructor[K],
  ) => {
    if (!editingInstructor) return
    setEditingInstructor({ ...editingInstructor, [key]: value })
  }

  const handleInstructorAvatarFileChange = (file: File | null) => {
    setInstructorAvatarFile(file)
    if (file) {
      setRemoveInstructorAvatar(false)
    }
  }

  const handleClearInstructorAvatar = () => {
    if (!editingInstructor) return
    setEditingInstructor({ ...editingInstructor, avatar: null })
    setInstructorAvatarFile(null)
    setRemoveInstructorAvatar(true)
  }

  const handleSaveInstructor = async () => {
    if (!editingInstructor) return
    if (!editingInstructor.firstName.trim() || !editingInstructor.lastName.trim()) {
      alert("Le prénom et le nom du formateur sont obligatoires.")
      return
    }

    setSavingInstructor(true)
    setError(null)
    try {
      const formData = new FormData()

      if (editingInstructor.id) {
        formData.append("id", editingInstructor.id)
      }
      formData.append("firstName", editingInstructor.firstName)
      formData.append("lastName", editingInstructor.lastName)
      formData.append("description", editingInstructor.description || "")

      if (instructorAvatarFile) {
        formData.append("avatar", instructorAvatarFile)
      }

      if (removeInstructorAvatar && !instructorAvatarFile) {
        formData.append("removeAvatar", "1")
      }

      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l’enregistrement du formateur.")

      const saved: AdminInstructor = {
        id: data.instructor.id,
        firstName: data.instructor.firstName,
        lastName: data.instructor.lastName,
        description: data.instructor.description ?? "",
        avatar: data.instructor.avatar ?? null,
      }

      setInstructors((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id)
        if (idx === -1) return [...prev, saved]
        const clone = prev.slice()
        clone[idx] = saved
        return clone
      })

      setEditingInstructor(structuredClone(saved))
      setInstructorAvatarFile(null)
      setRemoveInstructorAvatar(false)
    } catch (err: any) {
      console.error("SAVE INSTRUCTOR ERROR:", err)
      setError(err?.message || "Erreur lors de l’enregistrement du formateur.")
    } finally {
      setSavingInstructor(false)
    }
  }

  const handleDeleteInstructor = async () => {
    if (!editingInstructor?.id) {
      alert("Aucun formateur sélectionné.")
      return
    }
    if (!confirm("Supprimer ce formateur ? Cette action est irréversible.")) return

    setSavingInstructor(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/instructors/${editingInstructor.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la suppression du formateur.")

      setInstructors((prev) => prev.filter((i) => i.id !== editingInstructor.id))
      setEditingInstructor(null)
      setInstructorAvatarFile(null)
      setRemoveInstructorAvatar(false)
    } catch (err: any) {
      console.error("DELETE INSTRUCTOR ERROR:", err)
      setError(err?.message || "Erreur lors de la suppression du formateur.")
    } finally {
      setSavingInstructor(false)
    }
  }

  /* ---------- Enrollment handlers (status + delete) ---------- */

  const handleUpdateEnrollmentStatus = async (id: string, status: EnrollmentStatus) => {
    setError(null)
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur mise à jour statut.")

      setEnrollments((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e)),
      )
    } catch (err: any) {
      console.error("UPDATE ENROLLMENT STATUS ERROR:", err)
      setError(err?.message || "Erreur lors de la mise à jour du statut.")
    }
  }

  const handleDeleteEnrollment = async (id: string) => {
    if (!confirm("Supprimer cette inscription ? Cette action est irréversible.")) {
      return
    }

    setError(null)
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur suppression inscription.")

      setEnrollments((prev) => prev.filter((e) => e.id !== id))
    } catch (err: any) {
      console.error("DELETE ENROLLMENT ERROR:", err)
      setError(err?.message || "Erreur lors de la suppression de l’inscription.")
    }
  }

  /* ---------- RENDER ---------- */

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white px-4 py-2 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Tableau de bord administrateur</h1>
          <p className="text-xs text-gray-500">
            Gérer les cours, bootcamps, formateurs et inscriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Connecté en tant que {displayName}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-3 flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={
              "py-2 border-b-2 -mb-px " +
              (activeTab === "courses"
                ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-900")
            }
          >
            Cours
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bootcamps")}
            className={
              "py-2 border-b-2 -mb-px " +
              (activeTab === "bootcamps"
                ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-900")
            }
          >
            Bootcamps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("instructors")}
            className={
              "py-2 border-b-2 -mb-px " +
              (activeTab === "instructors"
                ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-900")
            }
          >
            Formateurs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("enrollments")}
            className={
              "py-2 border-b-2 -mb-px flex items-center gap-1 " +
              (activeTab === "enrollments"
                ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-900")
            }
          >
            <span>Inscriptions</span>
            {pendingEnrollmentsCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-red-100 text-red-700">
                {pendingEnrollmentsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto px-3 py-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}
        {loadingData && (
          <p className="text-sm text-gray-600">Chargement des données…</p>
        )}

        {activeTab === "courses" && (
          <CoursesTab
            courses={courses}
            overviewCourses={overviewCourses}
            editingCourse={editingCourse}
            onSelectCourse={handleSelectCourse}
            onNewCourse={handleNewCourse}
            onFieldChange={handleCourseFieldChange}
            onAddModule={handleAddModule}
            onRemoveModule={handleRemoveModule}
            onMoveModule={handleMoveModule}
            onModuleChange={handleModuleChange}
            onAddLesson={handleAddLesson}
            onRemoveLesson={handleRemoveLesson}
            onMoveLesson={handleMoveLesson}
            onLessonChange={handleLessonChange}
            onSave={handleSaveCourse}
            onDelete={handleDeleteCourse}
            saving={savingCourse}
          />
        )}

        {activeTab === "bootcamps" && (
          <BootcampsTab
            bootcamps={bootcamps}
            overviewBootcamps={overviewBootcamps}
            courses={courses}
            editingBootcamp={editingBootcamp}
            onSelectBootcamp={handleSelectBootcamp}
            onNewBootcamp={handleNewBootcamp}
            onFieldChange={handleBootcampFieldChange}
            onToggleCourse={handleBootcampCourseToggle}
            onMoveCourse={handleBootcampCourseMove}
            onRemoveCourse={handleBootcampCourseRemove}
            onSave={handleSaveBootcamp}
            onDelete={handleDeleteBootcamp}
            saving={savingBootcamp}
          />
        )}

        {activeTab === "instructors" && (
          <InstructorsTab
            instructors={instructors}
            editingInstructor={editingInstructor}
            onSelectInstructor={handleSelectInstructor}
            onNewInstructor={handleNewInstructor}
            onFieldChange={handleInstructorFieldChange}
            onSave={handleSaveInstructor}
            onDelete={handleDeleteInstructor}
            saving={savingInstructor}
            avatarFile={instructorAvatarFile}
            onAvatarFileChange={handleInstructorAvatarFileChange}
            onClearAvatar={handleClearInstructorAvatar}
          />
        )}

        {activeTab === "enrollments" && (
          <EnrollmentsTab
            enrollments={enrollments}
            onChangeStatus={handleUpdateEnrollmentStatus}
            onDelete={handleDeleteEnrollment}
          />
        )}
      </main>
    </div>
  )
}

/* ---------- Courses tab UI ---------- */

type CoursesTabProps = {
  courses: AdminCourse[]
  overviewCourses: OverviewCourse[]
  editingCourse: AdminCourse | null
  onSelectCourse: (id: string) => void
  onNewCourse: () => void
  onFieldChange: <K extends keyof AdminCourse>(key: K, value: AdminCourse[K]) => void
  onAddModule: () => void
  onRemoveModule: (index: number) => void
  onMoveModule: (index: number, direction: "up" | "down") => void
  onModuleChange: (
    moduleIndex: number,
    key: keyof AdminModule,
    value: AdminModule[keyof AdminModule],
  ) => void
  onAddLesson: (moduleIndex: number) => void
  onRemoveLesson: (moduleIndex: number, lessonIndex: number) => void
  onMoveLesson: (moduleIndex: number, lessonIndex: number, direction: "up" | "down") => void
  onLessonChange: (
    moduleIndex: number,
    lessonIndex: number,
    key: keyof AdminLesson,
    value: AdminLesson[keyof AdminLesson],
  ) => void
  onSave: () => void
  onDelete: () => void
  saving: boolean
}

function CoursesTab(props: CoursesTabProps) {
  const {
    courses,
    overviewCourses,
    editingCourse,
    onSelectCourse,
    onNewCourse,
    onFieldChange,
    onAddModule,
    onRemoveModule,
    onMoveModule,
    onModuleChange,
    onAddLesson,
    onRemoveLesson,
    onMoveLesson,
    onLessonChange,
    onSave,
    onDelete,
    saving,
  } = props

  const enrollCountById = new Map(
    overviewCourses.map((c) => [c.id, c.enrollmentsCount] as [string, number]),
  )

  const learnItems = editingCourse?.whatYouWillLearn ?? []
  const tagItems = editingCourse?.tags ?? []

  const handleAddWhatItem = () => {
    if (!editingCourse) return
    const next = [...learnItems, ""]
    onFieldChange("whatYouWillLearn", next)
  }

  const handleUpdateWhatItem = (index: number, value: string) => {
    if (!editingCourse) return
    const next = [...learnItems]
    next[index] = value
    onFieldChange("whatYouWillLearn", next)
  }

  const handleRemoveWhatItem = (index: number) => {
    if (!editingCourse) return
    const next = learnItems.filter((_, i) => i !== index)
    onFieldChange("whatYouWillLearn", next)
  }

  const handleAddTag = () => {
    if (!editingCourse) return
    const next = [...tagItems, ""]
    onFieldChange("tags", next)
  }

  const handleUpdateTag = (index: number, value: string) => {
    if (!editingCourse) return
    const next = [...tagItems]
    next[index] = value
    onFieldChange("tags", next)
  }

  const handleRemoveTag = (index: number) => {
    if (!editingCourse) return
    const next = tagItems.filter((_, i) => i !== index)
    onFieldChange("tags", next)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] gap-4">
      {/* Left: list of courses */}
      <section className="bg-white border rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800 text-sm">Cours</h2>
          <button
            type="button"
            onClick={onNewCourse}
            className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
          >
            + Nouveau cours
          </button>
        </div>

        {courses.length === 0 ? (
          <p className="text-xs text-gray-500">Aucun cours pour l’instant.</p>
        ) : (
          <ul className="space-y-1 max-h-[420px] overflow-auto">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => c.id && onSelectCourse(c.id)}
                  className={
                    "flex-1 text-left text-xs border rounded px-2 py-1 truncate " +
                    (editingCourse?.id === c.id
                      ? "border-[var(--accent)] bg-[color:rgba(0,0,0,0.02)]"
                      : "border-gray-200 hover:bg-gray-50")
                  }
                >
                  <span className="font-medium">{c.title || "(Sans titre)"}</span>
                  {c.levelLabel && (
                    <span className="text-[10px] text-gray-500 block">
                      {c.levelLabel} · {c.durationLabel}
                    </span>
                  )}
                </button>
                <span className="text-[10px] text-gray-500">
                  {enrollCountById.get(c.id || "") || 0} insc.
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Right: edit form */}
      <section className="bg-white border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">
            {editingCourse?.id ? "Modifier le cours" : "Nouveau cours"}
          </h2>
          {editingCourse?.id && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          )}
        </div>

        {!editingCourse ? (
          <p className="text-xs text-gray-500">
            Sélectionnez un cours à gauche ou créez-en un nouveau.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs mb-1">Titre *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                  value={editingCourse.title}
                  onChange={(e) => onFieldChange("title", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1">Durée (label) *</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingCourse.durationLabel}
                    onChange={(e) => onFieldChange("durationLabel", e.target.value)}
                    placeholder="Ex : 40 heures"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Niveau *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingCourse.levelLabel}
                    onChange={(e) => onFieldChange("levelLabel", e.target.value)}
                  >
                    <option value="">Sélectionner un niveau</option>
                    {LEVEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs mb-1">Certificat</label>
                  <label className="inline-flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={editingCourse.certificate}
                      onChange={(e) => onFieldChange("certificate", e.target.checked)}
                    />
                    <span>Oui</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs mb-1">Note</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingCourse.rating}
                    onChange={(e) =>
                      onFieldChange("rating", parseFloat(e.target.value || "0"))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Avis</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingCourse.reviewsCount}
                    onChange={(e) =>
                      onFieldChange("reviewsCount", parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1">Description courte *</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  value={editingCourse.shortDescription}
                  onChange={(e) => onFieldChange("shortDescription", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Description longue</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={5}
                  value={editingCourse.longDescription}
                  onChange={(e) => onFieldChange("longDescription", e.target.value)}
                />
              </div>

              {/* Ce que vous apprendrez as a list */}
              <div>
                <label className="block text-xs mb-1">
                  Ce que vous apprendrez
                </label>
                {learnItems.length === 0 && (
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    Ajoutez des points clés avec le bouton ci-dessous.
                  </p>
                )}
                <div className="space-y-1.5">
                  {learnItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2"
                    >
                      <span className="text-[11px] text-gray-500 w-5">
                        {index + 1}.
                      </span>
                      <input
                        className="flex-1 border rounded px-3 py-2 text-xs sm:text-sm"
                        value={item}
                        onChange={(e) => handleUpdateWhatItem(index, e.target.value)}
                        placeholder="Ex : Maîtriser les bases de JavaScript"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWhatItem(index)}
                        className="text-[11px] text-red-600 hover:underline px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddWhatItem}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded border border-dashed border-gray-300 text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[color:rgba(0,0,0,0.02)]"
                >
                  <span>+ Ajouter un élément</span>
                </button>
              </div>

              {/* Tags list */}
              <div>
                <label className="block text-xs mb-1">Tags</label>
                {tagItems.length === 0 && (
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    Ajoutez des tags pour faciliter la recherche (ex : front-end, débutant…).
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {tagItems.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full px-2 py-1 text-[11px]"
                    >
                      <input
                        className="bg-transparent outline-none text-[11px] min-w-[60px]"
                        value={tag}
                        onChange={(e) => handleUpdateTag(index, e.target.value)}
                        placeholder="Nouveau tag"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(index)}
                        className="text-[10px] text-gray-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded border border-dashed border-gray-300 text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[color:rgba(0,0,0,0.02)]"
                >
                  <span>+ Ajouter un tag</span>
                </button>
              </div>
            </div>

            {/* Modules & lessons - cleaner UI */}
            <div className="border-t pt-3 mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-800">Modules & leçons</h3>
                <button
                  type="button"
                  onClick={onAddModule}
                  className="text-[11px] px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  + Ajouter un module
                </button>
              </div>

              {editingCourse.modules.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  Aucun module. Ajoutez-en pour structurer le cours.
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                  {editingCourse.modules.map((m, mi) => (
                    <div
                      key={mi}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 space-y-2 bg-white"
                    >
                      {/* Module header */}
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] flex items-center justify-center">
                            {mi + 1}
                          </div>
                          <input
                            className="flex-1 min-w-0 border rounded px-2 py-1.5 text-xs sm:text-sm"
                            value={m.title}
                            onChange={(e) => onModuleChange(mi, "title", e.target.value)}
                            placeholder={`Module ${mi + 1}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="w-24 border rounded px-2 py-1 text-[11px]"
                            value={m.durationLabel}
                            onChange={(e) =>
                              onModuleChange(mi, "durationLabel", e.target.value)
                            }
                            placeholder="Durée"
                          />
                          <div className="flex items-center gap-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => onMoveModule(mi, "up")}
                              disabled={mi === 0}
                              className="px-1.5 py-0.5 border rounded disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveModule(mi, "down")}
                              disabled={mi === editingCourse.modules.length - 1}
                              className="px-1.5 py-0.5 border rounded disabled:opacity-40"
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveModule(mi)}
                            className="text-[11px] text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>

                      {/* Lessons */}
                      <div className="border-t border-dashed pt-2 mt-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-700 font-medium">
                            Leçons
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddLesson(mi)}
                            className="text-[11px] text-[var(--accent)] hover:underline"
                          >
                            + Ajouter une leçon
                          </button>
                        </div>
                        {m.lessons.length === 0 ? (
                          <p className="text-[11px] text-gray-500">
                            Aucune leçon pour ce module.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {m.lessons.map((l, li) => (
                              <div
                                key={li}
                                className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1 bg-gray-50"
                              >
                                <span className="text-[10px] text-gray-500 w-4 text-right">
                                  {li + 1}.
                                </span>
                                <input
                                  className="flex-1 border rounded px-2 py-1 text-[11px]"
                                  value={l.title}
                                  onChange={(e) =>
                                    onLessonChange(mi, li, "title", e.target.value)
                                  }
                                  placeholder={`Leçon ${li + 1}`}
                                />
                                <input
                                  className="w-20 border rounded px-2 py-1 text-[11px]"
                                  value={l.durationLabel}
                                  onChange={(e) =>
                                    onLessonChange(mi, li, "durationLabel", e.target.value)
                                  }
                                  placeholder="Durée"
                                />
                                <div className="flex flex-col gap-0.5 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => onMoveLesson(mi, li, "up")}
                                    disabled={li === 0}
                                    className="px-1 border rounded disabled:opacity-40"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onMoveLesson(mi, li, "down")}
                                    disabled={li === m.lessons.length - 1}
                                    className="px-1 border rounded disabled:opacity-40"
                                  >
                                    ↓
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onRemoveLesson(mi, li)}
                                  className="text-[11px] text-red-600 hover:underline"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t mt-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer le cours"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/* ---------- Bootcamps tab UI ---------- */

type BootcampsTabProps = {
  bootcamps: AdminBootcamp[]
  overviewBootcamps: OverviewBootcamp[]
  courses: AdminCourse[]
  editingBootcamp: AdminBootcamp | null
  onSelectBootcamp: (id: string) => void
  onNewBootcamp: () => void
  onFieldChange: <K extends keyof AdminBootcamp>(key: K, value: AdminBootcamp[K]) => void
  onToggleCourse: (courseId: string) => void
  onMoveCourse: (courseId: string, direction: "up" | "down") => void
  onRemoveCourse: (courseId: string) => void
  onSave: () => void
  onDelete: () => void
  saving: boolean
}

function BootcampsTab(props: BootcampsTabProps) {
  const {
    bootcamps,
    overviewBootcamps,
    courses,
    editingBootcamp,
    onSelectBootcamp,
    onNewBootcamp,
    onFieldChange,
    onToggleCourse,
    onMoveCourse,
    onRemoveCourse,
    onSave,
    onDelete,
    saving,
  } = props

  const enrollCountById = new Map(
    overviewBootcamps.map((b) => [b.id, b.enrollmentsCount] as [string, number]),
  )

  const assignedCourses =
    editingBootcamp?.courseIds
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean) ?? []

  const assignedIds = new Set(editingBootcamp?.courseIds ?? [])
  const availableCourses = courses.filter((c) => !assignedIds.has(c.id || ""))

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] gap-4">
      {/* Left: list of bootcamps */}
      <section className="bg-white border rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800 text-sm">Bootcamps</h2>
          <button
            type="button"
            onClick={onNewBootcamp}
            className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
          >
            + Nouveau bootcamp
          </button>
        </div>

        {bootcamps.length === 0 ? (
          <p className="text-xs text-gray-500">Aucun bootcamp pour l’instant.</p>
        ) : (
          <ul className="space-y-1 max-h-[420px] overflow-auto">
            {bootcamps.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => b.id && onSelectBootcamp(b.id)}
                  className={
                    "flex-1 text-left text-xs border rounded px-2 py-1 truncate " +
                    (editingBootcamp?.id === b.id
                      ? "border-[var(--accent)] bg-[color:rgba(0,0,0,0.02)]"
                      : "border-gray-200 hover:bg-gray-50")
                  }
                >
                  <span className="font-medium">{b.title || "(Sans titre)"}</span>
                  {b.levelLabel && (
                    <span className="text-[10px] text-gray-500 block">
                      {b.levelLabel} · {b.durationLabel}
                    </span>
                  )}
                </button>
                <span className="text-[10px] text-gray-500">
                  {enrollCountById.get(b.id || "") || 0} insc.
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Right: bootcamp form */}
      <section className="bg-white border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">
            {editingBootcamp?.id ? "Modifier le bootcamp" : "Nouveau bootcamp"}
          </h2>
        {editingBootcamp?.id && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        )}
        </div>

        {!editingBootcamp ? (
          <p className="text-xs text-gray-500">
            Sélectionnez un bootcamp à gauche ou créez-en un nouveau.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs mb-1">Titre *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                  value={editingBootcamp.title}
                  onChange={(e) => onFieldChange("title", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1">Durée (label) *</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingBootcamp.durationLabel}
                    onChange={(e) => onFieldChange("durationLabel", e.target.value)}
                    placeholder="Ex : 120 heures"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Niveau *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingBootcamp.levelLabel}
                    onChange={(e) => onFieldChange("levelLabel", e.target.value)}
                  >
                    <option value="">Sélectionner un niveau</option>
                    {LEVEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs mb-1">Certificat</label>
                  <label className="inline-flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={editingBootcamp.certificate}
                      onChange={(e) => onFieldChange("certificate", e.target.checked)}
                    />
                    <span>Oui</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs mb-1">Note</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingBootcamp.rating}
                    onChange={(e) =>
                      onFieldChange("rating", parseFloat(e.target.value || "0"))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Avis</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                    value={editingBootcamp.reviewsCount}
                    onChange={(e) =>
                      onFieldChange(
                        "reviewsCount",
                        parseInt(e.target.value || "0", 10),
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1">Description courte *</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  value={editingBootcamp.shortDescription}
                  onChange={(e) => onFieldChange("shortDescription", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Description longue</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={5}
                  value={editingBootcamp.longDescription}
                  onChange={(e) => onFieldChange("longDescription", e.target.value)}
                />
              </div>
            </div>

            {/* Assign + order courses */}
            <div className="border-t pt-3 mt-3 space-y-3">
              <h3 className="text-xs font-semibold text-gray-800">
                Cours inclus dans ce bootcamp (ordre)
              </h3>

              {assignedCourses.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  Aucun cours assigné. Ajoutez des cours ci-dessous.
                </p>
              ) : (
                <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
                  {assignedCourses.map((c, index) => (
                    <div
                      key={c!.id}
                      className="flex items-center gap-2 border rounded px-2 py-1 bg-gray-50 text-[11px]"
                    >
                      <span className="text-gray-500">{index + 1}.</span>
                      <div className="flex-1 truncate">
                        <span className="font-medium">{c!.title}</span>{" "}
                        <span className="text-gray-500">
                          ({c!.levelLabel}, {c!.durationLabel})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onMoveCourse(c!.id!, "up")}
                          disabled={index === 0}
                          className="px-1 border rounded disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveCourse(c!.id!, "down")}
                          disabled={index === assignedCourses.length - 1}
                          className="px-1 border rounded disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveCourse(c!.id!)}
                        className="text-red-600 hover:underline"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <h4 className="text-[11px] font-semibold text-gray-800">
                  Ajouter des cours
                </h4>
                {availableCourses.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    Tous les cours disponibles sont déjà assignés.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {availableCourses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => c.id && onToggleCourse(c.id)}
                        className="text-[11px] px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t mt-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer le bootcamp"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/* ---------- Instructors (Formateurs) tab UI ---------- */

type InstructorsTabProps = {
  instructors: AdminInstructor[]
  editingInstructor: AdminInstructor | null
  onSelectInstructor: (id: string) => void
  onNewInstructor: () => void
  onFieldChange: <K extends keyof AdminInstructor>(key: K, value: AdminInstructor[K]) => void
  onSave: () => void
  onDelete: () => void
  saving: boolean
  avatarFile: File | null
  onAvatarFileChange: (file: File | null) => void
  onClearAvatar: () => void
}

function InstructorsTab({
  instructors,
  editingInstructor,
  onSelectInstructor,
  onNewInstructor,
  onFieldChange,
  onSave,
  onDelete,
  saving,
  avatarFile,
  onAvatarFileChange,
  onClearAvatar,
}: InstructorsTabProps) {
  return (
    <section className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Formateurs</h2>
          <span className="text-xs text-gray-500">
            {instructors.length} formateur(s)
          </span>
        </div>
        <button
          type="button"
          onClick={onNewInstructor}
          className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
        >
          + Nouveau formateur
        </button>
      </div>

      {/* TABLE DES FORMATEURS */}
      {instructors.length === 0 ? (
        <p className="text-xs text-gray-500">Aucun formateur pour le moment.</p>
      ) : (
        <div className="overflow-auto max-h-[350px] text-xs border rounded">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Avatar</th>
                <th className="border px-2 py-1 text-left">Nom</th>
                <th className="border px-2 py-1 text-left">Description</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((i) => (
                <tr
                  key={i.id}
                  className={
                    "hover:bg-gray-50 cursor-pointer " +
                    (editingInstructor?.id === i.id ? "bg-[color:rgba(0,0,0,0.02)]" : "")
                  }
                  onClick={() => i.id && onSelectInstructor(i.id!)}
                >
                  <td className="border px-2 py-1">
                    {i.avatar ? (
                      <img
                        src={i.avatar}
                        alt={`${i.firstName} ${i.lastName}`}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                        {i.firstName.charAt(0).toUpperCase()}
                        {i.lastName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    <div className="font-medium">
                      {i.firstName} {i.lastName}
                    </div>
                  </td>
                  <td className="border px-2 py-1">
                    <div className="max-w-md line-clamp-3">
                      {i.description || <span className="text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        i.id && onSelectInstructor(i.id)
                      }}
                      className="text-[11px] text-[var(--accent)] hover:underline mr-2"
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORMULAIRE AJOUT / MODIF */}
      <div className="border-t pt-3 mt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-800">
            {editingInstructor?.id ? "Modifier le formateur" : "Nouveau formateur"}
          </h3>
          {editingInstructor?.id && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          )}
        </div>

        {!editingInstructor ? (
          <p className="text-xs text-gray-500">
            Sélectionnez un formateur ci-dessus ou cliquez sur &quot;Nouveau formateur&quot;.
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Prénom *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                  value={editingInstructor.firstName}
                  onChange={(e) => onFieldChange("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Nom *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
                  value={editingInstructor.lastName}
                  onChange={(e) => onFieldChange("lastName", e.target.value)}
                />
              </div>
            </div>

            {/* Avatar upload + preview */}
            <div>
              <label className="block text-xs mb-1">Avatar</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-100">
                  {(() => {
                    const previewUrl = avatarFile
                      ? URL.createObjectURL(avatarFile)
                      : editingInstructor.avatar || ""

                    if (previewUrl) {
                      return (
                        <img
                          src={previewUrl}
                          alt="Avatar formateur"
                          className="w-full h-full object-cover"
                        />
                      )
                    }

                    return (
                      <span className="text-xs font-semibold text-gray-600">
                        {editingInstructor.firstName.charAt(0).toUpperCase()}
                        {editingInstructor.lastName.charAt(0).toUpperCase()}
                      </span>
                    )
                  })()}
                </div>

                <div className="flex flex-col gap-1 text-[11px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      onAvatarFileChange(e.target.files?.[0] ? e.target.files[0] : null)
                    }
                    className="text-[11px]"
                  />
                  {(editingInstructor.avatar || avatarFile) && (
                    <button
                      type="button"
                      onClick={onClearAvatar}
                      className="self-start text-red-600 hover:underline"
                    >
                      Supprimer l'avatar
                    </button>
                  )}
                  <p className="text-[10px] text-gray-500">
                    Formats recommandés : JPG, PNG. Taille raisonnable pour le web.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                rows={4}
                value={editingInstructor.description}
                onChange={(e) => onFieldChange("description", e.target.value)}
                placeholder="Bio / expérience du formateur…"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer le formateur"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- Enrollments tab UI ---------- */

type EnrollmentsTabProps = {
  enrollments: AdminEnrollment[]
  onChangeStatus: (id: string, status: EnrollmentStatus) => void
  onDelete: (id: string) => void
}

function EnrollmentsTab({ enrollments, onChangeStatus, onDelete }: EnrollmentsTabProps) {
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | "all">("all")

  const statusOrder: Record<EnrollmentStatus, number> = {
    pending: 0,
    contacted: 1,
    confirmed: 2,
  }

  const counts = {
    pending: enrollments.filter((e) => e.status === "pending").length,
    contacted: enrollments.filter((e) => e.status === "contacted").length,
    confirmed: enrollments.filter((e) => e.status === "confirmed").length,
  }

  const filtered =
    statusFilter === "all"
      ? enrollments
      : enrollments.filter((e) => e.status === statusFilter)

  const sorted = [...filtered].sort((a, b) => {
    const sa = statusOrder[a.status]
    const sb = statusOrder[b.status]
    if (sa !== sb) return sa - sb
    // newest first inside each status
    return (b.created || "").localeCompare(a.created || "")
  })

  return (
    <section className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Inscriptions</h2>
          <span className="text-xs text-gray-500">
            {enrollments.length} inscription(s) au total
          </span>
        </div>

        {/* Status filter buttons */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-gray-500 mr-1">Filtrer :</span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={
              "px-2.5 py-1 rounded-full border " +
              (statusFilter === "all"
                ? "border-[var(--accent)] bg-[color:rgba(0,0,0,0.02)] text-[var(--accent)]"
                : "border-gray-200 text-gray-700 hover:bg-gray-50")
            }
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={
              "px-2.5 py-1 rounded-full border flex items-center gap-1 " +
              (statusFilter === "pending"
                ? "border-[var(--accent)] bg-[color:rgba(0,0,0,0.02)] text-[var(--accent)]"
                : "border-gray-200 text-gray-700 hover:bg-gray-50")
            }
          >
            <span>En attente</span>
            <span className="text-[10px] bg-yellow-100 text-yellow-800 rounded-full px-1.5">
              {counts.pending}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("contacted")}
            className={
              "px-2.5 py-1 rounded-full border flex items-center gap-1 " +
              (statusFilter === "contacted"
                ? "border-[var(--accent)] bg-[color:rgba(0,0,0,0.02)] text-[var(--accent)]"
                : "border-gray-200 text-gray-700 hover:bg-gray-50")
            }
          >
            <span>Contacté</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 rounded-full px-1.5">
              {counts.contacted}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("confirmed")}
            className={
              "px-2.5 py-1 rounded-full border flex items-center gap-1 " +
              (statusFilter === "confirmed"
                ? "border-[var(--accent)] bg-[color:rgba(0,0,0,0.02)] text-[var(--accent)]"
                : "border-gray-200 text-gray-700 hover:bg-gray-50")
            }
          >
            <span>Confirmé</span>
            <span className="text-[10px] bg-green-100 text-green-800 rounded-full px-1.5">
              {counts.confirmed}
            </span>
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-500">
          Aucune inscription pour ce filtre.
        </p>
      ) : (
        <div className="overflow-auto max-h-[650px] text-xs">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left">Nom</th>
                <th className="border px-2 py-1 text-left">Contact</th>
                <th className="border px-2 py-1 text-left">Programme</th>
                <th className="border px-2 py-1 text-left">Exp.</th>
                <th className="border px-2 py-1 text-left">Statut</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Note</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 align-top">
                  <td className="border px-2 py-1">
                    <div className="font-medium">
                      {e.firstName} {e.lastName}
                    </div>
                    <div className="text-[10px] text-gray-500">{e.birthDate}</div>
                  </td>
                  <td className="border px-2 py-1">
                    <div>{e.phone}</div>
                    {e.email && (
                      <div className="text-[10px] text-gray-500 truncate">
                        {e.email}
                      </div>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {e.courseTitle && (
                      <div className="text-[11px]">
                        Cours&nbsp;: <span className="font-medium">{e.courseTitle}</span>
                      </div>
                    )}
                    {e.bootcampTitle && (
                      <div className="text-[11px]">
                        Bootcamp&nbsp;:{" "}
                        <span className="font-medium">{e.bootcampTitle}</span>
                      </div>
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {e.hasExperience ? "Oui" : "Non"}
                  </td>
                  <td className="border px-2 py-1">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={e.status} />
                      <select
                        value={e.status}
                        onChange={(ev) =>
                          onChangeStatus(e.id, ev.target.value as EnrollmentStatus)
                        }
                        className="mt-0.5 border rounded px-1.5 py-0.5 text-[10px]"
                      >
                        <option value="pending">En attente</option>
                        <option value="contacted">Contacté</option>
                        <option value="confirmed">Confirmé</option>
                      </select>
                    </div>
                  </td>
                  <td className="border px-2 py-1">
                    <div>{e.created}</div>
                  </td>
                  <td className="border px-2 py-1">
                    <div className="max-w-xs line-clamp-3 text-[11px]">
                      {e.note || "-"}
                    </div>
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      type="button"
                      onClick={() => onDelete(e.id)}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const label: Record<EnrollmentStatus, string> = {
    pending: "En attente",
    contacted: "Contacté",
    confirmed: "Confirmé",
  }

  const cls: Record<EnrollmentStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
  }

  return (
    <span
      className={
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium " +
        cls[status]
      }
    >
      {label[status]}
    </span>
  )
}
