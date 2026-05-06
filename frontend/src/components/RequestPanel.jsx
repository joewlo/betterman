import React, { useState, useEffect } from 'react'
import api from '../api'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const TABS = ['Params', 'Headers', 'Body', 'Auth', 'Scripts']
const AUTH_TYPES = ['none', 'bearer', 'basic', 'api_key', 'digest', 'oauth2']
const BODY_TYPES = ['none', 'json', 'xml', 'raw', 'x-www-form-urlencoded', 'form-data', 'graphql']

function parseJsonSafe(str, fallback) {
  try { return JSON.parse(str) } catch { return fallback }
}

export default function RequestPanel({ request, onExecute, onSave, loading, error }) {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState([])
  const [queryParams, setQueryParams] = useState([])
  const [body, setBody] = useState('')
  const [bodyType, setBodyType] = useState('none')
  const [name, setName] = useState('')
  const [auth, setAuth] = useState({ type: 'none' })
  const [preScript, setPreScript] = useState('')
  const [postScript, setPostScript] = useState('')
  const [activeTab, setActiveTab] = useState('Params')

  useEffect(() => {
    if (request) {
      setMethod(request.method || 'GET')
      setUrl(request.url || '')
      setName(request.name || '')
      setHeaders(parseJsonSafe(request.headers, [{ key: '', value: '' }]))
      setQueryParams(parseJsonSafe(request.query_params, [{ key: '', value: '' }]))
      setBody(request.body || '')
      setBodyType(request.body_type || 'none')
      setAuth(parseJsonSafe(request.auth, { type: 'none' }))
      setPreScript(request.pre_request_script || '')
      setPostScript(request.post_response_script || '')
    } else {
      setMethod('GET')
      setUrl('')
      setName('')
      setHeaders([{ key: '', value: '' }])
      setQueryParams([{ key: '', value: '' }])
      setBody('')
      setBodyType('none')
      setAuth({ type: 'none' })
      setPreScript('')
      setPostScript('')
    }
  }, [request])

  const handleSave = () => {
    onSave({
      name: name || 'Untitled',
      method,
      url,
      headers: JSON.stringify(headers.filter(h => h.key || h.value)),
      query_params: JSON.stringify(queryParams.filter(p => p.key || p.value)),
      body,
      body_type: bodyType,
      auth: JSON.stringify(auth),
      pre_request_script: preScript,
      post_response_script: postScript,
    })
  }

  const handleSend = () => {
    onExecute({
      method,
      url,
      headers: JSON.stringify(headers.filter(h => h.key || h.value)),
      query_params: JSON.stringify(queryParams.filter(p => p.key || p.value)),
      body,
      body_type: bodyType,
      auth: JSON.stringify(auth),
      pre_request_script: preScript,
      post_response_script: postScript,
    })
  }

  return (
    <div className="request-panel">
      <div className="url-bar">
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          placeholder="Enter request URL or paste a curl command"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button className="send" onClick={handleSend} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
        <button className="save" onClick={handleSave}>Save</button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}

      <div className="request-tabs">
        {TABS.map(tab => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Params' && (
        <KVEditor items={queryParams} onChange={setQueryParams} keyPlaceholder="Key" valuePlaceholder="Value" />
      )}
      {activeTab === 'Headers' && (
        <KVEditor items={headers} onChange={setHeaders} keyPlaceholder="Header name" valuePlaceholder="Header value" />
      )}
      {activeTab === 'Body' && <BodyEditor type={bodyType} onChangeType={setBodyType} body={body} onChangeBody={setBody} />}
      {activeTab === 'Auth' && <AuthEditor auth={auth} onChange={setAuth} />}
      {activeTab === 'Scripts' && (
        <ScriptEditor preScript={preScript} postScript={postScript} onChangePre={setPreScript} onChangePost={setPostScript} />
      )}
    </div>
  )
}

function KVEditor({ items, onChange, keyPlaceholder, valuePlaceholder }) {
  const handleChange = (idx, field, val) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: val }
    onChange(updated)
  }

  const addRow = () => onChange([...items, { key: '', value: '' }])
  const removeRow = (idx) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div className="kv-editor">
      <table>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ width: '40%' }}>
                <input
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(e) => handleChange(idx, 'key', e.target.value)}
                />
              </td>
              <td style={{ width: '50%' }}>
                <input
                  placeholder={valuePlaceholder}
                  value={item.value}
                  onChange={(e) => handleChange(idx, 'value', e.target.value)}
                />
              </td>
              <td style={{ width: '10%' }}>
                <button className="delete-btn" onClick={() => removeRow(idx)}>&times;</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-btn" onClick={addRow}>+ Add</button>
    </div>
  )
}

function BodyEditor({ type, onChangeType, body, onChangeBody }) {
  const [formData, setFormData] = useState([{ key: '', value: '' }])
  const [urlEncoded, setUrlEncoded] = useState([{ key: '', value: '' }])

  useEffect(() => {
    if (type === 'x-www-form-urlencoded') {
      try {
        const pairs = body.split('&').filter(Boolean).map(p => {
          const [k, ...v] = p.split('=')
          return { key: decodeURIComponent(k), value: decodeURIComponent(v.join('=')) }
        })
        setUrlEncoded(pairs.length ? pairs : [{ key: '', value: '' }])
      } catch {
        setUrlEncoded([{ key: '', value: '' }])
      }
    }
  }, [type])

  const handleUrlEncodedChange = (items) => {
    setUrlEncoded(items)
    onChangeBody(items.filter(i => i.key).map(i =>
      `${encodeURIComponent(i.key)}=${encodeURIComponent(i.value)}`
    ).join('&'))
  }

  return (
    <div className="body-editor">
      <select value={type} onChange={(e) => onChangeType(e.target.value)}>
        {BODY_TYPES.map(t => (
          <option key={t} value={t}>{t === 'x-www-form-urlencoded' ? 'x-www-form-urlencoded' : t}</option>
        ))}
      </select>
      {type === 'none' && <div className="editor-empty">No body</div>}
      {type === 'x-www-form-urlencoded' && (
        <KVEditor items={urlEncoded} onChange={handleUrlEncodedChange} keyPlaceholder="Key" valuePlaceholder="Value" />
      )}
      {type === 'form-data' && (
        <KVEditor items={formData} onChange={setFormData} keyPlaceholder="Key" valuePlaceholder="Value" />
      )}
      {(type === 'json' || type === 'xml' || type === 'raw' || type === 'graphql') && (
        <textarea
          placeholder={type === 'json' ? '{\n  "key": "value"\n}' : type === 'graphql' ? 'query {\n  field\n}' : 'Enter body...'}
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
        />
      )}
    </div>
  )
}

function AuthEditor({ auth, onChange }) {
  const handleField = (field, value) => {
    onChange({ ...auth, [field]: value })
  }

  const handleTypeChange = (type) => {
    const defaults = {
      none: { type: 'none' },
      bearer: { type: 'bearer', token: '' },
      basic: { type: 'basic', username: '', password: '' },
      api_key: { type: 'api_key', key: '', value: '', placement: 'header' },
      digest: { type: 'digest', username: '', password: '' },
      oauth2: { type: 'oauth2', grant_type: 'client_credentials', token_url: '', client_id: '', client_secret: '', scope: '' },
    }
    onChange(defaults[type] || { type })
  }

  return (
    <div className="auth-editor">
      <select value={auth.type || 'none'} onChange={(e) => handleTypeChange(e.target.value)}>
        {AUTH_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
      </select>

      <div className="auth-fields">
        {auth.type === 'bearer' && (
          <label>
            Token
            <input value={auth.token || ''} onChange={(e) => handleField('token', e.target.value)} placeholder="eyJhb..." />
          </label>
        )}
        {(auth.type === 'basic' || auth.type === 'digest') && (
          <>
            <label>
              Username
              <input value={auth.username || ''} onChange={(e) => handleField('username', e.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={auth.password || ''} onChange={(e) => handleField('password', e.target.value)} />
            </label>
          </>
        )}
        {auth.type === 'api_key' && (
          <>
            <label>
              Key
              <input value={auth.key || ''} onChange={(e) => handleField('key', e.target.value)} placeholder="X-API-Key" />
            </label>
            <label>
              Value
              <input value={auth.value || ''} onChange={(e) => handleField('value', e.target.value)} />
            </label>
            <label>
              Add to
              <select value={auth.placement || 'header'} onChange={(e) => handleField('placement', e.target.value)}>
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </label>
          </>
        )}
        {auth.type === 'oauth2' && (
          <>
            <label>
              Grant Type
              <select value={auth.grant_type || 'client_credentials'} onChange={(e) => handleField('grant_type', e.target.value)}>
                <option value="client_credentials">Client Credentials</option>
                <option value="password">Password</option>
                <option value="authorization_code">Authorization Code</option>
              </select>
            </label>
            <label>
              Token URL
              <input value={auth.token_url || ''} onChange={(e) => handleField('token_url', e.target.value)} />
            </label>
            <label>
              Client ID
              <input value={auth.client_id || ''} onChange={(e) => handleField('client_id', e.target.value)} />
            </label>
            <label>
              Client Secret
              <input type="password" value={auth.client_secret || ''} onChange={(e) => handleField('client_secret', e.target.value)} />
            </label>
            <label>
              Scope
              <input value={auth.scope || ''} onChange={(e) => handleField('scope', e.target.value)} />
            </label>
          </>
        )}
      </div>
    </div>
  )
}

function ScriptEditor({ preScript, postScript, onChangePre, onChangePost }) {
  return (
    <div className="script-editor">
      <label>Pre-request Script</label>
      <textarea
        placeholder="# Runs before the request is sent\nextract_var('key', 'value')"
        value={preScript}
        onChange={(e) => onChangePre(e.target.value)}
        spellCheck={false}
      />

      <label>Post-response Script</label>
      <textarea
        placeholder="# Runs after the response is received\ndata = response.json()\nextract_var('token', data.get('token'))"
        value={postScript}
        onChange={(e) => onChangePost(e.target.value)}
        spellCheck={false}
      />

      <div className="script-help">
        Available: response, request, extract_var(key, value), env(key, default), log(...){'\n'}
        response has .json(), .text, .status_code, .headers
      </div>
    </div>
  )
}
