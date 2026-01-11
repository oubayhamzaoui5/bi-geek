"use client"

import { useState, useEffect } from "react"
import { 
  Search, Filter, Trash2, Eye, 
  X, CheckCircle, Clock, AlertCircle,
  Download, Mail, Phone, Calendar,
  TrendingUp, Users, BookOpen, ChevronUp, ChevronDown
} from "lucide-react"

// Types
type EnrollmentStatus = "pending" | "contacted" | "confirmed"

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

type EnrollmentsCrudProps = {
  initialEnrollments?: AdminEnrollment[]
  onUpdateStatus?: (id: string, status: EnrollmentStatus) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onExport?: () => void
}

const STATUS_OPTIONS: { value: EnrollmentStatus; label: string; color: string; bgColor: string }[] = [
  { value: "pending", label: "En attente", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  { value: "contacted", label: "Contacté", color: "text-blue-700", bgColor: "bg-blue-100" },
  { value: "confirmed", label: "Confirmé", color: "text-green-700", bgColor: "bg-green-100" },
]

export default function EnrollmentsCrud({
  initialEnrollments = [],
  onUpdateStatus,
  onDelete,
  onExport
}: EnrollmentsCrudProps) {
  // State
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>(initialEnrollments)
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminEnrollment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof AdminEnrollment>('created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Load enrollments on mount
  useEffect(() => {
    if (initialEnrollments.length) {
      setEnrollments(initialEnrollments)
    }
  }, [initialEnrollments])

  // Sort enrollments
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    return 0
  })

  // Filter enrollments
  const filteredEnrollments = sortedEnrollments.filter(enrollment => {
    const matchesStatus = selectedStatus === "all" || enrollment.status === selectedStatus
    const matchesSearch = 
      enrollment.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.phone.includes(searchTerm) ||
      (enrollment.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (enrollment.bootcampTitle?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesStatus && matchesSearch
  })

  // Status counts
  const statusCounts = {
    pending: enrollments.filter(e => e.status === "pending").length,
    contacted: enrollments.filter(e => e.status === "contacted").length,
    confirmed: enrollments.filter(e => e.status === "confirmed").length,
  }

  // Handlers
  const handleUpdateStatus = async (id: string, status: EnrollmentStatus) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(id, status)
      }
      
      setEnrollments(prev => prev.map(e => 
        e.id === id ? { ...e, status } : e
      ))
      
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment(prev => prev ? { ...prev, status } : null)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour")
    }
  }

  const handleDeleteEnrollment = async (id: string) => {
    if (!confirm("Supprimer cette inscription ? Cette action est irréversible.")) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setEnrollments(prev => prev.filter(e => e.id !== id))
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment(null)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export behavior
      const csv = convertToCSV(filteredEnrollments)
      downloadCSV(csv, 'enrollments.csv')
    }
  }

  const handleSort = (field: keyof AdminEnrollment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Get status badge
  const getStatusBadge = (status: EnrollmentStatus) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusOption?.bgColor} ${statusOption?.color}`}>
        {statusOption?.label}
      </span>
    )
  }

  // Stats
  const totalEnrollments = enrollments.length
  const conversionRate = totalEnrollments > 0 
    ? ((statusCounts.confirmed / totalEnrollments) * 100).toFixed(1)
    : "0.0"

  // CSV helpers
  const convertToCSV = (data: AdminEnrollment[]) => {
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Programme', 'Statut', 'Date']
    const rows = data.map(e => [
      e.lastName,
      e.firstName,
      e.email,
      e.phone,
      e.courseTitle || e.bootcampTitle || '',
      e.status,
      formatDate(e.created)
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

type StatCardProps = {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  accent: string
}

function StatCard({ title, value, icon, gradient, accent }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${gradient} p-5 shadow-sm`}>
      
      {/* Accent glow */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full ${accent} opacity-20`} />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>

        <div className="p-3 rounded-xl bg-white/70 backdrop-blur shadow">
          {icon}
        </div>
      </div>
    </div>
  )
}



  return (
    <div className="h-screen px-6 py-4 overflow-hidden flex flex-col gap-6">

     

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    title="Total inscriptions"
    value={totalEnrollments}
    icon={<Users className="w-6 h-6 text-blue-600" />}
    gradient="from-blue-50 to-blue-100"
    accent="bg-blue-500"
  />

  <StatCard
    title="En attente"
    value={statusCounts.pending}
    icon={<Clock className="w-6 h-6 text-yellow-600" />}
    gradient="from-yellow-50 to-yellow-100"
    accent="bg-yellow-500"
  />

  <StatCard
    title="Confirmés"
    value={statusCounts.confirmed}
    icon={<CheckCircle className="w-6 h-6 text-green-600" />}
    gradient="from-green-50 to-green-100"
    accent="bg-green-500"
  />

  <StatCard
    title="Taux de conversion"
    value={`${conversionRate}%`}
    icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
    gradient="from-purple-50 to-purple-100"
    accent="bg-purple-500"
  />
</div>


      {/* Error Message */}
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
        {/* Left Column - Filters & List */}
        <div className="lg:col-span-2 space-y-6 h-full flex flex-col overflow-hidden">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher une inscription..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as EnrollmentStatus | "all")}
                >
                  <option value="all">Tous les statuts</option>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <button className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setSelectedStatus("all")}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedStatus === "all"
                    ? "bg-accent/20 text-accent"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tous ({enrollments.length})
              </button>
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedStatus === status.value
                      ? `${status.bgColor} ${status.color}`
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status.label} ({statusCounts[status.value]})
                </button>
              ))}
            </div>
          </div>

          {/* Enrollments List */}
          <div className="bg-white rounded-xl border shadow-sm flex-1 flex flex-col min-h-0">
  <div className="overflow-y-auto flex-1 min-h-0">

              <div className="divide-y divide-gray-100">
                {filteredEnrollments.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-gray-600 mt-2">Aucune inscription trouvée</p>
                  </div>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <div 
                      key={enrollment.id} 
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedEnrollment?.id === enrollment.id ? "bg-accent/10" : ""
                      }`}
                      onClick={() => setSelectedEnrollment(enrollment)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {enrollment.firstName} {enrollment.lastName}
                            </h4>
                            {getStatusBadge(enrollment.status)}
                          </div>
                          <p className="text-sm text-gray-500 truncate mb-2">
                            {enrollment.courseTitle || enrollment.bootcampTitle || "Non spécifié"}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{enrollment.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{enrollment.phone}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(enrollment.created)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <select
                            value={enrollment.status}
                            onChange={(e) => handleUpdateStatus(enrollment.id, e.target.value as EnrollmentStatus)}
                            className="text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-accent focus:border-accent cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {STATUS_OPTIONS.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEnrollment(enrollment.id)
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
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
        </div>

        {/* Right Column - Details Panel */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          {selectedEnrollment ? (
            <div className="bg-white rounded-xl border shadow-sm h-full flex flex-col min-h-0">
              {/* Details Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Détails de l'inscription</h2>
                    <p className="text-gray-600 mt-1">Informations complètes</p>
                  </div>
                  <button
                    onClick={() => setSelectedEnrollment(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Details Content */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Personal Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Nom complet</span>
                      <span className="text-sm text-gray-900">
                        {selectedEnrollment.firstName} {selectedEnrollment.lastName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Date de naissance</span>
                      <span className="text-sm text-gray-900">{selectedEnrollment.birthDate.split(" ")[0]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Expérience</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedEnrollment.hasExperience 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedEnrollment.hasExperience ? "Avec expérience" : "Débutant"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Coordonnées</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-sm text-gray-900">{selectedEnrollment.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Téléphone</p>
                        <p className="text-sm text-gray-900">{selectedEnrollment.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Program Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Programme</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {selectedEnrollment.courseTitle ? "Cours" : "Bootcamp"}
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedEnrollment.courseTitle || selectedEnrollment.bootcampTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date d'inscription</p>
                        <p className="text-sm text-gray-900">{formatDate(selectedEnrollment.created)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2">{getStatusBadge(selectedEnrollment.status)}</div>
                      <select
                        value={selectedEnrollment.status}
                        onChange={(e) => handleUpdateStatus(selectedEnrollment.id, e.target.value as EnrollmentStatus)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent cursor-pointer"
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedEnrollment.note && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedEnrollment.note}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t">
                  <button
                    onClick={() => handleDeleteEnrollment(selectedEnrollment.id)}
                    className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-accent/10 p-8 rounded-xl border border-blue-100 text-center h-full flex flex-col justify-center">
              <Users className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune inscription sélectionnée</h3>
              <p className="text-gray-600">
                Sélectionnez une inscription dans la liste pour voir les détails.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}