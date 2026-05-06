import React, { useState } from 'react'
import api from '../api'

export default function ImportDialog({ collections, onClose, onComplete }) {
  const [mode, setMode] = useState('curl')
  const [curlCommand, setCurlCommand] = useState('')
  const [postmanJson, setPostmanJson] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading2, setLoading] = useState(false)

  const handleImport = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      if (mode === 'curl') {
        const res = await api.importCurl({
          curl_command: curlCommand,
          collection_id: collectionId ? Number(collectionId) : null,
        })
        setResult(res)
      } else {
        let payload
        try {
          payload = JSON.parse(postmanJson)
        } catch {
          setError('Invalid JSON')
          setLoading(false)
          return
        }
        const res = await api.importPostman({
          payload,
          collection_id: collectionId ? Number(collectionId) : null,
        })
        setResult(res)
      }
      onComplete()
    } catch (e) {
      setError('Import failed: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3>Import</h3>

        <div className="request-tabs" style={{ marginBottom: 12 }}>
          <button className={mode === 'curl' ? 'active' : ''} onClick={() => setMode('curl')}>cURL</button>
          <button className={mode === 'postman' ? 'active' : ''} onClick={() => setMode('postman')}>Postman</button>
        </div>

        {mode === 'curl' ? (
          <textarea
            placeholder="Paste a curl command here..."
            value={curlCommand}
            onChange={(e) => setCurlCommand(e.target.value)}
            autoFocus
          />
        ) : (
          <textarea
            placeholder="Paste Postman Collection JSON (v2.1) here..."
            value={postmanJson}
            onChange={(e) => setPostmanJson(e.target.value)}
            autoFocus
          />
        )}

        {collections.length > 0 && (
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">Import to new collection</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {error && <div className="script-error" style={{ marginTop: 8 }}>{error}</div>}
        {result && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)' }}>
            {result.saved
              ? 'Saved to collection!'
              : result.parsed
                ? `Parsed: ${result.parsed.method} ${result.parsed.url}`
                : `Imported ${result.requests_created || 0} requests to collection #${result.collection_id}`
            }
          </div>
        )}

        <div className="actions">
          <button className="cancel" onClick={onClose}>Cancel</button>
          <button className="confirm" onClick={handleImport} disabled={loading2}>
            {loading2 ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
