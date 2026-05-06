import React, { useState, useEffect, useCallback } from 'react'
import api from './api'
import EnvironmentBar from './components/EnvironmentBar'
import EnvironmentEditor from './components/EnvironmentEditor'
import Sidebar from './components/Sidebar'
import RequestPanel from './components/RequestPanel'
import ResponsePanel from './components/ResponsePanel'
import ImportDialog from './components/ImportDialog'

const THEME_KEY = 'betterman-theme'

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY) } catch { return null }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ }
}

export default function App() {
  const [theme, setTheme] = useState(() => getStoredTheme() || getSystemTheme())
  const [collections, setCollections] = useState([])
  const [environments, setEnvironments] = useState([])
  const [activeEnvId, setActiveEnvId] = useState(null)
  const [activeRequest, setActiveRequest] = useState(null)
  const [activeCollectionId, setActiveCollectionId] = useState(null)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showEnvEditor, setShowEnvEditor] = useState(false)
  const [editingEnv, setEditingEnv] = useState(null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const loadData = useCallback(async () => {
    try {
      const [cols, envs] = await Promise.all([
        api.getCollections(),
        api.getEnvironments(),
      ])
      setCollections(cols)
      setEnvironments(envs)
      const global = envs.find(e => e.is_global)
      if (global && !activeEnvId) {
        setActiveEnvId(global.id)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    }
  }, [activeEnvId])

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveRequest = async (reqData) => {
    try {
      if (activeRequest?.id) {
        await api.updateRequest(activeRequest.id, reqData)
      } else if (activeCollectionId) {
        const created = await api.createRequest({
          ...reqData,
          collection_id: activeCollectionId,
          sort_order: 0,
        })
        setActiveRequest(created)
      }
      await loadData()
    } catch (e) {
      setError('Save failed: ' + e.message)
    }
  }

  const handleExecute = async (reqData) => {
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await api.execute({
        ...reqData,
        environment_id: activeEnvId,
        collection_id: activeCollectionId,
      })
      setResponse(res)
      if (Object.keys(res.extracted_vars).length > 0) {
        await loadData()
      }
    } catch (e) {
      setError(e.message)
      setResponse(null)
    }
    setLoading(false)
  }

  const handleImportComplete = () => {
    setShowImport(false)
    loadData()
  }

  const handleEnvSave = async (envData, id) => {
    if (id) {
      await api.updateEnvironment(id, envData)
    } else {
      await api.createEnvironment(envData)
    }
    setShowEnvEditor(false)
    setEditingEnv(null)
    await loadData()
  }

  return (
    <div className="app">
      <EnvironmentBar
        environments={environments}
        activeEnvId={activeEnvId}
        onSelectEnv={setActiveEnvId}
        onManage={(env) => { setEditingEnv(env); setShowEnvEditor(true) }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="app-body">
        <Sidebar
          collections={collections}
          activeRequestId={activeRequest?.id}
          activeCollectionId={activeCollectionId}
          onSelectRequest={async (req) => {
            setActiveRequest(req)
            setActiveCollectionId(req.collection_id)
            setResponse(null)
            setError(null)
          }}
          onSelectCollection={(colId) => {
            setActiveCollectionId(colId)
            setActiveRequest(null)
            setResponse(null)
            setError(null)
          }}
          onCreateCollection={async (name) => {
            await api.createCollection({ name, description: '' })
            await loadData()
          }}
          onCreateRequest={async (colId) => {
            const req = await api.createRequest({
              collection_id: colId,
              name: 'New Request',
              method: 'GET',
              url: '',
              headers: '[]',
              query_params: '[]',
            })
            setActiveRequest(req)
            setActiveCollectionId(colId)
            await loadData()
          }}
          onDeleteCollection={async (id) => {
            await api.deleteCollection(id)
            if (activeCollectionId === id) {
              setActiveCollectionId(null)
              setActiveRequest(null)
            }
            await loadData()
          }}
          onDeleteRequest={async (id) => {
            await api.deleteRequest(id)
            if (activeRequest?.id === id) setActiveRequest(null)
            await loadData()
          }}
          onImport={() => setShowImport(true)}
          onRefresh={loadData}
        />
        <div className="main-area">
          <RequestPanel
            request={activeRequest}
            onExecute={handleExecute}
            onSave={handleSaveRequest}
            loading={loading}
            error={error}
          />
          <ResponsePanel response={response} />
        </div>
      </div>
      {showImport && (
        <ImportDialog
          collections={collections}
          onClose={() => setShowImport(false)}
          onComplete={handleImportComplete}
        />
      )}
      {showEnvEditor && (
        <EnvironmentEditor
          env={editingEnv}
          onClose={() => { setShowEnvEditor(false); setEditingEnv(null) }}
          onSave={handleEnvSave}
        />
      )}
    </div>
  )
}
