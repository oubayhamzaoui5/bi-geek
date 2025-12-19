// app/course/[id]/page.tsx
import PocketBase from "pocketbase"
import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { CurriculumSection } from "@/components/student/curriculum-section"
import { Footer } from "@/components/footer"

type GuestCourse = {
  id: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  levelLabel: string
  certificate: boolean
  rating: number
  reviewsCount: number
  whatYouWillLearn?: string[]
}

type GuestLesson = {
  title: string
  duration: string
}

type GuestModule = {
  title: string
  duration: string
  lessons: GuestLesson[]
}

type GuestInstructor = {
  fullName: string
  title: string
  description: string
  avatarUrl: string
  linkedinLink: string
}

type PageProps = {
  params: { id: string }
}

export default async function CourseDetailsPage({ params }: PageProps) {
  const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

  // 1) Course (with instructor relation expanded)
  const courseRecord = await pb.collection("courses").getOne(params.id, {
    expand: "instructor",
  })

  const guestCourse: GuestCourse = {
    id: courseRecord.id,
    title: courseRecord.title,
    shortDescription: courseRecord.shortDescription,
    longDescription: courseRecord.longDescription,
    durationLabel: courseRecord.durationLabel,
    levelLabel: courseRecord.levelLabel,
    certificate: courseRecord.certificate,
    rating: courseRecord.rating,
    reviewsCount: courseRecord.reviewsCount,
    whatYouWillLearn: courseRecord.whatYouWillLearn ?? [],
  }

  // 1bis) Instructor (optional)
  let instructorFromPb: GuestInstructor | undefined

  const instructorRecord = (courseRecord.expand as any)?.instructor
  // if relation is 1:1 you'll get an object, if it's multiple you'd get an array
  if (instructorRecord) {
    const inst = Array.isArray(instructorRecord) ? instructorRecord[0] : instructorRecord

    instructorFromPb = {
      fullName: `${inst.firstName} ${inst.lastName}`,
      title: inst.title,
      description: inst.description,
      avatarUrl: `${pb.baseUrl}/api/files/instructors/${inst.id}/${inst.avatar}`,
      linkedinLink: inst.linkedinLink ?? "",
    }
  }

  // 2) Modules
  const moduleRecords = await pb.collection("course_modules").getFullList({
    filter: `course="${guestCourse.id}"`,
    sort: "order",
  })

  // 3) Lessons
  const lessonRecords = await pb.collection("course_lessons").getFullList({
    filter: `course="${guestCourse.id}"`,
    sort: "order",
  })

  const guestModules: GuestModule[] = moduleRecords.map((m: any) => {
    const lessonsForModule = lessonRecords.filter((l: any) => l.module === m.id)

    const lessons: GuestLesson[] = lessonsForModule.map((l: any) => ({
      title: l.title,
      duration: l.durationLabel,
    }))

    return {
      title: m.title,
      duration: m.durationLabel,
      lessons,
    }
  })

  return (
    <div className="flex h-screen bg-muted/30">
      <main className="flex-1 overflow-auto">
        <Navbar />
        <div className="p-6 md:p-8 space-y-6">
          {/* Only guest + course uses PB data */}
          <CourseDetailsSection
            variant="guest"
            context="course"
            courseFromPb={guestCourse}
            instructorFromPb={instructorFromPb}
          />
          <CurriculumSection
            variant="guest"
            context="course"
            modulesFromPb={guestModules}
          />
        </div>
        <Footer />
      </main>
    </div>
  )
}
