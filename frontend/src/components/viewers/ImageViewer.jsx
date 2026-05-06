import React, { useState, useEffect, useRef } from 'react'

export default function ImageViewer({ body, contentType, isBinary }) {
  const [dimensions, setDimensions] = useState(null)
  const imgRef = useRef(null)

  const dataUrl = isBinary
    ? `data:${contentType || 'image/png'};base64,${body}`
    : `data:${contentType || 'image/png'};base64,${btoa(unescape(encodeURIComponent(body)))}`

  useEffect(() => {
    const img = new Image()
    img.onload = () => setDimensions({ width: img.width, height: img.height })
    img.src = dataUrl
  }, [dataUrl])

  const sizeBytes = new Blob([body]).size

  return (
    <div className="image-viewer">
      <img ref={imgRef} src={dataUrl} alt="Response image" />
      <div className="meta">
        {dimensions && `${dimensions.width} × ${dimensions.height}px · `}
        {formatBytes(sizeBytes)}
      </div>
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
