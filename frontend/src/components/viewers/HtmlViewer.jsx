import React, { useState } from 'react'

export default function HtmlViewer({ body }) {
  const [tab, setTab] = useState('rendered')

  return (
    <div className="html-viewer">
      <div className="tabs">
        <button className={tab === 'rendered' ? 'active' : ''} onClick={() => setTab('rendered')}>Rendered</button>
        <button className={tab === 'raw' ? 'active' : ''} onClick={() => setTab('raw')}>Raw</button>
      </div>
      {tab === 'rendered' ? (
        <iframe srcDoc={body} sandbox="allow-same-origin" title="HTML Preview" />
      ) : (
        <pre className="raw-code">{body}</pre>
      )}
    </div>
  )
}
