import React from 'react'

export default function RawViewer({ body }) {
  return (
    <pre className="raw-viewer">{body || ''}</pre>
  )
}
