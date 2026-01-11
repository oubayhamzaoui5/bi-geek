"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Search, Plus, Edit, Trash2, Eye, 
  ChevronUp, ChevronDown, Save, X, Users,
  BookOpen, Star, Check, ChevronLeft, ChevronRight,
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
type AdminCourse = {
  id?: string
  title: string
  shortDescription: string
  levelLabel: string
  durationLabel: string
}

type AdminBootcamp = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  prerequis: "Aucun" | "Contacter l'administration"
  rating: number
  reviewsCount: number
  isPublished: boolean
  courseIds: string[]
  coverImage?: File | string | null
  coverPreview?: string | null
}

type BootcampsCrudProps = {
  initialBootcamps?: AdminBootcamp[]
  initialCourses?: AdminCourse[]
  onSave?: (bootcamp: AdminBootcamp) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}

const PREREQUIS_OPTIONS = [
  "Aucun",
  "Contacter l'administration"
] as const

export default function BootcampsCrud({
  initialBootcamps = [],
  initialCourses = [],
  onSave,
  onDelete,
  onView
}: BootcampsCrudProps) {
  // 🔔 TOAST SYSTEM - State
  const [toasts, setToasts] = useState<Toast[]>([])

  // State
  const [bootcamps, setBootcamps] = useState<AdminBootcamp[]>(initialBootcamps)
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [editingBootcamp, setEditingBootcamp] = useState<AdminBootcamp | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Course selection state
  const [courseSearch, setCourseSearch] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)

  const courseDropdownRef = useRef<HTMLDivElement | null>(null)

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

  // Load data on mount
  useEffect(() => {
    if (initialBootcamps.length) {
      setBootcamps(initialBootcamps)
    }
    if (initialCourses.length) {
      setCourses(initialCourses)
    }
  }, [initialBootcamps, initialCourses])

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (editingBootcamp?.coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editingBootcamp.coverPreview)
      }
    }
  }, [editingBootcamp?.coverPreview])

  // Create blank bootcamp
  const createBlankBootcamp = (): AdminBootcamp => ({
    title: "",
    shortDescription: "",
    longDescription: "",
    durationLabel: "",
    prerequis: "Aucun",
    rating: 4.8,
    reviewsCount: 0,
    isPublished: true,
    courseIds: [],
    coverImage: null,
    coverPreview: null,
  })

  // Filter bootcamps
  const filteredBootcamps = bootcamps.filter(bootcamp => {
    const matchesSearch = bootcamp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bootcamp.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Filter available courses for dropdown
  const availableCourses = useMemo(() => {
    return courses.filter(course => 
      !editingBootcamp?.courseIds.includes(course.id!) &&
      course.title.toLowerCase().includes(courseSearch.toLowerCase())
    )
  }, [courses, editingBootcamp?.courseIds, courseSearch])

  // Bootcamp handlers
  const handleSelectBootcamp = (bootcamp: AdminBootcamp) => {
    setEditingBootcamp({
      ...JSON.parse(JSON.stringify(bootcamp)),
      coverPreview: bootcamp.coverImage && typeof bootcamp.coverImage === 'string'
        ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`
        : null,
      coverImage: null,
    })
    setIsCreating(false)
  }

  const handleNewBootcamp = () => {
    setEditingBootcamp(createBlankBootcamp())
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingBootcamp(null)
    setIsCreating(false)
  }

  // Close course dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCourseDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSaveBootcamp = async () => {
    if (!editingBootcamp) return
    
    if (!editingBootcamp.title.trim()) {
      showToast("error", "Le titre est obligatoire")
      return
    }

    setLoading(true)
    const loadingToastId = showToast("loading", "Enregistrement du bootcamp en cours...")

    try {
      if (onSave) {
        await onSave(editingBootcamp)
      }
      
      // Update local state
      if (editingBootcamp.id) {
        // Update existing
        setBootcamps(prev => prev.map(b => 
          b.id === editingBootcamp.id ? {
            ...editingBootcamp,
            coverImage: editingBootcamp.coverPreview?.startsWith("http")
              ? editingBootcamp.coverPreview
              : editingBootcamp.coverImage,
          } : b
        ))
      } else {
        // Add new with generated ID
        const newBootcamp = {
          ...editingBootcamp,
          id: `bootcamp_${Date.now()}`
        }
        setBootcamps(prev => [...prev, newBootcamp])
        setEditingBootcamp(newBootcamp)
        setIsCreating(false)
      }
      
      removeToast(loadingToastId)
      showToast("success", "Bootcamp enregistré avec succès!")
      
    } catch (err: any) {
      removeToast(loadingToastId)
      showToast("error", err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBootcamp = async (id: string) => {
    if (!confirm("Supprimer ce bootcamp ? Cette action est irréversible.")) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setBootcamps(prev => prev.filter(b => b.id !== id))
      if (editingBootcamp?.id === id) {
        setEditingBootcamp(null)
      }
      showToast("success", "Bootcamp supprimé avec succès!")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la suppression")
    }
  }

  // Course assignment handlers
  const handleAddCourse = () => {
    if (!editingBootcamp || !selectedCourseId) return
    
    if (!editingBootcamp.courseIds.includes(selectedCourseId)) {
      const courseIds = [...editingBootcamp.courseIds, selectedCourseId]
      setEditingBootcamp({ ...editingBootcamp, courseIds })
      setSelectedCourseId("")
      setCourseSearch("")
      setShowCourseDropdown(false)
    }
  }

  const handleMoveCourse = (courseId: string, direction: "up" | "down") => {
    if (!editingBootcamp) return
    
    const courseIds = [...editingBootcamp.courseIds]
    const currentIndex = courseIds.indexOf(courseId)
    
    if (currentIndex === -1) return
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex >= 0 && targetIndex < courseIds.length) {
      [courseIds[currentIndex], courseIds[targetIndex]] = [courseIds[targetIndex], courseIds[currentIndex]]
      setEditingBootcamp({ ...editingBootcamp, courseIds })
    }
  }

  const handleRemoveCourse = (courseId: string) => {
    if (!editingBootcamp) return
    
    const courseIds = editingBootcamp.courseIds.filter(id => id !== courseId)
    setEditingBootcamp({ ...editingBootcamp, courseIds })
  }

  // Get assigned courses
  const getAssignedCourses = () => {
    if (!editingBootcamp) return []
    return editingBootcamp.courseIds
      .map(id => courses.find(c => c.id === id))
      .filter(Boolean) as AdminCourse[]
  }

  // Handle image upload
  const handleImageChange = (file: File) => {
    if (!editingBootcamp) return
    
    // Revoke previous blob URL
    if (editingBootcamp.coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editingBootcamp.coverPreview)
    }
    
    setEditingBootcamp({
      ...editingBootcamp,
      coverImage: file,
      coverPreview: URL.createObjectURL(file),
    })
  }

  // Handle key press for course search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedCourseId) {
      handleAddCourse()
    }
  }

  return (
    <div className="h-screen px-6 py-4 overflow-hidden">
      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Column - Bootcamps List */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
          {/* Bootcamps Overview */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Total Bootcamps */}
            <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-sm text-gray-500 text-center">Total des bootcamps</p>
                <p className="text-3xl font-bold text-gray-900 mt-2 text-center">
                  {bootcamps.length}
                </p>
              </div>
             
            </div>

            {/* Add Bootcamp */}
            <button
              onClick={handleNewBootcamp}
              className="bg-accent cursor-pointer text-white rounded-xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-8 h-8" />
              <span className="font-semibold">Ajouter</span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 pb-4">
              <div className="relative" ref={courseDropdownRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un bootcamp..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {filteredBootcamps.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-600 mt-2">Aucun bootcamp trouvé</p>
                </div>
              ) : (
                filteredBootcamps.map((bootcamp) => (
                  <div
                    key={bootcamp.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      editingBootcamp?.id === bootcamp.id ? "bg-accent/10" : ""
                    }`}
                    onClick={() => handleSelectBootcamp(bootcamp)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{bootcamp.title || "Sans titre"}</h4>
                            <p className="text-sm text-gray-500 truncate mt-1">{bootcamp.shortDescription}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-500">{bootcamp.durationLabel}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {onView && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  bootcamp.id && onView(bootcamp.id)
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
                                handleSelectBootcamp(bootcamp)
                              }}
                              className="p-1.5 hover:bg-accent/20 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4 text-accent" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                bootcamp.id && handleDeleteBootcamp(bootcamp.id)
                              }}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          <span>{bootcamp.courseIds.length} Formation</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current text-yellow-500" />
                            {bootcamp.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Edit/Create Form */}
        <div className="lg:col-span-2">
          {editingBootcamp ? (
            <div className="bg-white rounded-xl border shadow-sm">
              {/* Form Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {isCreating ? "Nouveau bootcamp" : "Modifier le bootcamp"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {isCreating ? "Remplissez les informations du nouveau bootcamp" : "Modifiez les informations du bootcamp"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-[#FF0033] cursor-pointer rounded-lg transition-colors hover:bg-gray-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSaveBootcamp}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent cursor-pointer text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-all"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image de couverture
                  </label>
                  <div
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                    onClick={() => document.getElementById("coverInput")?.click()}
                  >
                    {editingBootcamp.coverPreview ? (
                      <img
                        src={editingBootcamp.coverPreview}
                        className="w-full h-full object-cover"
                        alt="Cover preview"
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
                        if (file) handleImageChange(file)
                      }}
                    />
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de base</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre du bootcamp *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingBootcamp.title}
                        onChange={(e) => setEditingBootcamp({ ...editingBootcamp, title: e.target.value })}
                        placeholder="Ex: Bootcamp Développeur Full Stack"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prérequis *
                        </label>
                        <select
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                          value={editingBootcamp.prerequis}
                          onChange={(e) => setEditingBootcamp({ 
                            ...editingBootcamp, 
                            prerequis: e.target.value as "Aucun" | "Contacter l'administration" 
                          })}
                        >
                          {PREREQUIS_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée totale *
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                          value={editingBootcamp.durationLabel}
                          onChange={(e) => setEditingBootcamp({ ...editingBootcamp, durationLabel: e.target.value })}
                          placeholder="Ex: 120 heures"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description courte *
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent resize-none transition-all"
                        rows={3}
                        value={editingBootcamp.shortDescription}
                        onChange={(e) => setEditingBootcamp({ ...editingBootcamp, shortDescription: e.target.value })}
                        placeholder="Une brève description du bootcamp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description détaillée
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent resize-none transition-all"
                        rows={5}
                        value={editingBootcamp.longDescription}
                        onChange={(e) => setEditingBootcamp({ ...editingBootcamp, longDescription: e.target.value })}
                        placeholder="Description complète du bootcamp, objectifs, programme..."
                      />
                    </div>
                  </div>
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
                        value={editingBootcamp.rating}
                        onChange={(e) => setEditingBootcamp({ ...editingBootcamp, rating: parseFloat(e.target.value) || 0 })}
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
                      value={editingBootcamp.reviewsCount}
                      onChange={(e) => setEditingBootcamp({ ...editingBootcamp, reviewsCount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Course Assignment - New Dropdown Style */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Formations inclus</h3>
                  
                  {/* Add Course Dropdown */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ajouter une formation
                    </label>
                    <div className="relative" ref={courseDropdownRef}>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            placeholder="Rechercher une formation..."
                            value={courseSearch}
                            onChange={(e) => {
                              setCourseSearch(e.target.value)
                              setShowCourseDropdown(true)
                            }}
                            onFocus={() => setShowCourseDropdown(true)}
                            onKeyDown={handleKeyPress}
                          />
                          
                          {/* Dropdown */}
                          {showCourseDropdown && availableCourses.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {availableCourses.map((course) => (
                                <div
                                  key={course.id}
                                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => {
  if (!editingBootcamp) return

  if (!editingBootcamp.courseIds.includes(course.id!)) {
    setEditingBootcamp({
      ...editingBootcamp,
      courseIds: [...editingBootcamp.courseIds, course.id!],
    })
  }

  setCourseSearch("")
  setSelectedCourseId("")
  setShowCourseDropdown(false)
}}

                                >
                                  <div className="font-medium text-gray-900">{course.title}</div>
                                  <div className="text-sm text-gray-500 truncate">{course.shortDescription}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                      {course.levelLabel}
                                    </span>
                                    <span className="text-xs text-gray-500">{course.durationLabel}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                     
                      </div>
                      
                      {selectedCourseId && !showCourseDropdown && (
                        <div className="mt-2 text-sm text-gray-600">
                          Sélectionné: {courses.find(c => c.id === selectedCourseId)?.title}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Courses List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-700">Formation sélectionnés ({getAssignedCourses().length})</h4>
                      <p className="text-sm text-gray-500">Cliquez sur les flèches pour réorganiser</p>
                    </div>
                    
                    {getAssignedCourses().length === 0 ? (
                      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                        <p className="text-gray-500">Aucun Formation sélectionné</p>
                        <p className="text-sm text-gray-400 mt-1">Ajoutez des formations ci-dessus</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getAssignedCourses().map((course, index) => (
                          <div
                            key={course.id}
                            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex-shrink-0 w-8 text-center text-gray-500">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 truncate">{course.title}</h5>
                              <p className="text-sm text-gray-500 truncate">{course.shortDescription}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                  {course.levelLabel}
                                </span>
                                <span className="text-xs text-gray-500">{course.durationLabel}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveCourse(course.id!, "up")}
                                disabled={index === 0}
                                className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
                                title="Déplacer vers le haut"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveCourse(course.id!, "down")}
                                disabled={index === getAssignedCourses().length - 1}
                                className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
                                title="Déplacer vers le bas"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveCourse(course.id!)}
                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                title="Retirer"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 p-12 rounded-xl border border-blue-100 text-center h-full flex justify-center flex-col">
              <Users className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun bootcamp sélectionné</h3>
              <p className="text-gray-600 mb-6">
                Sélectionnez un bootcamp dans la liste pour le modifier, ou créez-en un nouveau.
              </p>
              <button
                onClick={handleNewBootcamp}
                className="inline-flex cursor-pointer w-fit mx-auto items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-accent/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Créer un nouveau bootcamp
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