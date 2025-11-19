import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, Mail, Phone, Calendar, BarChart3, FileText, Trash2, Edit, Loader2, Download, Upload } from 'lucide-react'
import { Button, UserAvatar, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { useClientStore, type Client } from '@/store/clientStore'
import { AddClientDialog } from './AddClientDialog'
import { EditClientDialog } from './EditClientDialog'
import { ExportButton, ImportWizard } from '@/features/data-portability'
import { ExportType } from '@/types/export'

export const ClientsPage = () => {
  const { clients, isLoading, fetchClients, deleteClient } = useClientStore()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase()
    return (
      client.first_name.toLowerCase().includes(query) ||
      client.last_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
    )
  })

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteClient(id)
      } catch (error) {
        console.error('Failed to delete client:', error)
      }
    }
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedClientIds.length === filteredClients.length) {
      setSelectedClientIds([])
    } else {
      setSelectedClientIds(filteredClients.map((c) => c.id))
    }
  }

  const handleExportComplete = () => {
    setSelectionMode(false)
    setSelectedClientIds([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gradient-celestial">
            Clients
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your astrology clients and their information
          </p>
        </div>
        <div className="flex gap-2">
          {!selectionMode && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectionMode(true)}
                disabled={clients.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </>
          )}
          {selectionMode && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedClientIds([])
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={toggleSelectAll}
              >
                {selectedClientIds.length === filteredClients.length ? 'Deselect All' : 'Select All'}
              </Button>
              <ExportButton
                exportType={ExportType.CLIENTS}
                clientIds={selectedClientIds}
                variant="primary"
                label={`Export ${selectedClientIds.length} Client${selectedClientIds.length !== 1 ? 's' : ''}`}
                disabled={selectedClientIds.length === 0}
                onExportComplete={handleExportComplete}
              />
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-medium rounded-xl p-4">
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50
              text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cosmic-500/50
              focus:border-cosmic-500 transition-all"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-medium rounded-xl p-4 border border-cosmic-700/30"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cosmic-600/20 p-3">
              <Users className="h-6 w-6 text-cosmic-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Clients</p>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-medium rounded-xl p-4 border border-cosmic-700/30"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cosmic-600/20 p-3">
              <BarChart3 className="h-6 w-6 text-cosmic-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Charts</p>
              <p className="text-2xl font-bold text-white">
                {clients?.reduce((sum, c) => sum + (c.chart_count || 0), 0) || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-medium rounded-xl p-4 border border-cosmic-700/30"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cosmic-600/20 p-3">
              <FileText className="h-6 w-6 text-cosmic-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Birth Data Records</p>
              <p className="text-2xl font-bold text-white">
                {clients?.reduce((sum, c) => sum + (c.birth_data_count || 0), 0) || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cosmic-400" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="glass-medium rounded-xl p-12 text-center">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Get started by adding your first client'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isSelected = selectedClientIds.includes(client.id)
            return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                if (selectionMode) {
                  toggleClientSelection(client.id)
                }
              }}
              className={`glass-medium rounded-xl p-5 border transition-all cursor-pointer ${
                selectionMode
                  ? isSelected
                    ? 'border-cosmic-400 bg-cosmic-700/30'
                    : 'border-cosmic-700/30 hover:border-cosmic-600/50'
                  : 'border-cosmic-700/30 hover:border-cosmic-600/50'
              }`}
            >
              {/* Client Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleClientSelection(client.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded border-cosmic-600 bg-cosmic-900 text-cosmic-500 focus:ring-2 focus:ring-cosmic-500 focus:ring-offset-0 cursor-pointer"
                    />
                  )}
                  <UserAvatar
                    name={`${client.first_name} ${client.last_name || ''}`}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-semibold text-white">
                      {client.first_name} {client.last_name || ''}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Added {new Date(client.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-cosmic-700/30">
                <div className="flex items-center gap-1 text-sm">
                  <BarChart3 className="h-4 w-4 text-cosmic-400" />
                  <span className="text-white font-semibold">{client.chart_count}</span>
                  <span className="text-gray-400">charts</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4 text-cosmic-400" />
                  <span className="text-white font-semibold">{client.birth_data_count}</span>
                  <span className="text-gray-400">birth data</span>
                </div>
              </div>

              {/* Actions */}
              {!selectionMode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(client)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(client.id, `${client.first_name} ${client.last_name || ''}`)
                    }}
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )})}
        </div>
      )}

      {/* Add Client Dialog */}
      <AddClientDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      {/* Edit Client Dialog */}
      <EditClientDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
      />

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Clients</DialogTitle>
          </DialogHeader>
          <ImportWizard
            importType="clients"
            title="Import Clients"
            description="Import client data from a backup file"
            onComplete={() => {
              setIsImportDialogOpen(false)
              fetchClients()
            }}
            onCancel={() => setIsImportDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
