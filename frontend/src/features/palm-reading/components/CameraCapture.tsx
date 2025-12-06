/**
 * Camera Capture Component
 *
 * Handles camera access and image capture for palm reading.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, RefreshCw, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'

interface CameraCaptureProps {
  onCapture: (image: File) => void
  onCancel?: () => void
  instructions?: string
}

export function CameraCapture({ onCapture, onCancel, instructions }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  // Start camera
  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setCameraError(null)

    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error('Camera error:', err)
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please allow camera permissions and try again.')
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera or upload an image instead.')
        } else {
          setCameraError(`Camera error: ${err.message}`)
        }
      } else {
        setCameraError('Failed to access camera. Please try uploading an image instead.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [facingMode, stream])

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0)

    // Get the image as data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageDataUrl)

    // Stop the camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  // Confirm captured image
  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return

    canvasRef.current.toBlob(
      blob => {
        if (blob) {
          const file = new File([blob], `palm-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          })
          onCapture(file)
        }
      },
      'image/jpeg',
      0.9
    )
  }, [capturedImage, onCapture])

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setTimeout(() => startCamera(), 100)
  }, [stream, startCamera])

  // Handle file upload
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setCameraError('Please select an image file.')
          return
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setCameraError('Image too large. Please select an image under 10MB.')
          return
        }

        onCapture(file)
      }
    },
    [onCapture]
  )

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="glass rounded-lg p-4 text-center">
        <p className="text-gray-300">
          {instructions ||
            'Hold your palm(s) facing the camera with fingers spread. Ensure good lighting for best results.'}
        </p>
      </div>

      {/* Camera View / Captured Image */}
      <div className="relative aspect-[4/3] bg-cosmic-900 rounded-xl overflow-hidden border border-cosmic-700">
        <AnimatePresence mode="wait">
          {cameraError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-red-300 mb-4">{cameraError}</p>
              <div className="flex gap-3">
                <Button onClick={() => startCamera()} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </motion.div>
          ) : capturedImage ? (
            <motion.img
              key="captured"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={capturedImage}
              alt="Captured palm"
              className="w-full h-full object-contain"
            />
          ) : stream ? (
            <motion.video
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-400 mb-4" />
                  <p className="text-gray-400">Starting camera...</p>
                </>
              ) : (
                <>
                  <Camera className="h-16 w-16 text-cosmic-400 mb-4" />
                  <p className="text-gray-400 mb-4">Camera not started</p>
                  <div className="flex gap-3">
                    <Button onClick={() => startCamera()}>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Palm guide overlay */}
        {stream && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-80 border-2 border-dashed border-cosmic-400/50 rounded-lg flex items-center justify-center">
              <span className="text-cosmic-400/70 text-sm">Position palm here</span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={retakePhoto}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={confirmCapture} className="bg-gradient-to-r from-emerald-600 to-emerald-500">
              <CheckCircle className="h-4 w-4 mr-2" />
              Use This Photo
            </Button>
          </>
        ) : stream ? (
          <>
            <Button variant="outline" onClick={switchCamera}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Switch Camera
            </Button>
            <Button
              onClick={capturePhoto}
              size="lg"
              className="bg-gradient-to-r from-cosmic-600 to-cosmic-500 px-8"
            >
              <Camera className="h-5 w-5 mr-2" />
              Capture
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </>
        ) : null}

        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
