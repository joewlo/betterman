import React from 'react'
import JsonViewer from './viewers/JsonViewer'
import MarkdownViewer from './viewers/MarkdownViewer'
import HtmlViewer from './viewers/HtmlViewer'
import XmlViewer from './viewers/XmlViewer'
import CsvViewer from './viewers/CsvViewer'
import ImageViewer from './viewers/ImageViewer'
import RawViewer from './viewers/RawViewer'

export default function ResponsePanel({ response }) {
  if (!response) {
    return (
      <div className="response-panel">
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}>
          Press <strong style={{ color: 'var(--accent)', margin: '0 4px' }}>Send</strong> to make a request
        </div>
      </div>
    )
  }

  const { status_code, headers, body, elapsed_ms, content_type, content_length, is_binary } = response

  const statusClass = status_code < 200 ? '' :
    status_code < 300 ? 'status-ok' :
    status_code < 400 ? 'status-redirect' :
    status_code < 500 ? 'status-client-error' : 'status-server-error'

  return (
    <div className="response-panel">
      <div className="response-meta">
        <span className={`status-badge ${statusClass}`}>
          {status_code}
        </span>
        <span className="meta-item">
          <strong>{elapsed_ms}ms</strong> response time
        </span>
        {content_length !== null && content_length !== undefined && (
          <span className="meta-item">
            <strong>{formatBytes(content_length)}</strong> body
          </span>
        )}
        {content_type && (
          <span className="meta-item" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
            {content_type}
          </span>
        )}
      </div>
      <div className="response-body">
        <ResponseBodyViewer body={body} contentType={content_type} isBinary={is_binary} />
      </div>
    </div>
  )
}

function ResponseBodyViewer({ body, contentType, isBinary }) {
  if (!body) return <RawViewer body="" />

  const ct = (contentType || '').split(';')[0].trim().toLowerCase()

  if (isBinary || ct.includes('image/')) return <ImageViewer body={body} contentType={contentType} isBinary={isBinary} />
  if (ct.includes('text/html')) return <HtmlViewer body={body} />
  if (ct.includes('text/csv')) return <CsvViewer body={body} />
  if (ct.includes('text/markdown') || ct.includes('text/x-markdown')) return <MarkdownViewer body={body} />
  if (ct.includes('application/xml') || ct.includes('text/xml')) return <XmlViewer body={body} />
  if (ct.includes('application/json') || ct.includes('application/vnd.api+json') || ct.includes('application/problem+json')) {
    try {
      JSON.parse(body)
      return <JsonViewer body={body} />
    } catch {
      return <RawViewer body={body} />
    }
  }

  // Try to detect JSON/XML from content even without content-type
  const trimmed = body.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(body)
      return <JsonViewer body={body} />
    } catch { /* fall through */ }
  }
  if (trimmed.startsWith('<')) return <XmlViewer body={body} />

  return <RawViewer body={body} />
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
