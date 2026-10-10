// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks=vi.hoisted(()=>({getLink:vi.fn(),createPairingCode:vi.fn(),disconnect:vi.fn()}))
vi.mock('../../src/features/whatsapp/whatsapp.repository',()=>({whatsappRepository:mocks}))
vi.mock('../../src/infrastructure/supabase/client',()=>({isSupabaseConfigured:true}))
import WhatsAppPage from '../../src/pages/settings/WhatsAppPage'

describe('configuração do WhatsApp',()=>{
  afterEach(()=>{cleanup();vi.clearAllMocks()})
  it('gera código temporário e explica o fluxo 1/2/3',async()=>{
    mocks.getLink.mockResolvedValue(null);mocks.createPairingCode.mockResolvedValue({code:'12345678',expiresAt:'2026-10-10T12:10:00Z'})
    render(<WhatsAppPage/>);await waitFor(()=>expect(screen.getByText('Nenhum WhatsApp vinculado')).toBeTruthy())
    fireEvent.click(screen.getByRole('button',{name:/gerar código/i}));expect(await screen.findByText('12345678')).toBeTruthy();expect(screen.getByText(/para confirmar/)).toBeTruthy()
  })
})
