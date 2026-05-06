import React, { useState, useEffect } from 'react'

export default function EnvironmentEditor({ env, onClose, onSave }) {
  const [name, setName] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [vars, setVars] = useState([])

  useEffect(() => {
    if (env) {
      setName(env.name)
      setIsGlobal(!!env.is_global)
      try {
        const parsed = JSON.parse(env.variables)
        setVars(Object.entries(parsed).map(([k, v]) => ({ key: k, value: v || '' })))
      } catch {
        setVars([])
      }
    } else {
      setName('')
      setIsGlobal(false)
      setVars([{ key: '', value: '' }])
    }
  }, [env])

  const handleChange = (idx, field, val) => {
    const updated = [...vars]
    updated[idx] = { ...updated[idx], [field]: val }
    setVars(updated)
  }

  const addVar = () => setVars([...vars, { key: '', value: '' }])
  const removeVar = (idx) => setVars(vars.filter((_, i) => i !== idx))

  const handleSave = () => {
    const variables = {}
    vars.forEach(v => {
      if (v.key.trim()) {
        variables[v.key.trim()] = v.value
      }
    })
    onSave({
      name: name || 'New Environment',
      variables: JSON.stringify(variables),
      is_global: isGlobal ? 1 : 0,
    }, env?.id)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal env-editor-modal">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3>{env ? 'Edit Environment' : 'New Environment'}</h3>

        <div className="env-meta">
          <input
            placeholder="Environment name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <label>
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
            />
            Global
          </label>
        </div>

        <table className="env-vars-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Variable</th>
              <th style={{ width: '50%' }}>Value</th>
              <th style={{ width: '10%' }}></th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v, i) => (
              <tr key={i}>
                <td>
                  <input
                    placeholder="key"
                    value={v.key}
                    onChange={(e) => handleChange(i, 'key', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    placeholder="value"
                    value={v.value}
                    onChange={(e) => handleChange(i, 'value', e.target.value)}
                  />
                </td>
                <td>
                  <button className="delete-btn" onClick={() => removeVar(i)}>&times;</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="add-var-btn" onClick={addVar}>+ Add Variable</button>

        <div className="actions">
          <button className="cancel" onClick={onClose}>Cancel</button>
          <button className="confirm" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
