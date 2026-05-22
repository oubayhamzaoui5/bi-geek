"use client"

import { useState, useEffect } from "react"
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, 
  Save, X, User, Upload, Camera,
  Award, BookOpen, Star, ChevronUp, ChevronDown
} from "lucide-react"

// Types
export type AdminInstructor = {
  id?: string
  avatar: string | null
  firstName: string
  lastName: string
  description: string
  email?: string
  phone?: string
  expertise?: string[]
  socialLinks?: {
    linkedin?: string
    twitter?: string
    github?: string
  }
}

type InstructorsCrudProps = {
  initialInstructors?: AdminInstructor[]
  onSave?: (instructor: AdminInstructor, avatarFile?: File) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}

export default function InstructorsCrud({
  initialInstructors = [],
  onSave,
  onDelete,
  onView
}: InstructorsCrudProps) {
  // State
  const [instructors, setInstructors] = useState<AdminInstructor[]>(initialInstructors)
  const [editingInstructor, setEditingInstructor] = useState<AdminInstructor | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load instructors on mount
  useEffect(() => {
    if (initialInstructors.length) {
      setInstructors(initialInstructors)
    }
  }, [initialInstructors])

  // Handle avatar preview
  useEffect(() => {
    if (avatarFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(avatarFile)
    } else {
      setAvatarPreview(null)
    }
  }, [avatarFile])

  // Create blank instructor
  const createBlankInstructor = (): AdminInstructor => ({
    avatar: null,
    firstName: "",
    lastName: "",
    description: "",
    email: "",
    phone: "",
    expertise: [],
    socialLinks: {}
  })

  // Filter instructors
  const filteredInstructors = instructors.filter(instructor => {
    const fullName = `${instructor.firstName} ${instructor.lastName}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase()) ||
      instructor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.expertise?.some(exp => exp.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  // Instructor handlers
  const handleSelectInstructor = (instructor: AdminInstructor) => {
    setEditingInstructor({ ...instructor })
    setAvatarFile(null)
    setAvatarPreview(instructor.avatar || null)
    setIsCreating(false)
  }

  const handleNewInstructor = () => {
    setEditingInstructor(createBlankInstructor())
    setAvatarFile(null)
    setAvatarPreview(null)
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingInstructor(null)
    setAvatarFile(null)
    setAvatarPreview(null)
    setIsCreating(false)
    setError(null)
  }

  const handleSaveInstructor = async () => {
    if (!editingInstructor) return
    
    if (!editingInstructor.firstName.trim() || !editingInstructor.lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (onSave) {
        await onSave(editingInstructor, avatarFile || undefined)
      }
      
      // Update local state
      if (editingInstructor.id) {
        // Update existing
        const updatedInstructor = avatarPreview 
          ? { ...editingInstructor, avatar: avatarPreview }
          : editingInstructor
        
        setInstructors(prev => prev.map(i => 
          i.id === editingInstructor.id ? updatedInstructor : i
        ))
      } else {
        // Add new with generated ID
        const newInstructor = {
          ...editingInstructor,
          id: `instructor_${Date.now()}`,
          avatar: avatarPreview
        }
        setInstructors(prev => [...prev, newInstructor])
        setEditingInstructor(newInstructor)
        setIsCreating(false)
      }
      
      setError("Formateur enregistré avec succès!")
      setTimeout(() => setError(null), 3000)
      
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInstructor = async (id: string) => {
    if (!confirm("Supprimer ce formateur ? Cette action est irréversible.")) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setInstructors(prev => prev.filter(i => i.id !== id))
      if (editingInstructor?.id === id) {
        handleCancelEdit()
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  // Expertise handlers
  const handleAddExpertise = () => {
    if (!editingInstructor) return
    setEditingInstructor({
      ...editingInstructor,
      expertise: [...(editingInstructor.expertise || []), ""]
    })
  }

  const handleUpdateExpertise = (index: number, value: string) => {
    if (!editingInstructor) return
    const expertise = [...(editingInstructor.expertise || [])]
    expertise[index] = value
    setEditingInstructor({ ...editingInstructor, expertise })
  }

  const handleRemoveExpertise = (index: number) => {
    if (!editingInstructor) return
    const expertise = (editingInstructor.expertise || []).filter((_, i) => i !== index)
    setEditingInstructor({ ...editingInstructor, expertise })
  }

  // Social links handlers
  const handleSocialLinkChange = (platform: string, value: string) => {
    if (!editingInstructor) return
    setEditingInstructor({
      ...editingInstructor,
      socialLinks: {
        ...editingInstructor.socialLinks,
        [platform]: value
      }
    })
  }

  // Stats
  const totalInstructors = instructors.length
  const averageExpertise = instructors.length 
    ? (instructors.reduce((acc, i) => acc + (i.expertise?.length || 0), 0) / instructors.length).toFixed(1)
    : "0.0"

  return (
<div className="h-screen px-6 py-4 overflow-hidden flex flex-col">
        {/* Error/Success Message */}
      {error && (
        <div className={`p-4 rounded-xl ${
          error.includes("succès") 
            ? "bg-green-50 border border-green-200 text-green-700" 
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {error}
        </div>
      )}

      {/* Main Content - Two Column Layout */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left Column - Instructors List */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
          {/* Instructors Overview */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Total Instructors */}
            <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-sm text-gray-600 text-center">Total formateurs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2 text-center">
                  {totalInstructors}
                </p>
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">
                Tous niveaux confondus
              </div>
            </div>

            {/* Add Instructor */}
            <button
              onClick={handleNewInstructor}
              className="bg-accent cursor-pointer text-white rounded-xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-8 h-8" />
              <span className="font-semibold">Ajouter</span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un formateur..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Instructors List */}
           <div className="divide-y divide-gray-100 overflow-y-auto flex-1 min-h-0">
              {filteredInstructors.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-600 mt-2">Aucun formateur trouvé</p>
                </div>
              ) : (
                filteredInstructors.map((instructor) => (
                  <div
                    key={instructor.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      editingInstructor?.id === instructor.id ? "bg-accent/10" : ""
                    }`}
                    onClick={() => handleSelectInstructor(instructor)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {instructor.avatar ? (
                              <img
                                src={instructor.avatar}
                                alt={instructor.firstName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-white shadow-sm">
                                <span className="font-semibold text-accent">
                                  {instructor.firstName[0]}{instructor.lastName[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 truncate">
                              {instructor.firstName} {instructor.lastName}
                            </h4>
                            {instructor.email && (
                              <p className="text-sm text-gray-600 truncate">{instructor.email}</p>
                            )}
                          </div>
                        </div>
                        
                        {instructor.expertise && instructor.expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 ml-12">
                            {instructor.expertise.slice(0, 2).map((exp, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent"
                              >
                                {exp}
                              </span>
                            ))}
                            {instructor.expertise.length > 2 && (
                              <span className="text-xs text-gray-600">
                                +{instructor.expertise.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {onView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              instructor.id && onView(instructor.id)
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
                            handleSelectInstructor(instructor)
                          }}
                          className="p-1.5 hover:bg-accent/20 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-accent" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            instructor.id && handleDeleteInstructor(instructor.id)
                          }}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Edit/Create Form */}
<div className="lg:col-span-2 h-full flex flex-col min-h-0">
            {editingInstructor ? (
            <div className="bg-white rounded-xl border shadow-sm h-full flex flex-col min-h-0">
              {/* Form Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {isCreating ? "Nouveau formateur" : "Modifier le formateur"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {isCreating ? "Remplissez les informations du nouveau formateur" : "Modifiez les informations du formateur"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-[#FF0033] cursor-pointer rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSaveInstructor}
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
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Profile Photo */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo de profil</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {avatarPreview || editingInstructor.avatar ? (
                        <img
                          src={avatarPreview || editingInstructor.avatar!}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center border-4 border-white shadow-lg">
                          <User className="w-8 h-8 text-accent" />
                        </div>
                      )}
                      <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center cursor-pointer hover:bg-accent/90 transition-colors shadow-md">
                        <Camera className="w-5 h-5 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setAvatarFile(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Télécharger une photo
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setAvatarFile(file)
                            }
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">
                        Formats: JPG, PNG, WebP. Taille max: 2MB. Recommandé: 400x400px
                      </p>
                      {(avatarPreview || editingInstructor.avatar) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview(null)
                            setEditingInstructor({ ...editingInstructor, avatar: null })
                          }}
                          className="text-sm text-[#FF0033] hover:text-red-700"
                        >
                          Supprimer la photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.firstName}
                        onChange={(e) => setEditingInstructor({ ...editingInstructor, firstName: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.lastName}
                        onChange={(e) => setEditingInstructor({ ...editingInstructor, lastName: e.target.value })}
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.email || ""}
                        onChange={(e) => setEditingInstructor({ ...editingInstructor, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.phone || ""}
                        onChange={(e) => setEditingInstructor({ ...editingInstructor, phone: e.target.value })}
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description / Bio
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none"
                    rows={4}
                    value={editingInstructor.description}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, description: e.target.value })}
                    placeholder="Parlez de votre expérience, expertise, parcours..."
                  />
                </div>

                {/* Expertise */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Domaines d'expertise</h3>
                  <div className="space-y-3">
                    {(editingInstructor.expertise || []).map((exp, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                          value={exp}
                          onChange={(e) => handleUpdateExpertise(index, e.target.value)}
                          placeholder="Ex: React, Node.js, TypeScript"
                        />
                        <button
                          onClick={() => handleRemoveExpertise(index)}
                          className="p-2.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddExpertise}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-accent hover:bg-accent/10 transition-colors text-accent"
                    >
                      + Ajouter une expertise
                    </button>
                  </div>
                </div>

                {/* Social Links */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Liens sociaux</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.socialLinks?.linkedin || ""}
                        onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Twitter / X
                      </label>
                      <input
                        type="url"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.socialLinks?.twitter || ""}
                        onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GitHub
                      </label>
                      <input
                        type="url"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={editingInstructor.socialLinks?.github || ""}
                        onChange={(e) => handleSocialLinkChange("github", e.target.value)}
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 p-12 rounded-xl border border-blue-100 text-center h-full flex justify-center flex-col">
              <User className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun formateur sélectionné</h3>
              <p className="text-gray-600 mb-6">
                Sélectionnez un formateur dans la liste pour le modifier, ou créez-en un nouveau.
              </p>
              <button
                onClick={handleNewInstructor}
                className="inline-flex cursor-pointer w-fit mx-auto items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md"
              >
                <Plus className="w-5 h-5" />
                Créer un nouveau formateur
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}