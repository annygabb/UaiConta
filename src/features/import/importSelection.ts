import { applyDuplicateDecision } from './duplicateDetection'
import { isImportRowReady } from './importConfirmation'

export type ImportSelectionRow = Record<string, unknown> & {
  id?: string
  __selected?: boolean
  __ignored?: boolean
  __possibleDuplicate?: boolean
  __reviewConfirmed?: boolean
  __duplicateCandidates?: Array<{ candidate?: Record<string, unknown> }>
}

function canSelect(row: ImportSelectionRow): boolean {
  if (row.__ignored) return false
  return isImportRowReady({
    ...row,
    __reviewConfirmed: true,
  })
}

export function setImportRowSelected(
  row: ImportSelectionRow,
  checked: boolean,
): ImportSelectionRow {
  if (!checked) return { ...row, __selected: false }
  if (row.__ignored) return row
  if (!canSelect(row)) return { ...row, __selected: false }

  if (row.__possibleDuplicate) {
    const candidate = row.__duplicateCandidates?.[0]?.candidate
    const result = applyDuplicateDecision({
      decision: 'keep_both',
      draft: row,
      candidate,
    })

    return {
      ...row,
      ...result.draft,
      __possibleDuplicate: false,
      __selected: true,
      __reviewConfirmed: true,
      __duplicateDecisionLabel: 'manter as duas',
    }
  }

  return {
    ...row,
    __selected: true,
    __reviewConfirmed: true,
  }
}

export function selectAllImportRows(rows: ImportSelectionRow[]): ImportSelectionRow[] {
  return rows.map((row) => {
    if (row.__possibleDuplicate || row.__ignored) {
      return { ...row, __selected: false }
    }
    return setImportRowSelected(row, true)
  })
}

export function includePossibleDuplicates(rows: ImportSelectionRow[]): ImportSelectionRow[] {
  return rows.map((row) => (
    row.__possibleDuplicate && !row.__ignored ? setImportRowSelected(row, true) : row
  ))
}

export function getSelectedImportRows(rows: ImportSelectionRow[]): ImportSelectionRow[] {
  return rows.filter((row) => (
    row.__selected
    && !row.__possibleDuplicate
    && isImportRowReady(row)
  ))
}

export function clearImportRowSelection(rows: ImportSelectionRow[]): ImportSelectionRow[] {
  return rows.map((row) => ({ ...row, __selected: false }))
}
