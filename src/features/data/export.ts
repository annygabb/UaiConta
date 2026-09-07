import { getSupabaseClient } from '../../infrastructure/supabase/client'

const tables = [
  'profiles','accounts','credit_cards','income_sources','categories','subcategories','transactions',
  'transaction_items','budgets','goals','recurrence_rules','installment_plans','installments','investments',
  'pdf_imports','pdf_import_items','receipts','receipt_files','receipt_items','user_preferences','migration_state',
] as const

export type ExportPayload = Record<string, unknown> & {
  exportedAt: string
  version: string
}

export async function exportOwnData(): Promise<ExportPayload> {
  const client = getSupabaseClient()
  const payload: ExportPayload = { exportedAt: new Date().toISOString(), version: 'uaiconta-v6' }
  for (const table of tables) {
    const { data, error } = await client.from(table).select('*')
    if (error) payload[table] = { error: error.message }
    else payload[table] = data || []
  }
  return payload
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 250)
}

function datedFilename(extension: string) {
  return `uaiconta-backup-${new Date().toISOString().slice(0, 10)}.${extension}`
}

export function downloadJson(data: unknown, filename = datedFilename('json')) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), filename)
}

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cellValue(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function safeSheetName(value: string, index: number) {
  const clean = value.replace(/[\\/:*?\[\]]/g, '-').slice(0, 28)
  return clean || `Dados ${index + 1}`
}

export function downloadExcel(data: ExportPayload, filename = datedFilename('xls')) {
  const worksheets = Object.entries(data)
    .filter(([, value]) => Array.isArray(value))
    .map(([name, rows], index) => {
      const objects = (rows as unknown[]).filter((row) => row && typeof row === 'object') as Record<string, unknown>[]
      const headers = Array.from(new Set(objects.flatMap((row) => Object.keys(row))))
      const headerRow = headers.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join('')
      const body = objects.map((row) => `<Row>${headers.map((header) => `<Cell><Data ss:Type="String">${xmlEscape(cellValue(row[header]).slice(0, 32700))}</Data></Cell>`).join('')}</Row>`).join('')
      return `<Worksheet ss:Name="${xmlEscape(safeSheetName(name, index))}"><Table><Row>${headerRow}</Row>${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>`
    }).join('')

  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8D7F0" ss:Pattern="Solid"/></Style></Styles>${worksheets}</Workbook>`
  downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }), filename)
}

function formatMoneyFromRow(row: Record<string, unknown>) {
  const cents = Number(row.amount_cents)
  const amount = Number(row.amount)
  const reais = Number.isFinite(cents) && cents !== 0 ? cents / 100 : amount
  if (!Number.isFinite(reais)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais)
}

function formatDate(value: unknown) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR').format(date)
}

export async function downloadPdf(data: ExportPayload, filename = datedFilename('pdf')) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const purple: [number, number, number] = [123, 51, 126]
  let y = 18

  const header = (continuation = false) => {
    doc.setFillColor(14, 9, 20)
    doc.rect(0, 0, pageWidth, 34, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('UaiConta', margin, 15)
    doc.setTextColor(214, 179, 232)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(continuation ? 'Backup pessoal — continuação' : 'Backup pessoal — relatório de dados', margin, 22)
    doc.setTextColor(68, 61, 72)
    y = 44
  }

  const ensure = (height = 10) => {
    if (y + height < pageHeight - 14) return
    doc.addPage()
    header(true)
  }

  header()
  doc.setFontSize(9)
  doc.setTextColor(90, 82, 96)
  doc.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.exportedAt))}`, margin, y)
  y += 9

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...purple)
  doc.text('Resumo', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(68, 61, 72)

  const counts = Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([name, value]) => [name, (value as unknown[]).length] as const)
  counts.forEach(([name, count]) => {
    ensure(6)
    doc.text(`${name}: ${count}`, margin, y)
    y += 5
  })

  const transactions = Array.isArray(data.transactions) ? data.transactions as Record<string, unknown>[] : []
  y += 5
  ensure(14)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...purple)
  doc.text('Movimentações', margin, y)
  y += 8

  if (!transactions.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(90, 82, 96)
    doc.text('Nenhuma movimentação disponível para este backup.', margin, y)
  } else {
    transactions
      .slice()
      .sort((a, b) => String(b.transaction_date || b.date || '').localeCompare(String(a.transaction_date || a.date || '')))
      .forEach((row) => {
        ensure(17)
        const description = String(row.display_description || row.description || 'Movimentação')
        const detail = `${formatDate(row.transaction_date || row.date)}  •  ${String(row.category || 'Não categorizado')}  •  ${String(row.status || 'completed')}`
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(35, 30, 39)
        const descLines = doc.splitTextToSize(description, pageWidth - margin * 2 - 38)
        doc.text(descLines.slice(0, 2), margin, y)
        doc.setTextColor(...purple)
        doc.text(formatMoneyFromRow(row), pageWidth - margin, y, { align: 'right' })
        y += Math.max(5, descLines.slice(0, 2).length * 4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.7)
        doc.setTextColor(105, 96, 111)
        doc.text(doc.splitTextToSize(detail, pageWidth - margin * 2), margin, y)
        y += 7
        doc.setDrawColor(233, 226, 237)
        doc.line(margin, y - 2, pageWidth - margin, y - 2)
      })
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(7.5)
    doc.setTextColor(130, 121, 136)
    doc.text(`Página ${page} de ${pages} · Gerado localmente no navegador`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  doc.save(filename)
}
