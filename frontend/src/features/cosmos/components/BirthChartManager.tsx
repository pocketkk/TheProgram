/**
 * Birth Chart Manager
 * View, select, and manage saved birth charts
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllBirthCharts, getActiveChartId, setActiveChartId, deleteBirthChart, BirthChart } from '../../../lib/astronomy/birthChart'

interface BirthChartManagerProps {
  onClose: () => void
  onChartSelected: (chartId: string | null) => void
  onCreateNew: () => void
}

export const BirthChartManager: React.FC<BirthChartManagerProps> = ({
  onClose,
  onChartSelected,
  onCreateNew,
}) => {
  const [charts, setCharts] = useState<BirthChart[]>([])
  const [activeChartId, setActiveChartIdState] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadCharts()
  }, [])

  const loadCharts = () => {
    const allCharts = getAllBirthCharts()
    setCharts(allCharts)
    setActiveChartIdState(getActiveChartId())
  }

  const handleSelectChart = (chartId: string) => {
    setActiveChartId(chartId)
    setActiveChartIdState(chartId)
    onChartSelected(chartId)
  }

  const handleClearSelection = () => {
    setActiveChartId(null)
    setActiveChartIdState(null)
    onChartSelected(null)
  }

  const handleDeleteChart = (chartId: string) => {
    deleteBirthChart(chartId)
    loadCharts()
    if (activeChartId === chartId) {
      handleClearSelection()
    }
    setDeleteConfirm(null)
  }

  const formatDate = (dateStr: string) => {
    // Parse date components directly to avoid UTC interpretation issues
    // "1974-09-16" should display as September 16, not shift to the 15th
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed in JS
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Birth Charts</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chart List */}
          <div className="flex-1 overflow-y-auto p-6">
            {charts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Birth Charts Yet</h3>
                <p className="text-slate-400 mb-6">Create your first birth chart to get started</p>
                <button
                  onClick={() => {
                    onClose()
                    onCreateNew()
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
                >
                  Create Birth Chart
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {charts.map((chart) => (
                  <motion.div
                    key={chart.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      activeChartId === chart.id
                        ? 'bg-purple-900/30 border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => handleSelectChart(chart.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{chart.name}</h3>
                          {activeChartId === chart.id && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-300">
                            <span className="text-slate-400">Date:</span> {formatDate(chart.birthDate)}
                          </div>
                          <div className="text-slate-300">
                            <span className="text-slate-400">Time:</span> {chart.birthTime}
                          </div>
                          <div className="text-slate-300">
                            <span className="text-slate-400">Location:</span> {chart.location.name}
                          </div>
                          <div className="text-slate-300">
                            <span className="text-slate-400">Coordinates:</span> {chart.location.latitude.toFixed(2)}°,{' '}
                            {chart.location.longitude.toFixed(2)}°
                          </div>
                        </div>
                        {chart.notes && (
                          <p className="mt-2 text-sm text-slate-400 italic">"{chart.notes}"</p>
                        )}
                      </div>

                      {/* Delete Button */}
                      <div className="ml-4">
                        {deleteConfirm === chart.id ? (
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteChart(chart.id)
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm(null)
                              }}
                              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm(chart.id)
                            }}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            aria-label="Delete chart"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700 flex items-center justify-between">
            <button
              onClick={handleClearSelection}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              disabled={!activeChartId}
            >
              Clear Selection
            </button>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose()
                  onCreateNew()
                }}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                Create New
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
