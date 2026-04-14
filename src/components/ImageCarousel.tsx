'use client'

import { useEffect, useState, useCallback } from 'react'

type ImageCarouselProps = {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export default function ImageCarousel({ images, initialIndex, onClose }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [panStartY, setPanStartY] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageOrientation, setImageOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const minZoom = 1
  const maxZoom = 5
  const zoomStep = 0.25

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    setImageOrientation(naturalWidth >= naturalHeight ? 'landscape' : 'portrait')
    setImageLoaded(true)
  }

  useEffect(() => {
    setImageLoaded(false)
  }, [currentIndex])

  const minSwipeDistance = 50

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length)
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [images.length])

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [images.length])

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + zoomStep, maxZoom))
  }, [zoomStep])

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - zoomStep, minZoom))
  }, [zoomStep])

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    e.stopPropagation()
    setIsPanning(true)
    setPanStartX(e.clientX - panX)
    setPanStartY(e.clientY - panY)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    e.stopPropagation()
    setPanX(e.clientX - panStartX)
    setPanY(e.clientY - panStartY)
  }

  const onMouseUp = () => {
    setIsPanning(false)
  }

  const onTouchStartPan = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return
    e.stopPropagation()
    setIsPanning(true)
    setPanStartX(e.touches[0].clientX - panX)
    setPanStartY(e.touches[0].clientY - panY)
  }

  const onTouchMovePan = (e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return
    e.stopPropagation()
    setPanX(e.touches[0].clientX - panStartX)
    setPanY(e.touches[0].clientY - panStartY)
  }

  const onTouchEndPan = () => {
    setIsPanning(false)
  }

  const onTouchStartSwipe = (e: React.TouchEvent) => {
    if (zoom !== 1) return
    setTouchEndX(null)
    setTouchStartX(e.targetTouches[0].clientX)
  }

  const onTouchMoveSwipe = (e: React.TouchEvent) => {
    if (zoom !== 1) return
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const onTouchEndSwipe = () => {
    if (!touchStartX || !touchEndX) return
    const distance = touchStartX - touchEndX
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) goToNext()
    if (isRightSwipe) goToPrev()
  }

  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.deltaY < 0) zoomIn()
    else zoomOut()
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    resetZoom()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && images.length > 1) goToNext()
      if (e.key === 'ArrowLeft' && images.length > 1) goToPrev()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
      if (e.key === '0') resetZoom()
    }

    const handleMouseUp = () => {
      setIsPanning(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.overflow = ''
    }
  }, [onClose, goToNext, goToPrev, images.length, zoomIn, zoomOut, resetZoom])

  return (
    <div
      className="fixed inset-0 bg-cream/95 z-[1000] flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-brown-dark/10 border border-brown-dark/20 text-brown-dark text-2xl cursor-pointer flex items-center justify-center transition-all duration-150 z-[1001] hover:bg-brown-dark/20"
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
      >
        ✕
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToPrev()
          }}
          className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-brown-dark/10 border border-brown-dark/20 text-brown-dark text-[28px] cursor-pointer flex items-center justify-center transition-all duration-150 z-[1001] hover:bg-brown-dark/20"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
        >
          ‹
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToNext()
          }}
          className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-brown-dark/10 border border-brown-dark/20 text-brown-dark text-[28px] cursor-pointer flex items-center justify-center transition-all duration-150 z-[1001] hover:bg-brown-dark/20"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
        >
          ›
        </button>
      )}

      {/* Image container */}
      <div
        data-carousel-scroll
        onClick={(e) => e.stopPropagation()}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStartPan}
        onTouchMove={onTouchMovePan}
        onTouchEnd={onTouchEndPan}
        onWheel={onWheel}
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        style={{
          overflow: zoom > 1 ? 'auto' : 'visible',
        }}
      >
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          onLoad={handleImageLoad}
          onDoubleClick={onDoubleClick}
          draggable={false}
          className="w-auto h-auto block rounded-lg shadow-[0_8px_32px_rgba(44,26,14,0.2)] select-none origin-center"
          style={{
            maxWidth: imageOrientation === 'landscape' ? '90vw' : 'auto',
            maxHeight: imageOrientation === 'portrait' ? '90vh' : 'auto',
            transition: isPanning ? 'none' : 'transform 0.2s ease-in-out',
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
          }}
        />

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-brown-dark/60 text-sm font-crimson tracking-wider pointer-events-none">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Swipe gesture layer (only when zoom = 1) */}
        {zoom === 1 && (
          <div
            className="absolute inset-0 z-[1]"
            onTouchStart={onTouchStartSwipe}
            onTouchMove={onTouchMoveSwipe}
            onTouchEnd={onTouchEndSwipe}
          />
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 flex gap-2 items-center z-[1001]">
        <button
          onClick={(e) => {
            e.stopPropagation()
            zoomOut()
          }}
          className="w-10 h-10 rounded-full bg-brown-dark/10 border border-brown-dark/20 text-brown-dark text-xl font-semibold cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-brown-dark/20"
          style={{
            opacity: zoom <= minZoom ? 0.4 : 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
        >
          −
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            resetZoom()
          }}
          className="px-3 h-10 rounded-[20px] bg-brown-dark/10 border border-brown-dark/20 text-brown-dark text-[13px] font-crimson cursor-pointer flex items-center justify-center transition-all duration-150 min-w-[60px] hover:bg-brown-dark/20"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            zoomIn()
          }}
          className="w-10 h-10 rounded-full bg-brown-dark/10 border border-brown-dark/20 text-brown-dark text-xl font-semibold cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-brown-dark/20"
          style={{
            opacity: zoom >= maxZoom ? 0.4 : 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
        >
          +
        </button>
      </div>
    </div>
  )
}
