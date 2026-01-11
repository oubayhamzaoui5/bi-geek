"use client"

import { useState, useEffect } from "react"
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, 
  Save, X, User, Upload, Camera,
  Shield, Mail, Phone, Key, AlertCircle,
  CheckCircle, XCircle, UserCheck, UserX
} from "lucide-react"

// Types
type AdminUser = {
  id?: string
  avatar: string | null
  username: string
  email: string
  phone: string
  role: "admin" | "user" | "instructor"
  verified: boolean
  password?: string // Note: In real app, never handle passwords directly like this
}

type UsersCrudProps = {
  initialUsers?: AdminUser[]
  onSave?: (user: AdminUser, avatarFile?: File) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}

export default function UsersCrud({
  initialUsers = [],
  onSave,
  onDelete,
  onView
}: UsersCrudProps) {
  // State
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

 // Update users whenever initialUsers changes
useEffect(() => {
  setUsers(initialUsers)
}, [initialUsers])

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

  // Create blank user
  const createBlankUser = (): AdminUser => ({
    avatar: null,
    username: "",
    email: "",
    phone: "",
    role: "user",
    verified: false
  })

  // Filter users
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    )
  })

  // Stats
  const userStats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    instructor: users.filter(u => u.role === "instructor").length,
    regular: users.filter(u => u.role === "user").length,
    verified: users.filter(u => u.verified).length
  }

  // User handlers
  const handleSelectUser = (user: AdminUser) => {
    setEditingUser({ ...user })
    setAvatarFile(null)
    setAvatarPreview(user.avatar || null)
    setPassword("")
    setConfirmPassword("")
    setIsCreating(false)
  }

  const handleNewUser = () => {
    setEditingUser(createBlankUser())
    setAvatarFile(null)
    setAvatarPreview(null)
    setPassword("")
    setConfirmPassword("")
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setAvatarFile(null)
    setAvatarPreview(null)
    setPassword("")
    setConfirmPassword("")
    setIsCreating(false)
    setError(null)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    
    // Validation
    if (!editingUser.username.trim()) {
      setError("Le nom d'utilisateur est obligatoire")
      return
    }

    if (!editingUser.email.trim()) {
      setError("L'email est obligatoire")
      return
    }

    if (isCreating && !password) {
      setError("Le mot de passe est obligatoire pour un nouvel utilisateur")
      return
    }

    if (isCreating && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    if (editingUser.role === "instructor") {
      setError("Pour créer ou modifier un instructeur, veuillez utiliser la page Instructeurs")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userToSave = {
        ...editingUser,
        ...(isCreating && password ? { password } : {})
      }

      if (onSave) {
        await onSave(userToSave, avatarFile || undefined)
      }
      
      // Update local state
      if (editingUser.id) {
        // Update existing
        const updatedUser = avatarPreview 
          ? { ...editingUser, avatar: avatarPreview }
          : editingUser
        
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id ? updatedUser : u
        ))
      } else {
        // Add new with generated ID
        const newUser = {
          ...editingUser,
          id: `user_${Date.now()}`,
          avatar: avatarPreview
        }
        setUsers(prev => [...prev, newUser])
        setEditingUser(newUser)
        setIsCreating(false)
      }
      
      setError("Utilisateur enregistré avec succès!")
      setTimeout(() => setError(null), 3000)
      
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    
    if (user.role === "instructor") {
      setError("Pour supprimer un instructeur, veuillez utiliser la page Instructeurs")
      return
    }

    if (!confirm(`Supprimer l'utilisateur ${user.username} ? Cette action est irréversible.`)) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setUsers(prev => prev.filter(u => u.id !== id))
      if (editingUser?.id === id) {
        handleCancelEdit()
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  // Toggle verification
  const handleToggleVerification = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, verified: !user.verified } : user
    ))
    
    if (editingUser?.id === userId) {
      setEditingUser(prev => prev ? { ...prev, verified: !prev.verified } : null)
    }
  }

  return (
    <div className="h-screen px-6 py-4 overflow-hidden flex flex-col">
      {/* Error/Success Message */}
      {error && (
        <div className={`mb-4 p-4 rounded-xl ${
          error.includes("succès") 
            ? "bg-green-50 border border-green-200 text-green-700" 
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          {error.includes("instructeur") && (
            <p className="mt-2 text-sm">
              Les instructeurs doivent être gérés depuis la page dédiée "Instructeurs".
            </p>
          )}
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column - Users List */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
          {/* Users Overview */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Total Users */}
            <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-sm text-gray-500 text-center">Total utilisateurs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2 text-center">
                  {userStats.total}
                </p>
              </div>
              <div className="mt-2 text-xs text-gray-400 text-center">
                Administrateurs: {userStats.admin}
              </div>
            </div>

            {/* Add User */}
            <button
              onClick={handleNewUser}
              className="bg-accent cursor-pointer text-white rounded-xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-8 h-8" />
              <span className="font-semibold">Ajouter</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-700">{userStats.admin}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">Administrateurs</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-700">{userStats.verified}</span>
              </div>
              <p className="text-xs text-green-600 mt-1">Vérifiés</p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSearchTerm("admin")}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Admins
                </button>
                <button
                  onClick={() => setSearchTerm("instructor")}
                  className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Instructeurs
                </button>
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Tous
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 min-h-0">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-600 mt-2">Aucun utilisateur trouvé</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      editingUser?.id === user.id ? "bg-accent/10" : ""
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                                user.role === "admin" ? "bg-red-100" :
                                user.role === "instructor" ? "bg-purple-100" :
                                "bg-gray-100"
                              }`}>
                                <span className={`font-semibold ${
                                  user.role === "admin" ? "text-red-600" :
                                  user.role === "instructor" ? "text-purple-600" :
                                  "text-gray-600"
                                }`}>
                                  {user.username[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 truncate">
                                {user.username}
                              </h4>
                              {user.verified && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                user.role === "admin" ? "bg-red-100 text-red-700" :
                                user.role === "instructor" ? "bg-purple-100 text-purple-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {user.role === "admin" ? "Admin" :
                                 user.role === "instructor" ? "Instructeur" : "Utilisateur"}
                              </span>
                              {user.phone && (
                                <span className="text-xs text-gray-500">• {user.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            user.id && handleToggleVerification(user.id)
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.verified 
                              ? "hover:bg-red-100 text-red-600" 
                              : "hover:bg-green-100 text-green-600"
                          }`}
                          title={user.verified ? "Marquer non vérifié" : "Marquer vérifié"}
                        >
                          {user.verified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        {onView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              user.id && onView(user.id)
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
                            handleSelectUser(user)
                          }}
                          className="p-1.5 hover:bg-accent/20 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-accent" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            user.id && handleDeleteUser(user.id)
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
          {editingUser ? (
            <div className="bg-white rounded-xl border shadow-sm h-full flex flex-col min-h-0">
              {/* Form Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {isCreating ? "Nouvel utilisateur" : "Modifier l'utilisateur"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {isCreating ? "Créez un nouveau compte utilisateur" : "Modifiez les informations de l'utilisateur"}
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
                      onClick={handleSaveUser}
                      disabled={loading || editingUser.role === "instructor"}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        editingUser.role === "instructor"
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-accent cursor-pointer text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                      }`}
                    >
                      <Save className="w-5 h-5" />
                      {loading ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {editingUser.role === "instructor" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-yellow-800">Gestion des instructeurs</h3>
                        <p className="text-yellow-700 text-sm mt-1">
                          Les instructeurs doivent être gérés depuis la page dédiée "Instructeurs".
                          Pour modifier les informations de cet instructeur, veuillez utiliser la page Instructeurs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile Photo */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo de profil</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {avatarPreview || editingUser.avatar ? (
                        <img
                          src={avatarPreview || editingUser.avatar!}
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
                          disabled={editingUser.role === "instructor"}
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
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30 disabled:opacity-50"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setAvatarFile(file)
                            }
                          }}
                          disabled={editingUser.role === "instructor"}
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Formats: JPG, PNG, WebP. Taille max: 2MB. Recommandé: 400x400px
                      </p>
                      {(avatarPreview || editingUser.avatar) && editingUser.role !== "instructor" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview(null)
                            setEditingUser({ ...editingUser, avatar: null })
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
                        Nom d'utilisateur *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all disabled:opacity-50"
                        value={editingUser.username}
                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                        placeholder="john_doe"
                        disabled={editingUser.role === "instructor"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all disabled:opacity-50"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        placeholder="john@example.com"
                        disabled={editingUser.role === "instructor"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all disabled:opacity-50"
                        value={editingUser.phone || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        placeholder="+33 1 23 45 67 89"
                        disabled={editingUser.role === "instructor"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle
                      </label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all disabled:opacity-50"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ 
                          ...editingUser, 
                          role: e.target.value as "admin" | "user" | "instructor" 
                        })}
                        disabled={editingUser.role === "instructor"}
                      >
                        <option value="user">Utilisateur</option>
                        <option value="admin">Administrateur</option>
                        <option value="instructor">Instructeur</option>
                      </select>
                      {editingUser.role === "instructor" && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Utilisez la page Instructeurs pour modifier ce rôle
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                {isCreating && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Mot de passe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe *
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmer le mot de passe *
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Le mot de passe doit contenir au moins 8 caractères
                    </p>
                  </div>
                )}

                {/* Verification Status */}
                {!isCreating && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut de vérification</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {editingUser.verified ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                              <p className="font-medium text-gray-900">Compte vérifié</p>
                              <p className="text-sm text-gray-600">L'email de cet utilisateur a été vérifié</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-yellow-600" />
                            <div>
                              <p className="font-medium text-gray-900">Compte non vérifié</p>
                              <p className="text-sm text-gray-600">L'email n'a pas encore été vérifié</p>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleVerification(editingUser.id!)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          editingUser.verified
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                        disabled={editingUser.role === "instructor"}
                      >
                        {editingUser.verified ? "Marquer non vérifié" : "Marquer vérifié"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Info */}
                {!isCreating && editingUser.id && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Informations du compte</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">ID de l'utilisateur</p>
                        <p className="font-mono text-gray-900 bg-white px-3 py-1.5 rounded-lg mt-1">
                          {editingUser.id}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Dernière mise à jour</p>
                        <p className="text-gray-900 mt-1">Juste maintenant</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 p-12 rounded-xl border border-blue-100 text-center h-full flex justify-center flex-col">
              <User className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun utilisateur sélectionné</h3>
              <p className="text-gray-600 mb-6">
                Sélectionnez un utilisateur dans la liste pour le modifier, ou créez-en un nouveau.
              </p>
              <button
                onClick={handleNewUser}
                className="inline-flex cursor-pointer w-fit mx-auto items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md"
              >
                <Plus className="w-5 h-5" />
                Créer un nouvel utilisateur
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}