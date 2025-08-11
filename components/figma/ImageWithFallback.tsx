import React, { useState } from 'react'
import Image from 'next/image'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
  width?: number
  height?: number
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, width = 88, height = 88, ...rest } = props

  // For data URIs and error state, use regular img tag as Next Image doesn't optimize these
  if (didError || (src && src.startsWith('data:'))) {
    return didError ? (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    ) : (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={src} alt={alt} className={className} style={style} {...rest} />
    )
  }

  // Use Next.js Image component for external URLs
  return (
    <Image
      src={src || ERROR_IMG_SRC}
      alt={alt || 'Image'}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={handleError}
      unoptimized={!src || src.startsWith('blob:')} // Don't optimize blob URLs
    />
  )
}
