/**
 * Location History Page
 *
 * Main page for the Location History / Personal Investigation feature.
 * Allows users to import location data and explore their past.
 */
import { useEffect, useState } from 'react'
import {
  Upload,
  MapPin,
  Calendar,
  Home,
  Briefcase,
  Trash2,
  Clock,
  ChevronRight,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import { useLocationHistoryStore } from './stores/locationHistoryStore'
import { ImportDialog } from './components/ImportDialog'

export function LocationHistoryPage() {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'imports' | 'residences' | 'timeline'>('overview')

  const {
    imports,
    stats,
    significantLocations,
    residenceHistory,
    isLoading,
    error,
    fetchImports,
    fetchStats,
    fetchSignificantLocations,
    fetchResidenceHistory,
    deleteImport,
    clearError,
  } = useLocationHistoryStore()

  useEffect(() => {
    fetchImports()
    fetchStats()
    fetchSignificantLocations()
    fetchResidenceHistory()
  }, [fetchImports, fetchStats, fetchSignificantLocations, fetchResidenceHistory])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="w-4 h-4" />
      case 'work':
        return <Briefcase className="w-4 h-4" />
      default:
        return <MapPin className="w-4 h-4" />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Location History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Explore your personal history through location data
          </p>
        </div>
        <button
          onClick={() => setShowImportDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-5 h-5" />
          Import Data
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-red-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <MapPin className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_records.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Location Records</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_imports}</p>
                <p className="text-sm text-gray-500">Data Imports</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {formatDate(stats.date_range_start)}
                </p>
                <p className="text-sm text-gray-500">Earliest Record</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Home className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {residenceHistory?.total_moves ?? 0}
                </p>
                <p className="text-sm text-gray-500">Lifetime Moves</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats?.total_records === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Location Data Yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Import your location history from Google, Apple, or GPS devices to
            explore your past and correlate with astrological events.
          </p>
          <button
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Upload className="w-5 h-5" />
            Import Your First Dataset
          </button>
        </div>
      )}

      {/* Tabs */}
      {stats && stats.total_records > 0 && (
        <>
          <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'imports', label: 'Imports', icon: Upload },
              { id: 'residences', label: 'Residences', icon: Home },
              { id: 'timeline', label: 'Timeline', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 shadow'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
                {stats.sources && Object.entries(stats.sources).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats.sources).map(([source, count]) => (
                      <div
                        key={source}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="capitalize">{source.replace('_', ' ')}</span>
                        <span className="font-medium">{count.toLocaleString()} records</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No data sources yet</p>
                )}

                {/* Significant Locations Preview */}
                <h2 className="text-xl font-semibold mt-8 mb-4">Significant Locations</h2>
                {significantLocations.length > 0 ? (
                  <div className="grid gap-3">
                    {significantLocations.slice(0, 5).map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getLocationTypeIcon(location.location_type)}
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-sm text-gray-500">
                              {location.location_string}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No significant locations identified yet
                  </p>
                )}
              </div>
            )}

            {/* Imports Tab */}
            {activeTab === 'imports' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Import History</h2>
                {isLoading ? (
                  <p>Loading...</p>
                ) : imports.length > 0 ? (
                  <div className="space-y-3">
                    {imports.map((imp) => (
                      <div
                        key={imp.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {imp.source.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                imp.import_status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : imp.import_status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {imp.import_status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {imp.imported_records?.toLocaleString() ?? 0} records
                            {imp.source_file_name && ` from ${imp.source_file_name}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(imp.created_at)}
                            {imp.date_range_start && imp.date_range_end && (
                              <> &middot; {formatDate(imp.date_range_start)} - {formatDate(imp.date_range_end)}</>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this import and all its records?')) {
                              deleteImport(imp.id)
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No imports yet</p>
                )}
              </div>
            )}

            {/* Residences Tab */}
            {activeTab === 'residences' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Residence History</h2>
                <p className="text-gray-500 mb-6">
                  Track where you've lived to correlate with major life transits.
                </p>

                {residenceHistory?.current_residence && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                      Current Residence
                    </h3>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border-2 border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center gap-3">
                        <Home className="w-6 h-6 text-indigo-600" />
                        <div>
                          <p className="font-semibold">
                            {residenceHistory.current_residence.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {residenceHistory.current_residence.location_string}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Since {formatDate(residenceHistory.current_residence.residence_start)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {residenceHistory?.residences && residenceHistory.residences.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                      Previous Residences
                    </h3>
                    <div className="space-y-3">
                      {residenceHistory.residences.map((residence) => (
                        <div
                          key={residence.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-start gap-3">
                            <Home className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">{residence.name}</p>
                              <p className="text-sm text-gray-500">
                                {residence.location_string}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(residence.residence_start)} -{' '}
                                {formatDate(residence.residence_end)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Home className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No residence history recorded</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add significant locations and mark them as residences
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Location Timeline</h2>
                <p className="text-gray-500 mb-6">
                  Coming soon: Visualize your location history on a timeline and
                  correlate with astrological transits.
                </p>
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Timeline visualization coming soon</p>
                  <p className="text-sm text-gray-400 mt-1">
                    This will show your movements over time with transit overlays
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  )
}
