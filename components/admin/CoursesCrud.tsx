"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, 
  ChevronUp, ChevronDown, Save, X,
  BookOpen, Clock, Award, Star,
  CheckCircle, AlertCircle, Loader2
} from "lucide-react"

// 🔔 TOAST SYSTEM - Types
type ToastType = "success" | "error" | "loading"
type Toast = {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

// Types
type AdminLesson = {
  id?: string
  title: string
  durationLabel: string
  order?: number
}

type AdminModule = {
  id?: string
  title: string
  durationLabel: string
  order?: number
  lessons: AdminLesson[]
}



type CertificationItem = {
  title: string
  issuer?: string
  description?: string
}

type AdminCourse = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string

  prerequis: "Aucun" | "Contacter l'administration"

  certificate: boolean
  certifications: CertificationItem[]

  rating: number
  reviewsCount: number
  whatYouWillLearn: string[]
  tags: string[]
  modules: AdminModule[]

  coverImage?: File | string | null

  coverPreview?: string | null
}


type CoursesCrudProps = {
  initialCourses?: AdminCourse[]
  onSave?: (course: AdminCourse) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}


const normalizeModulesOrder = (modules: AdminModule[]): AdminModule[] =>
  modules.map((module, moduleIndex) => ({
    ...module,
    order: moduleIndex + 1,
    lessons: module.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      order: lessonIndex + 1,
    })),
  }))




export default function CoursesCrud({




  initialCourses = [],
  onSave,
  onDelete,
  onView
}: CoursesCrudProps) {
  // 🔔 TOAST SYSTEM - State
  const [toasts, setToasts] = useState<Toast[]>([])

  // State
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  // 🔔 TOAST SYSTEM - Helper functions
  const showToast = (type: ToastType, message: string, duration = 5000) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    const newToast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now()
    }
    
    setToasts(prev => [...prev, newToast])
    
    if (type !== "loading") {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, duration)
    }
    
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // 🔔 TOAST SYSTEM - Cleanup effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(toast => {
        if (toast.type === "loading") return true
        return now - toast.createdAt < toast.duration
      }))
    }, 100)
    
    return () => clearInterval(interval)
  }, [])

  // Load courses on mount
  useEffect(() => {
    // In a real app, fetch from API
    if (initialCourses.length) {
      setCourses(initialCourses)
    }
  }, [initialCourses])

  // Create blank course
const createBlankCourse = (): AdminCourse => ({
  title: "",
  shortDescription: "",
  longDescription: "",
  durationLabel: "",

  prerequis: "Aucun",

  certificate: true,
  certifications: [],

  rating: 4.8,
  reviewsCount: 0,
  whatYouWillLearn: [""],
  tags: [],
  modules: [],

  coverImage: null,
  coverPreview: null,
})


  // Filter courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })



  // Course handlers
const handleSelectCourse = (course: AdminCourse) => {
setEditingCourse({
  ...JSON.parse(JSON.stringify(course)), // deep clone everything
  modules: course.modules?.map(m => ({
    ...m,
    lessons: m.lessons ? [...m.lessons] : []  // ensure lessons array exists
  })) || [],
  coverPreview:
    typeof course.coverImage === "string"
      ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/courses/${course.id}/${course.coverImage}`
      : null,
  coverImage: null, // keep null to force new upload if needed
})


  setIsCreating(false)
}






  const handleNewCourse = () => {
    setEditingCourse(createBlankCourse())
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingCourse(null)
    setIsCreating(false)
  }

  const handleSaveCourse = async () => {
    if (!editingCourse) return
    
    if (!editingCourse.title.trim()) {
      showToast("error", "Le titre est obligatoire")
      return
    }

    setLoading(true)
    const loadingToastId = showToast("loading", "Enregistrement du formation en cours...")

    try {
      if (onSave) {
        await onSave(editingCourse)
      }
      
      // Update local state
      if (editingCourse.id) {
        // Update existing
       setCourses(prev =>
  prev.map(c =>
    c.id === editingCourse.id
      ? {
          ...editingCourse,
          coverImage: editingCourse.coverPreview?.startsWith("http")
  ? editingCourse.coverPreview
  : editingCourse.coverImage,

        }
      : c
  )
)

      } else {
        // Add new with generated ID
        const newCourse = {
          ...editingCourse,
          id: `course_${Date.now()}`
        }
        setCourses(prev => [...prev, newCourse])
        setEditingCourse(newCourse)
        setIsCreating(false)
      }
      
      removeToast(loadingToastId)
      showToast("success", "Formation enregistré avec succès!")
      
    } catch (err: any) {
      removeToast(loadingToastId)
      showToast("error", err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Supprimer ce Formation ? Cette action est irréversible.")) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setCourses(prev => prev.filter(c => c.id !== id))
      if (editingCourse?.id === id) {
        setEditingCourse(null)
      }
      showToast("success", "Formation supprimé avec succès!")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la suppression")
    }
  }

  // Module handlers
 const handleAddModule = () => {
  if (!editingCourse) return
  setEditingCourse({
    ...editingCourse,
    modules: [
      ...(editingCourse.modules ?? []),
      { title: "Nouveau module", durationLabel: "", order: editingCourse.modules.length + 1, lessons: [] }

    ]
  })
}


const handleRemoveModule = (index: number) => {
  if (!editingCourse) return
  const modules = (editingCourse.modules ?? []).filter((_, i) => i !== index)
  setEditingCourse({ ...editingCourse, modules })
}



const handleMoveModule = (index: number, direction: "up" | "down") => {
  if (!editingCourse) return

  const modules = [...editingCourse.modules]
  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= modules.length) return

  const [item] = modules.splice(index, 1)
  modules.splice(target, 0, item)

  setEditingCourse({
    ...editingCourse,
    modules: normalizeModulesOrder(modules),
  })
}




  const handleModuleChange = (index: number, field: string, value: string) => {
  if (!editingCourse) return
  const modules = [...(editingCourse.modules ?? [])]
  modules[index] = { ...modules[index], [field]: value, lessons: modules[index].lessons ?? [] }
  setEditingCourse({ ...editingCourse, modules })
}


  // Lesson handlers
 const handleAddLesson = (moduleIndex: number) => {
  if (!editingCourse) return

  const modules = editingCourse.modules.map((module, i) =>
    i === moduleIndex
      ? {
          ...module,
          lessons: [
            ...module.lessons,
            {
  title: "Nouvelle leçon",
  durationLabel: "",
  order: module.lessons.length + 1,
}
          ]
        }
      : module
  )

  setEditingCourse({ ...editingCourse, modules })
}


  const handleRemoveLesson = (moduleIndex: number, lessonIndex: number) => {
    if (!editingCourse) return
    const modules = [...editingCourse.modules]
    modules[moduleIndex].lessons = modules[moduleIndex].lessons.filter(
      (_, i) => i !== lessonIndex
    )
    setEditingCourse({ ...editingCourse, modules })
  }

const handleMoveLesson = (
  moduleIndex: number,
  lessonIndex: number,
  direction: "up" | "down"
) => {
  if (!editingCourse) return

  const modules = editingCourse.modules.map((module, i) => {
    if (i !== moduleIndex) return module

    const lessons = [...module.lessons]
    const target = direction === "up" ? lessonIndex - 1 : lessonIndex + 1
    if (target < 0 || target >= lessons.length) return module

    const [item] = lessons.splice(lessonIndex, 1)
    lessons.splice(target, 0, item)

    return {
      ...module,
      lessons: lessons.map((l, idx) => ({
        ...l,
        order: idx + 1,
      })),
    }
  })

  setEditingCourse({
    ...editingCourse,
    modules: normalizeModulesOrder(modules),
  })
}




const handleLessonChange = (
  moduleIndex: number,
  lessonIndex: number,
  field: string,
  value: string
) => {
  if (!editingCourse) return

  const modules = editingCourse.modules.map((module, i) => {
    if (i !== moduleIndex) return module

    const lessons = module.lessons.map((lesson, j) =>
      j === lessonIndex ? { ...lesson, [field]: value } : lesson
    )

    return { ...module, lessons }
  })

  setEditingCourse({ ...editingCourse, modules })
}


  // What you'll learn handlers
  const handleAddWhatItem = () => {
    if (!editingCourse) return
    setEditingCourse({
      ...editingCourse,
      whatYouWillLearn: [...editingCourse.whatYouWillLearn, ""]
    })
  }

  const handleUpdateWhatItem = (index: number, value: string) => {
    if (!editingCourse) return
    const items = [...editingCourse.whatYouWillLearn]
    items[index] = value
    setEditingCourse({ ...editingCourse, whatYouWillLearn: items })
  }

  const handleRemoveWhatItem = (index: number) => {
    if (!editingCourse) return
    const items = editingCourse.whatYouWillLearn.filter((_, i) => i !== index)
    setEditingCourse({ ...editingCourse, whatYouWillLearn: items })
  }

  // Tags handlers
const handleAddTag = () => {
  if (!editingCourse) return
  setEditingCourse({
    ...editingCourse,
    tags: [...editingCourse.tags, ""]  // same, now visible
  })
}


  const handleUpdateTag = (index: number, value: string) => {
    if (!editingCourse) return
    const tags = [...editingCourse.tags]
    tags[index] = value
    setEditingCourse({ ...editingCourse, tags })
  }

  const handleRemoveTag = (index: number) => {
    if (!editingCourse) return
    const tags = editingCourse.tags.filter((_, i) => i !== index)
    setEditingCourse({ ...editingCourse, tags })
  }

  // Stats
const totalLessons = courses.reduce(
  (acc, course) =>
    acc +
    (course.modules?.reduce(
      (mAcc, module) => mAcc + (module.lessons?.length || 0),
      0
    ) || 0),
  0
)

const publishedCourses = courses.filter(c => !c.id?.includes('draft')).length


useEffect(() => {
  return () => {
    if (editingCourse?.coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editingCourse.coverPreview)
    }
  }
}, [editingCourse?.coverPreview])





  return (
<div className="h-screen px-6 py-4 overflow-hidden">     

    
      {/* Main Content - Two Column Layout */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Left Column - Courses List */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
            {/* Courses Overview */}
            
  <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Total Courses */}
  <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
    <div>
      <p className="text-sm text-gray-500  text-center">Total des formation</p>
      <p className="text-3xl font-bold text-gray-900 mt-2  text-center">
        {courses.length}
      </p>
    </div>
   
  </div>

  {/* Add Course */}
  <button
    onClick={handleNewCourse}
    className="bg-accent cursor-pointer text-white rounded-xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2"
  >
    <Plus className="w-8 h-8" />
    <span className="font-semibold">Ajouter</span>
  </button>
</div>

          {/* Search & Filter */}
  <div className="bg-white p-4 rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="space-y-4 pb-4">
                <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher une Formation..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
          
            </div>
       
            
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-600 mt-2">Aucun Formation trouvé</p>
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      editingCourse?.id === course.id ? "bg-accent/10" : ""
                    }`}
                    onClick={() => handleSelectCourse(course)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{course.title || "Sans titre"}</h4>
                        <p className="text-sm text-gray-500 truncate mt-1">{course.shortDescription}</p>
                        <div className="flex items-center gap-3 mt-2">
                       
                          <span className="text-xs text-gray-500">{course.durationLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {onView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              course.id && onView(course.id)
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectCourse(course)
                          }}
                          className="p-1.5 hover:bg-accent/20 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-accent" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            course.id && handleDeleteCourse(course.id)
                          }}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>{course.modules?.length || 0} modules</span>

                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-yellow-500" />
                        {course.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          
        </div>

        {/* Right Column - Edit/Create Form */}
        <div className="lg:col-span-2">
          {editingCourse ? (
            <div className="bg-white rounded-xl border shadow-sm">
              {/* Form Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {isCreating ? "Nouvelle Formation" : "Modifier la Formation"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {isCreating ? "Remplissez les informations du nouvelle Formation" : "Modifiez les informations du Formation"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-[#FF0033] cursor-pointer  rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSaveCourse}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent cursor-pointer text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                <div>
<div
  className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative mb-3"
  onClick={() => document.getElementById("coverInput")?.click()}
>
  {editingCourse.coverPreview ? (
    <img
      src={editingCourse.coverPreview}
      className="w-full h-full object-cover"
    />
  ) : (
    <>
      <div className="text-gray-400 text-4xl mb-2">+</div>
      <p className="text-gray-500 text-sm">Résolution recommandée : 1920x1080</p>
    </>
  )}
  <input
    id="coverInput"
    type="file"
    accept="image/*"
    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    onChange={(e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setEditingCourse({
        ...editingCourse,
        coverImage: file,
        coverPreview: URL.createObjectURL(file),
      })
    }}
  />
</div>


</div>

                {/* Basic Information */}
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre du Formation *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingCourse.title}
                        onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                        placeholder="Ex: Développement Web avec React"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Prérequis *</label>
  <select
    value={editingCourse.prerequis}
    onChange={(e) =>
      setEditingCourse({
        ...editingCourse,
        prerequis: e.target.value as any,
      })
    }
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
  >
    <option value="Aucun">Aucun</option>
    <option value="Contacter l'administration">
      Contacter l'administration
    </option>
  </select>
</div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée *
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                          value={editingCourse.durationLabel}
                          onChange={(e) => setEditingCourse({ ...editingCourse, durationLabel: e.target.value })}
                          placeholder="Ex: 40 heures"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description courte *
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                        rows={3}
                        value={editingCourse.shortDescription}
                        onChange={(e) => setEditingCourse({ ...editingCourse, shortDescription: e.target.value })}
                        placeholder="Une brève description du Formation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description détaillée
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                        rows={5}
                        value={editingCourse.longDescription}
                        onChange={(e) => setEditingCourse({ ...editingCourse, longDescription: e.target.value })}
                        placeholder="Description complète du Formation, objectifs, prérequis..."
                      />
                    </div>
                  </div>
                </div>

                {/* What You'll Learn */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ce que vous apprendrez</h3>
                  <div className="space-y-3">
                    {editingCourse.whatYouWillLearn.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                          value={item}
                          onChange={(e) => handleUpdateWhatItem(index, e.target.value)}
                          placeholder="Ex: Maîtriser les bases de JavaScript"
                        />
                        <button
                          onClick={() => handleRemoveWhatItem(index)}
                          className="p-2.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddWhatItem}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-accent hover:bg-accent/10 transition-colors text-accent"
                    >
                      + Ajouter un élément
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
  {editingCourse.tags.map((tag, index) => (
    <div
      key={index}
      className="inline-flex items-center gap-1.5 bg-accent/20 text-accent px-3 py-1.5 rounded-full text-sm"
    >
      <input
        className="bg-transparent outline-none min-w-[60px]"
        value={tag}
        onChange={(e) => handleUpdateTag(index, e.target.value)}
        placeholder="Tag"
      />
      <button
        onClick={() => handleRemoveTag(index)}
        className="hover:text-red-600"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  ))}
</div>

                  <button
                    onClick={handleAddTag}
                    className="inline-flex items-center gap-2 text-accent hover:text-accent"
                  >
                    + Ajouter un tag
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                        value={editingCourse.rating}
                        onChange={(e) => setEditingCourse({ ...editingCourse, rating: parseFloat(e.target.value) || 0 })}
                      />
                      <Star className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-500 fill-current" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'avis
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                      value={editingCourse.reviewsCount}
                      onChange={(e) => setEditingCourse({ ...editingCourse, reviewsCount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <br />
             
                </div>
                     <div className="mt-4">
                    <label className="text-lg font-semibold text-gray-900 mb-4 ">
                      Certificat
                    </label>
                    <div className="flex items-center h-12">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={editingCourse.certificate}
                          onChange={(e) => setEditingCourse({ ...editingCourse, certificate: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          {editingCourse.certificate ? "Inclus" : "Non inclus"}
                        </span>
                      </label>
                    </div>
                  </div>
{editingCourse.certificate && (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Certifications
    </h3>

    <div className="space-y-4">
      {editingCourse.certifications.map((cert, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                {index + 1}
              </div>
              <span className="font-medium text-gray-700">
                Certification {index + 1}
              </span>
            </div>

            <button
              onClick={() =>
                setEditingCourse({
                  ...editingCourse,
                  certifications: editingCourse.certifications.filter(
                    (_, i) => i !== index
                  ),
                })
              }
              className="p-2 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>

          {/* Input */}
         <div className="space-y-3">
  {/* Nom du certificat */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Nom du certificat
    </label>
    <input
      type="text"
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
      
      value={cert.title}
      onChange={(e) => {
        const certifications = [...editingCourse.certifications]
        certifications[index].title = e.target.value
        setEditingCourse({ ...editingCourse, certifications })
      }}
    />
  </div>

  {/* Institut / Organisme */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Institut / Organisme
    </label>
    <input
      type="text"
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
      value={cert.issuer || ""}
      onChange={(e) => {
        const certifications = [...editingCourse.certifications]
        certifications[index].issuer = e.target.value
        setEditingCourse({ ...editingCourse, certifications })
      }}
    />
  </div>
</div>

        </div>
      ))}

      {/* Add certification */}
      <button
        onClick={() =>
          setEditingCourse({
            ...editingCourse,
            certifications: [
              ...editingCourse.certifications,
              { title: "" },
            ],
          })
        }
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-accent hover:bg-accent/10 transition-colors text-accent"
      >
        + Ajouter une certification
      </button>
    </div>
  </div>
)}



                {/* Modules & Lessons */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Modules & Leçons</h3>
                    <button
                      onClick={handleAddModule}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un module
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(editingCourse.modules ?? []).map((module, moduleIndex) => (
                      <div key={moduleIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Module Header */}
                        <div className="bg-gray-50 px-5 py-4 border-b flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                              {moduleIndex + 1}
                            </div>
                            <input
                              type="text"
                              className="text-lg font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-accent focus:rounded px-2 py-1"
                              value={module.title}
                              onChange={(e) => handleModuleChange(moduleIndex, "title", e.target.value)}
                              placeholder="Nom du module"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="px-3 py-1.5 border rounded-lg text-sm"
                              placeholder="Durée"
                              value={module.durationLabel}
                              onChange={(e) => handleModuleChange(moduleIndex, "durationLabel", e.target.value)}
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveModule(moduleIndex, "up")}
                                disabled={moduleIndex === 0}
                                className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-100"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveModule(moduleIndex, "down")}
                                disabled={moduleIndex === editingCourse.modules.length - 1}
                                className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-100"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveModule(moduleIndex)}
                              className="p-1.5 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* Lessons */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-700">Leçons</h4>
                            <button
                              onClick={() => handleAddLesson(moduleIndex)}
                              className="text-sm text-accent hover:text-accent"
                            >
                              + Ajouter une leçon
                            </button>
                          </div>

                          <div className="space-y-2">
                            {module.lessons.map((lesson, lessonIndex) => (
                              <div key={lessonIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-500 w-6">{lessonIndex + 1}.</span>
                                <input
                                  type="text"
                                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                  value={lesson.title}
                                  onChange={(e) => handleLessonChange(moduleIndex, lessonIndex, "title", e.target.value)}
                                  placeholder="Titre de la leçon"
                                />
                                <input
                                  type="text"
                                  className="w-24 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                  placeholder="Durée"
                                  value={lesson.durationLabel}
                                  onChange={(e) => handleLessonChange(moduleIndex, lessonIndex, "durationLabel", e.target.value)}
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleMoveLesson(moduleIndex, lessonIndex, "up")}
                                    disabled={lessonIndex === 0}
                                    className="p-1 border rounded disabled:opacity-40 hover:bg-gray-100"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveLesson(moduleIndex, lessonIndex, "down")}
                                    disabled={lessonIndex === module.lessons.length - 1}
                                    className="p-1 border rounded disabled:opacity-40 hover:bg-gray-100"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveLesson(moduleIndex, lessonIndex)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )) || null }
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 p-12 rounded-xl border border-blue-100 text-center h-full flex justify-center flex-col">
              <BookOpen className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun Formation sélectionné</h3>
              <p className="text-gray-600 mb-6">
                Sélectionnez une Formation dans la liste pour le modifier, ou créez-en une nouvelle.
              </p>
              <button
  onClick={handleNewCourse}
  className="inline-flex cursor-pointer w-fit mx-auto items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md"
>

                <Plus className="w-5 h-5" />
                Créer une nouvelle Formation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🔔 TOAST SYSTEM - Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md">
        {toasts.map((toast) => {
          const elapsed = Date.now() - toast.createdAt
          const progress = Math.max(0, 100 - (elapsed / toast.duration) * 100)
          
          return (
            <div
              key={toast.id}
              className={`
                relative overflow-hidden rounded-xl shadow-lg border transform transition-all duration-300
                ${toast.type === "success" 
                  ? "bg-green-50 border-green-200 text-green-800" 
                  : toast.type === "error" 
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "hidden"}
              `}
            >
              {/* Progress Bar */}
              <div 
                className={`
                  absolute bottom-0 left-0 h-1 transition-all duration-100
                  ${toast.type === "success" 
                    ? "bg-green-500" 
                    : toast.type === "error" 
                    ? "bg-red-500"
                    : "bg-blue-500"}
                `}
                style={{ width: `${progress}%` }}
              />
              
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0 mt-0.5">
                  {toast.type === "success" && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-600" />}
                  {toast.type === "loading" && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                </div>
                <div className="flex-1 text-sm font-medium">{toast.message}</div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}