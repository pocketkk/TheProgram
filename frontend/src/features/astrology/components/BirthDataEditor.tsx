/**
 * BirthDataEditor Component
 * Dialog for editing birth data with date, time, and location
 */

import { useEffect } from 'react'
import { Edit2, Calendar, MapPin, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import { DateTimePicker } from './DateTimePicker'
import { LocationSearch } from './LocationSearch'
import { useBirthDataEditor } from '../hooks/useBirthDataEditor'
import type { BirthData } from '@/lib/astrology/types'

export interface BirthDataEditorProps {
  open: boolean
  onClose: () => void
  initialData: BirthData
  initialLocationName?: string
  onSave: (data: BirthData, locationName: string) => void
}

export function BirthDataEditor({
  open,
  onClose,
  initialData,
  initialLocationName = '',
  onSave,
}: BirthDataEditorProps) {
  const {
    editedData,
    errors,
    isValid,
    isDirty,
    updateDate,
    updateLocation,
    reset,
    getBirthData,
  } = useBirthDataEditor(initialData, initialLocationName)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  const handleSave = () => {
    if (isValid) {
      onSave(getBirthData(), editedData.locationName)
      onClose()
    }
  }

  const handleCancel = () => {
    reset()
    onClose()
  }

  // Don't render if not open (Dialog component handles this internally, but good for optimization)
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gradient-celestial">
            <Edit2 className="w-5 h-5" />
            Edit Birth Data
          </DialogTitle>
          <DialogDescription>
            Update your birth date, time, and location to recalculate your chart
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date & Time Picker */}
          <DateTimePicker
            value={editedData.date}
            onChange={updateDate}
            minDate={new Date('1800-01-01')}
            maxDate={new Date()}
            error={errors.date}
          />

          {/* Location Search */}
          <LocationSearch
            value={editedData.locationName}
            latitude={editedData.latitude}
            longitude={editedData.longitude}
            onChange={location =>
              updateLocation({
                name: location.displayName,
                latitude: location.latitude,
                longitude: location.longitude,
              })
            }
            error={errors.location || errors.coordinates}
          />

          {/* Preview Section */}
          <div className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-4 border border-cosmic-700/50">
            <div className="flex items-center gap-2 text-cosmic-300 mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Chart Preview</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-cosmic-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white">
                    {editedData.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-cosmic-400">
                    {editedData.date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-cosmic-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white truncate">{editedData.locationName || 'No location selected'}</div>
                  <div className="text-cosmic-400">
                    {editedData.latitude.toFixed(4)}°, {editedData.longitude.toFixed(4)}°
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="ghost" className="text-cosmic-300 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || !isDirty}
            className="bg-gradient-to-r from-cosmic-600 to-cosmic-500 hover:from-cosmic-500 hover:to-cosmic-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Calculate Chart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
