import { describe, expect, it } from 'vitest'
import {
  clearImportRowSelection,
  getSelectedImportRows,
  includePossibleDuplicates,
  selectAllImportRows,
  setImportRowSelected,
} from '../../src/features/import/importSelection'

const validRow = {
  id: 'row-1',
  type: 'despesa',
  amount: 100,
  amountCents: 10000,
  description: 'Supermercado Central',
  date: '2026-10-01',
  requiresReview: false,
  __selected: false,
}

const duplicateRow = {
  ...validRow,
  id: 'row-2',
  description: 'Pix enviado',
  __possibleDuplicate: true,
  __duplicateCandidates: [{
    candidateId: 'existing-1',
    scope: 'existing',
    score: 0.95,
    reasons: ['date', 'amount'],
    candidate: { ...validRow, id: 'existing-1' },
  }],
}

describe('seleção de movimentações importadas', () => {
  it('seleciona individualmente um possível duplicado como manter as duas', () => {
    const selected = setImportRowSelected(duplicateRow, true)

    expect(selected).toMatchObject({
      __selected: true,
      __possibleDuplicate: false,
      __reviewConfirmed: true,
      __duplicateDecision: 'keep_both',
      __duplicateDecisionLabel: 'manter as duas',
    })
  })

  it('seleciona todos os itens válidos e deixa os possíveis duplicados pendentes', () => {
    const lowConfidence = {
      ...validRow,
      id: 'row-3',
      description: 'Padaria',
      requiresReview: true,
    }
    const invalid = { ...validRow, id: 'row-4', amount: 0, amountCents: 0 }

    const selected = selectAllImportRows([validRow, duplicateRow, lowConfidence, invalid])

    expect(selected[0]).toMatchObject({ __selected: true, __reviewConfirmed: true })
    expect(selected[1]).toMatchObject({ __selected: false, __possibleDuplicate: true })
    expect(selected[2]).toMatchObject({ __selected: true, __reviewConfirmed: true })
    expect(selected[3]).toMatchObject({ __selected: false })
  })

  it('inclui todos os possíveis duplicados válidos sem alterar os demais', () => {
    const alreadySelected = { ...validRow, __selected: true, __reviewConfirmed: true }
    const selected = includePossibleDuplicates([alreadySelected, duplicateRow])

    expect(selected[0]).toEqual(alreadySelected)
    expect(selected[1]).toMatchObject({
      __selected: true,
      __possibleDuplicate: false,
      __duplicateDecision: 'keep_both',
      __duplicateDecisionLabel: 'manter as duas',
    })
  })

  it('nunca reativa um possível duplicado que já foi ignorado', () => {
    const ignored = { ...duplicateRow, __ignored: true, __selected: false }

    expect(setImportRowSelected(ignored, true)).toEqual(ignored)
    expect(includePossibleDuplicates([ignored])).toEqual([ignored])
  })

  it('mantém contador e payload restritos às linhas selecionadas que continuam válidas', () => {
    const ready = { ...validRow, __selected: true, __reviewConfirmed: true }
    const invalidAfterEdit = { ...ready, id: 'row-invalid', description: '' }

    expect(getSelectedImportRows([ready, invalidAfterEdit])).toEqual([ready])
  })

  it('limpa a seleção sem apagar decisões ou campos revisados', () => {
    const selected = {
      ...validRow,
      __selected: true,
      __reviewConfirmed: true,
      __duplicateDecision: 'keep_both',
    }

    expect(clearImportRowSelection([selected])).toEqual([{
      ...selected,
      __selected: false,
    }])
  })
})
