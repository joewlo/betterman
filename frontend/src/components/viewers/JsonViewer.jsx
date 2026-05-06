import React, { useState, useMemo } from 'react'

export default function JsonViewer({ body }) {
  const data = useMemo(() => {
    try { return JSON.parse(body) } catch { return null }
  }, [body])

  if (!data) return <div className="raw-viewer">{body}</div>

  return (
    <div className="json-viewer">
      <JsonNode value={data} path="$" depth={0} />
    </div>
  )
}

function JsonNode({ value, path, depth, isLast = true }) {
  const [collapsed, setCollapsed] = useState(depth > 2)
  const [tooltip, setTooltip] = useState('')

  const copyPath = (e, p) => {
    e.stopPropagation()
    navigator.clipboard.writeText(p).catch(() => {})
    setTooltip('Copied!')
    setTimeout(() => setTooltip(''), 1200)
  }

  if (value === null) return <span className="json-null">null{isLast ? '' : ','}</span>
  if (typeof value === 'boolean') return <span className="json-boolean">{value.toString()}{isLast ? '' : ','}</span>
  if (typeof value === 'number') return <span className="json-number">{value}{isLast ? '' : ','}</span>
  if (typeof value === 'string') return <span className="json-string">"{escapeHtml(value)}"{isLast ? '' : ','}</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="json-bracket">[]</span>

    const toggle = () => setCollapsed(!collapsed)
    const comma = isLast ? '' : ','

    return (
      <span className="json-node">
        <span className="json-toggle" onClick={toggle}>{collapsed ? '\u25B6' : '\u25BC'}</span>
        <span className="json-bracket">[</span>
        {collapsed ? (
          <span className="json-collapsed">
            <span className="json-bracket"> {value.length} items </span>
            <span className="json-bracket">]</span>{comma}
          </span>
        ) : (
          <>
            <div style={{ paddingLeft: 20 }}>
              {value.map((item, idx) => (
                <div key={idx}>
                  <JsonNode value={item} path={`${path}[${idx}]`} depth={depth + 1} isLast={idx === value.length - 1} />
                </div>
              ))}
            </div>
            <span className="json-bracket">]</span>{comma}
          </>
        )}
      </span>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return <span className="json-bracket">{'{}'}</span>

    const toggle = () => setCollapsed(!collapsed)
    const comma = isLast ? '' : ','

    return (
      <span className="json-node">
        <span className="json-toggle" onClick={toggle}>{collapsed ? '\u25B6' : '\u25BC'}</span>
        <span className="json-bracket">{'{'}</span>
        {collapsed ? (
          <span className="json-collapsed">
            <span className="json-bracket"> {entries.length} keys </span>
            <span className="json-bracket">{'}'}</span>{comma}
          </span>
        ) : (
          <>
            <div style={{ paddingLeft: 20 }}>
              {entries.map(([key, val], idx) => (
                <div key={key}>
                  <span className="json-key">
                    "{escapeHtml(key)}"
                    <span
                      className="json-copy-path"
                      onClick={(e) => copyPath(e, `${path}.${key}`)}
                      title="Copy path"
                    >
                      {tooltip || '📋'}
                    </span>
                  </span>
                  <span className="json-bracket">: </span>
                  <JsonNode
                    value={val}
                    path={`${path}.${key}`}
                    depth={depth + 1}
                    isLast={idx === entries.length - 1}
                  />
                </div>
              ))}
            </div>
            <span className="json-bracket">{'}'}</span>{comma}
          </>
        )}
      </span>
    )
  }

  return <span>{String(value)}</span>
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
