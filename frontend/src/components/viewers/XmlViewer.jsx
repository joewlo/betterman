import React, { useMemo } from 'react'

export default function XmlViewer({ body }) {
  const prettyXml = useMemo(() => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(body, 'text/xml')
      const errorNode = doc.querySelector('parsererror')
      if (errorNode) return body

      const serializer = new XMLSerializer()
      const raw = serializer.serializeToString(doc)

      // Simple syntax highlighting for XML
      let formatted = raw
        .replace(/</g, '\n<')
        .replace(/>/g, '>\n')
        .split('\n')
        .filter(line => line.trim())
        .join('\n')

      let indent = 0
      const lines = formatted.split('\n').map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1)
        const padded = '  '.repeat(indent) + trimmed
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>')) {
          indent++
        }
        return padded
      })

      return lines.join('\n')
    } catch {
      return body
    }
  }, [body])

  return (
    <div className="xml-viewer">
      <code
        dangerouslySetInnerHTML={{ __html: highlightXml(prettyXml) }}
      />
    </div>
  )
}

function highlightXml(xml) {
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="xml-tag">$2</span>')
    .replace(/(\s)([\w:-]+)=/g, '$1<span class="xml-attr">$2</span>=')
    .replace(/"([^"]*)"/g, '<span class="xml-value">"$1"</span>')
}
