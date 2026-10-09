import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DuplicateDecisionCard } from '../../src/components/PdfImportModal.jsx'

describe('decisão visual de duplicidade', () => {
  it('apresenta as quatro decisões com contexto da movimentação encontrada', () => {
    const markup = renderToStaticMarkup(
      <DuplicateDecisionCard
        row={{ id: 'new-1', description: 'Supermercado Central', amount: 125.9 }}
        candidate={{
          candidateId: 'old-1',
          score: 0.95,
          candidate: { id: 'old-1', description: 'Supermercado Central', amount: 125.9, date: '2026-08-15' },
        }}
        onDecision={vi.fn()}
      />,
    )

    expect(markup).toContain('Manter as duas')
    expect(markup).toContain('Ignorar a nova')
    expect(markup).toContain('Substituir a anterior')
    expect(markup).toContain('Corrigir informações')
    expect(markup).toContain('Supermercado Central')
  })
})
