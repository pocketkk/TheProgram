import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Loader2 } from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'
import { useClientStore, type Client } from '@/store/clientStore'

interface EditClientDialogProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
}

export const EditClientDialog = ({ isOpen, onClose, client }: EditClientDialogProps) => {
  const { updateClient, isLoading } = useClientStore()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
  })

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        notes: client.notes || '',
      })
    }
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    try {
      await updateClient(client.id, formData)
      onClose()
    } catch (error) {
      console.error('Failed to update client:', error)
    }
  }

  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-strong border border-cosmic-700/50 rounded-2xl w-full max-w-lg p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-cosmic-600 to-cosmic-500 p-2">
              <Save className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gradient-celestial">
              Edit Client
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="edit_phone">Phone</Label>
            <Input
              id="edit_phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes about the client..."
              className="w-full min-h-[100px] px-4 py-3 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50
                text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cosmic-500/50
                focus:border-cosmic-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
