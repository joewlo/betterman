import React, { useState, useEffect } from 'react'
import api from '../api'

export default function Sidebar({
  collections,
  activeRequestId,
  activeCollectionId,
  onSelectRequest,
  onSelectCollection,
  onCreateCollection,
  onCreateRequest,
  onDeleteCollection,
  onDeleteRequest,
  onImport,
  onRefresh,
}) {
  const [requests, setRequests] = useState({})
  const [expanded, setExpanded] = useState({})
  const [showNewCol, setShowNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')

  useEffect(() => {
    loadRequests()
  }, [collections])

  const loadRequests = async () => {
    const map = {}
    for (const col of collections) {
      try {
        const reqs = await api.getRequests(col.id)
        map[col.id] = reqs
        if (reqs.length > 0) {
          setExpanded(prev => ({ ...prev, [col.id]: true }))
        }
      } catch (e) {
        map[col.id] = []
      }
    }
    setRequests(map)
  }

  const toggleExpand = (colId) => {
    setExpanded(prev => ({ ...prev, [colId]: !prev[colId] }))
  }

  const handleCreateCollection = async () => {
    if (newColName.trim()) {
      await onCreateCollection(newColName.trim())
      setNewColName('')
      setShowNewCol(false)
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Collections</h2>
        <div className="sidebar-actions">
          <button onClick={() => setShowNewCol(!showNewCol)} title="New Collection">+</button>
          <button onClick={onImport} title="Import">&#8615;</button>
          <button onClick={onRefresh} title="Refresh">&#8635;</button>
        </div>
      </div>

      {showNewCol && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
          <input
            autoFocus
            placeholder="Collection name"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              fontSize: 12,
            }}
          />
          <button
            onClick={handleCreateCollection}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            OK
          </button>
        </div>
      )}

      <div className="sidebar-list">
        {collections.length === 0 ? (
          <div className="empty-sidebar">
            <strong>No collections yet</strong>
            Create a collection and add API requests,<br />
            or import from curl / Postman.
          </div>
        ) : (
          collections.map(col => (
            <div key={col.id} className="collection-group">
              <div className="collection-header" onClick={() => toggleExpand(col.id)}>
                <span className="collection-name">
                  <span className={`chevron ${expanded[col.id] ? 'open' : ''}`}>&#9654;</span>
                  {col.name}
                </span>
                <div className="actions">
                  <button onClick={(e) => { e.stopPropagation(); onCreateRequest(col.id) }} title="New Request">+</button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id) }} title="Delete">&times;</button>
                </div>
              </div>
              {expanded[col.id] && (requests[col.id] || []).map(req => (
                <div
                  key={req.id}
                  className={`request-item ${req.id === activeRequestId ? 'active' : ''}`}
                  onClick={() => onSelectRequest(req)}
                >
                  <span className={`method-badge method-${req.method}`}>{req.method}</span>
                  <span className="name">{req.name}</span>
                </div>
              ))}
              {expanded[col.id] && (requests[col.id] || []).length === 0 && (
                <div className="empty-sidebar" style={{ padding: '8px 24px', fontSize: 11 }}>
                  No requests.
                  <button
                    onClick={() => onCreateRequest(col.id)}
                    style={{
                      background: 'transparent',
                      color: 'var(--accent)',
                      border: 'none',
                      cursor: 'pointer',
                      marginLeft: 6,
                      fontSize: 11,
                    }}
                  >
                    + Add one
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
