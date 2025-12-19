// types/course.ts
export interface Lesson {
  id: string
  title: string
  duration: string
}

export interface Module {
  id: string
  title: string
  duration: string
  lessons: Lesson[]
}

export interface Course {
  id: string
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
}
