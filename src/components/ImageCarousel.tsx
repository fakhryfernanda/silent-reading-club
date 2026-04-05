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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(245, 240, 234, 0.95)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(44, 26, 14, 0.1)',
          border: '1px solid rgba(44, 26, 14, 0.2)',
          color: 'var(--brown-dark)',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          zIndex: 1001,
        }}
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
          style={{
            position: 'absolute',
            left: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(44, 26, 14, 0.1)',
            border: '1px solid rgba(44, 26, 14, 0.2)',
            color: 'var(--brown-dark)',
            fontSize: 28,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            zIndex: 1001,
          }}
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
          style={{
            position: 'absolute',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(44, 26, 14, 0.1)',
            border: '1px solid rgba(44, 26, 14, 0.2)',
            color: 'var(--brown-dark)',
            fontSize: 28,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            zIndex: 1001,
          }}
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
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: zoom > 1 ? 'auto' : 'visible',
        }}
      >
        <style>{`
          [data-carousel-scroll]::-webkit-scrollbar {
            display: none;
          }
          [data-carousel-scroll] {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          onLoad={handleImageLoad}
          onDoubleClick={onDoubleClick}
          draggable={false}
          style={{
            maxWidth: imageOrientation === 'landscape' ? '90vw' : 'auto',
            maxHeight: imageOrientation === 'portrait' ? '90vh' : 'auto',
            width: 'auto',
            height: 'auto',
            display: 'block',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(44, 26, 14, 0.2)',
            transition: isPanning ? 'none' : 'transform 0.2s ease-in-out',
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            transformOrigin: 'center center',
            cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
          }}
        />

        {/* Image counter */}
        {images.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'var(--text-muted)',
              fontSize: 14,
              fontFamily: 'Crimson Pro, serif',
              letterSpacing: '0.05em',
              pointerEvents: 'none',
            }}
          >
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Swipe gesture layer (only when zoom = 1) */}
        {zoom === 1 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
            }}
            onTouchStart={onTouchStartSwipe}
            onTouchMove={onTouchMoveSwipe}
            onTouchEnd={onTouchEndSwipe}
          />
        )}
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          zIndex: 1001,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            zoomOut()
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(44, 26, 14, 0.1)',
            border: '1px solid rgba(44, 26, 14, 0.2)',
            color: 'var(--brown-dark)',
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
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
          style={{
            padding: '0 12px',
            height: 40,
            borderRadius: 20,
            background: 'rgba(44, 26, 14, 0.1)',
            border: '1px solid rgba(44, 26, 14, 0.2)',
            color: 'var(--brown-dark)',
            fontSize: 13,
            fontFamily: 'Crimson Pro, serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            minWidth: 60,
          }}
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
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(44, 26, 14, 0.1)',
            border: '1px solid rgba(44, 26, 14, 0.2)',
            color: 'var(--brown-dark)',
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            opacity: zoom >= maxZoom ? 0.4 : 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(44, 26, 14, 0.1)')}
        >
          +
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
