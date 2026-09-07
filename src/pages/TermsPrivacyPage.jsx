import React from 'react'
import { IconArrowLeft, IconDatabase, IconFileText, IconShieldCheck } from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/ui/BrandLogo.jsx'
import { ROUTES } from '../constants.js'

function LegalSection({ id, title, icon: Icon, children }) {
  return <section className="legal-section" id={id}>
    <div className="legal-section-title"><span><Icon size={19}/></span><h2>{title}</h2></div>
    <div className="legal-section-copy">{children}</div>
  </section>
}

export default function TermsPrivacyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(ROUTES.dashboard)
  }

  React.useEffect(() => {
    const target = location.hash?.replace('#', '')
    if (!target) return
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }))
  }, [location.hash])

  return <main className="legal-page">
    <header className="legal-topbar">
      <BrandLogo />
      <button type="button" className="ghost-btn legal-back" onClick={goBack}><IconArrowLeft size={17}/> Voltar</button>
    </header>

    <article className="legal-document">
      <div className="legal-hero">
        <span className="eyebrow">Transparência</span>
        <h1>Termos de uso e Política de Privacidade</h1>
        <p>Este documento explica, em linguagem direta, como o UaiConta funciona, quais dados são necessários para prestar o serviço e quais controles permanecem com você.</p>
        <small>Versão: 07 de setembro de 2026</small>
      </div>

      <nav className="legal-index" aria-label="Índice do documento">
        <a href="#termos">Termos de uso</a>
        <a href="#privacidade">Política de Privacidade</a>
        <a href="#direitos">Seus controles</a>
      </nav>

      <LegalSection id="termos" title="Termos de uso" icon={IconFileText}>
        <p>O UaiConta é uma ferramenta de organização financeira pessoal. Os números, projeções, categorias sugeridas, OCR e análises ajudam a organizar informações fornecidas ou importadas por você; eles não substituem conferência dos lançamentos nem aconselhamento financeiro, contábil ou jurídico.</p>
        <p>Movimentações recorrentes futuras permanecem como previstas até serem confirmadas como realizadas. Ao importar PDF, imagem ou CSV, o sistema pode sugerir descrição, forma de pagamento e categoria; informações de baixa confiança devem ser revisadas antes da importação.</p>
        <p>Você é responsável por manter suas credenciais protegidas e por revisar os dados cadastrados. O serviço pode receber melhorias e mudanças de interface, mantendo como prioridade a integridade dos dados financeiros e a possibilidade de exportação.</p>
      </LegalSection>

      <LegalSection id="privacidade" title="Política de Privacidade" icon={IconShieldCheck}>
        <p>O UaiConta processa dados necessários à conta e à organização financeira, como nome de exibição, e-mail de autenticação, contas, cartões sem dados completos de cartão, movimentações, categorias, metas, recorrências e documentos enviados por você.</p>
        <p>Quando o Supabase está configurado, autenticação, PostgreSQL e Storage são usados para persistir dados. As tabelas e arquivos privados são associados ao usuário autenticado e protegidos por regras de acesso. Chaves administrativas não são enviadas ao navegador.</p>
        <p>Rascunhos de importação e backups antigos podem permanecer localmente no navegador para evitar perda acidental de trabalho. A sincronização de dados antigos para sua conta não apaga automaticamente esse backup local.</p>
      </LegalSection>

      <LegalSection id="direitos" title="Seus controles sobre os dados" icon={IconDatabase}>
        <p>Na área Dados e backup você pode exportar uma cópia dos dados que sua própria sessão consegue ler. Também é possível solicitar a exclusão definitiva da conta, o que aciona o fluxo autenticado de remoção dos dados e documentos associados.</p>
        <p>Os formatos de exportação existem para finalidades diferentes: JSON preserva a estrutura técnica do backup; Excel facilita análise em planilhas; PDF cria um relatório legível para arquivo e consulta.</p>
      </LegalSection>

      <div className="legal-final-actions">
        <button type="button" className="primary-btn" onClick={goBack}><IconArrowLeft size={17}/> Voltar ao UaiConta</button>
      </div>
    </article>
  </main>
}
