import React, { useState, useMemo } from 'react'

export default function CsvViewer({ body }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const { headers, rows } = useMemo(() => {
    const lines = body.trim().split('\n')
    if (lines.length === 0) return { headers: [], rows: [] }

    // Simple CSV parse (handles quoted fields)
    const parseLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = false
            }
          } else {
            current += ch
          }
        } else if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current)
          current = ''
        } else {
          current += ch
        }
      }
      result.push(current)
      return result
    }

    const parsed = lines.map(parseLine)
    const headers = parsed[0]
    const rows = parsed.slice(1)
    return { headers, rows }
  }, [body])

  const sortedRows = useMemo(() => {
    if (sortCol === null) return rows
    return [...rows].sort((a, b) => {
      const aVal = (a[sortCol] || '').toLowerCase()
      const bVal = (b[sortCol] || '').toLowerCase()
      const aNum = parseFloat(aVal)
      const bNum = parseFloat(bVal)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum
      }
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }, [rows, sortCol, sortDir])

  const toggleSort = (idx) => {
    if (sortCol === idx) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(idx)
      setSortDir('asc')
    }
  }

  if (headers.length === 0) return <RawViewer body={body} />

  return (
    <div className="csv-viewer">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} onClick={() => toggleSort(i)}>
                {h} {sortCol === i ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
