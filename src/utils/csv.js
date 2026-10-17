export function serializeCsv(rows) {
  const escapeCell = (value) => {
    const text = value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
      : String(value ?? '')
    return `"${text.replaceAll('"', '""')}"`
  }

  return `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([serializeCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
