import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownViewer({ body }) {
  const [rendered, setRendered] = useState('')

  useEffect(() => {
    setRendered(body)
  }, [body])

  return (
    <div className="markdown-viewer">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {rendered}
      </ReactMarkdown>
    </div>
  )
}
