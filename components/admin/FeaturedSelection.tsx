// components/admin/FeaturedSelection.tsx
"use client"

import { useState, useEffect, useMemo , useRef  } from "react"
import { 
  Search, Trash2, Save, X, Users,
  BookOpen, Star, Award, TrendingUp,
  CheckCircle, AlertCircle, Loader2,
  ArrowUp, ArrowDown , Layers
} from "lucide-react"

// Types
type AdminCourse = {
  id: string
  title: string
  shortDescription: string
  levelLabel: string
  durationLabel: string
  coverImage?: string | null
  rating: number
  isPublished: boolean
}

type AdminBootcamp = {
  id: string
  title: string 
  shortDescription: string
  durationLabel: string
  coverImage?: string | null
  rating: number
  isPublished: boolean
  courseIds: string[]
}

type FeaturedItem = {
  id?: string
  itemId: string
  type: 'course' | 'bootcamp'
  order: number
}

// 🔔 TOAST SYSTEM - Types
type ToastType = "success" | "error" | "loading"
type Toast = {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

type FeaturedSelectionProps = {
  initialFeatured?: FeaturedItem[]
  courses: AdminCourse[]
  bootcamps: AdminBootcamp[]
  onSaveFeatured?: (items: FeaturedItem[]) => Promise<void>
  maxItems?: number
}

export default function FeaturedSelection({
  initialFeatured = [],
  courses,
  bootcamps,
  onSaveFeatured,
  maxItems = 3
}: FeaturedSelectionProps) {
  // 🔔 TOAST SYSTEM - State
  const [toasts, setToasts] = useState<Toast[]>([])

  const hasLoadedRef = useRef(false)
  const hasShownLoaderRef = useRef(false)
  const isFirstAutoSave = useRef(true)
  const lastSavedRef = useRef<string>("")

  // State
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>(initialFeatured)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<'courses' | 'bootcamps'>('courses')

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

  // Get item details from ID
  const getItemDetails = (itemId: string, type: 'course' | 'bootcamp') => {
    if (type === 'course') {
      return courses.find(c => c.id === itemId)
    } else {
      return bootcamps.find(b => b.id === itemId)
    }
  }

  // Get full featured items with details
  const fullFeaturedItems = useMemo(() => {
    return featuredItems.map(item => {
      const details = getItemDetails(item.itemId, item.type)
      return {
        ...item,
        title: details?.title || 'N/A',
        description: details?.shortDescription || '',
        image: details?.coverImage || null,
        rating: details?.rating || 0,
        durationLabel: details?.durationLabel || '',
        isPublished: details?.isPublished || true 
      }
    }).filter(item => item.isPublished)
  }, [featuredItems, courses, bootcamps])

  // Check if item is already featured
  const isItemFeatured = (itemId: string): boolean => {
    return featuredItems.some(item => item.itemId === itemId)
  }

  // Get available items (not already featured)
  const getAvailableItems = () => {
    if (activeTab === 'courses') {
      return courses
        .filter(course => (course.isPublished ?? true) && !isItemFeatured(course.id))
        .filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
        )
    } else {
      return bootcamps
        .filter(bootcamp => (bootcamp.isPublished ?? true) && !isItemFeatured(bootcamp.id))
        .filter(item =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }
  }

  // Add item to featured
  const handleAddFeatured = (item: AdminCourse | AdminBootcamp) => {
    const typeCount = featuredItems.filter(f => f.type === (activeTab === 'courses' ? 'course' : 'bootcamp')).length
    
    if (typeCount >= maxItems) {
      showToast("error", `Vous ne pouvez sélectionner que ${maxItems} ${activeTab === 'courses' ? 'Formations' : 'bootcamps'} maximum`)
      return
    }

    const newItem: FeaturedItem = {
      itemId: item.id,
      type: activeTab === 'courses' ? 'course' : 'bootcamp',
      order: featuredItems.length + 1
    }

    setFeaturedItems(prev => [...prev, newItem].map((item, index) => ({
      ...item,
      order: index + 1
    })))
    
    showToast("success", `${activeTab === 'courses' ? 'Formation' : 'Bootcamp'} ajouté aux vedettes`)
  }

  // Remove item from featured
  const handleRemoveFeatured = (itemId: string) => {
    const newItems = featuredItems
      .filter(item => item.itemId !== itemId)
      .map((item, index) => ({ ...item, order: index + 1 }))
    
    setFeaturedItems(newItems)
    showToast("success", "Élément retiré des vedettes")
  }

  // Move item up/down
  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const items = [...featuredItems]
    const currentIndex = items.findIndex(item => item.itemId === itemId)
    
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex >= 0 && newIndex < items.length) {
      [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]]
      
      const updatedItems = items.map((item, index) => ({
        ...item,
        order: index + 1
      }))
      
      setFeaturedItems(updatedItems)
    }
  }

  // Reset selections
  const handleReset = () => {
    if (confirm("Voulez-vous vraiment réinitialiser toutes les sélections ?")) {
      setFeaturedItems([])
      showToast("success", "Sélections réinitialisées")
    }
  }

  // 🔄 AUTO SAVE FEATURED ITEMS (debounced)
  useEffect(() => {
    if (!onSaveFeatured) return
    if (featuredItems.length === 0) return

    const serialized = JSON.stringify(featuredItems)

    if (isFirstAutoSave.current) {
      isFirstAutoSave.current = false
      lastSavedRef.current = serialized
      return
    }

    if (lastSavedRef.current === serialized) return

    const timeout = setTimeout(async () => {
      try {
        await onSaveFeatured(featuredItems)
        lastSavedRef.current = serialized
        showToast("success", "Sélections enregistrées automatiquement")
      } catch {
        showToast("error", "Erreur lors de l'enregistrement automatique")
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [featuredItems])

  return (
    <div className="h-screen px-6 py-4 overflow-hidden">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        
        {/* Left Column - Available Items */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-xl border shadow-sm h-full flex flex-col">
            {/* Tabs */}
            <div className="border-b flex-shrink-0">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    activeTab === 'courses'
                      ? 'border-b-2 border-accent text-accent'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Formations
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('bootcamps')}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    activeTab === 'bootcamps'
                      ? 'border-b-2 border-accent text-accent'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" />
                    Bootcamps
                  </div>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Rechercher ${activeTab === 'courses' ? 'unne Formation' : 'un bootcamp'}...`}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                {getAvailableItems().length === 0 ? (
                  <div className="p-8 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {searchTerm 
                        ? ` ${activeTab === 'courses' ? 'Aucune Formation' : 'Aucun bootcamp'} trouvé`
                        : `Tous les ${activeTab === 'courses' ? 'Formations' : 'bootcamps'} sont sélectionnés ou aucun disponible`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getAvailableItems().map((item) => (
                      <div
                        key={item.id}
                        className="group p-4 border border-gray-200 rounded-lg hover:border-accent transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                            <p className="text-sm text-gray-500 truncate mt-1">{item.shortDescription}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">{item.durationLabel}</span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-gray-600">{item.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddFeatured(item)}
                          disabled={featuredItems.filter(i => i.type === (activeTab === 'courses' ? 'course' : 'bootcamp')).length >= maxItems}
                          className="mt-3 w-full py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          + Ajouter aux vedettes
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Selected Items */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-xl border shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Éléments sélectionnés</h2>
                  <p className="text-gray-600 mt-1">
                    L'ordre d'affichage détermine la priorité d'affichage sur le site
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                    {featuredItems.length} sur {maxItems * 2} sélectionnés
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="px-6 py-4 bg-blue-50 border-y flex-shrink-0">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    Instructions de sélection
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Sélectionnez jusqu'à {maxItems} Formations et {maxItems} bootcamps. 
                    Les éléments seront affichés dans l'ordre que vous définissez ici.
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Items Grid */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto p-6">
                {fullFeaturedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Aucun élément sélectionné
                    </h3>
                    <p className="text-gray-600">
                      Sélectionnez des Formations et bootcamps dans la colonne de gauche
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Courses Section */}
                    {fullFeaturedItems.filter(item => item.type === 'course').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="w-5 h-5 text-accent" />
                          <h3 className="font-semibold text-gray-900">Formations vedettes</h3>
                          <span className="ml-auto text-sm text-gray-500">
                            {fullFeaturedItems.filter(item => item.type === 'course').length}/{maxItems}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {fullFeaturedItems
                            .filter(item => item.type === 'course')
                            .sort((a, b) => a.order - b.order)
                            .map((item) => (
                              <div
                                key={item.itemId}
                                className="border border-gray-200 rounded-xl p-4 hover:border-accent transition-all group relative"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
                                      <Award className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                                              <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
                                                Formation
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                          </div>
                                          <div className="flex items-center gap-2 ml-4">
                                            {item.rating && (
                                              <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                                <span className="text-sm text-gray-600">{item.rating.toFixed(1)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                          <span className="text-xs text-gray-500">{item.durationLabel}</span>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleMoveItem(item.itemId, 'up')}
                                              className="p-1 hover:bg-gray-100 rounded"
                                              disabled={item.order === 1}
                                            >
                                              <ArrowUp className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button
                                              onClick={() => handleMoveItem(item.itemId, 'down')}
                                              className="p-1 hover:bg-gray-100 rounded"
                                              disabled={item.order === fullFeaturedItems.length}
                                            >
                                              <ArrowDown className="w-4 h-4 text-gray-500" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFeatured(item.itemId)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Bootcamps Section */}
                    {fullFeaturedItems.filter(item => item.type === 'bootcamp').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3 mt-6">
                          <Layers className="w-5 h-5 text-accent" />
                          <h3 className="font-semibold text-gray-900">Bootcamps vedettes</h3>
                          <span className="ml-auto text-sm text-gray-500">
                            {fullFeaturedItems.filter(item => item.type === 'bootcamp').length}/{maxItems}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {fullFeaturedItems
                            .filter(item => item.type === 'bootcamp')
                            .sort((a, b) => a.order - b.order)
                            .map((item) => (
                              <div
                                key={item.itemId}
                                className="border border-gray-200 rounded-xl p-4 hover:border-accent transition-all group relative"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
                                        <Award className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />

                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                                              <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
                                                Bootcamp
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate mt-1">{item.description}</p>
                                          </div>
                                          <div className="flex items-center gap-2 ml-4">
                                            {item.rating && (
                                              <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                                <span className="text-sm text-gray-600">{item.rating.toFixed(1)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                          <span className="text-xs text-gray-500">{item.durationLabel}</span>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleMoveItem(item.itemId, 'up')}
                                              className="p-1 hover:bg-gray-100 rounded"
                                              disabled={item.order === 1}
                                            >
                                              <ArrowUp className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button
                                              onClick={() => handleMoveItem(item.itemId, 'down')}
                                              className="p-1 hover:bg-gray-100 rounded"
                                              disabled={item.order === fullFeaturedItems.length}
                                            >
                                              <ArrowDown className="w-4 h-4 text-gray-500" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFeatured(item.itemId)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <p className="font-medium">Conseil :</p>
                  <p>Les éléments en haut de la liste seront affichés en premier</p>
                </div>
                <div className="text-right">
                  <p>Statut : {fullFeaturedItems.length === maxItems * 2 ? '✓ Complet' : 'En cours'}</p>
                  <p>{fullFeaturedItems.length} éléments sélectionnés</p>
                </div>
              </div>
            </div>
          </div>
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