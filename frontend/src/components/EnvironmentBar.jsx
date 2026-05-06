import React from 'react'

export default function EnvironmentBar({ environments, activeEnvId, onSelectEnv, onManage }) {
  return (
    <div className="env-bar">
      <label>Environment:</label>
      <select
        value={activeEnvId || ''}
        onChange={(e) => onSelectEnv(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">None</option>
        {environments.map(env => (
          <option key={env.id} value={env.id}>
            {env.name}{env.is_global ? ' (global)' : ''}
          </option>
        ))}
      </select>
      <button onClick={() => onManage(null)}>+ New</button>
      {activeEnvId && (
        <button onClick={() => {
          const env = environments.find(e => e.id === activeEnvId)
          if (env) onManage(env)
        }}>
          Edit
        </button>
      )}
      <span className="spacer" />
      <span className="env-count">{environments.length} environment{environments.length !== 1 ? 's' : ''}</span>
    </div>
  )
}
