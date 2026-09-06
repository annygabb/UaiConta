import React from 'react'
import SimpleCrudPage from './SimpleCrudPage.jsx'

const fields = [
  { key: 'name', label: 'Nome', required: true, placeholder: 'Ex.: Alimentação' },
  { key: 'type', label: 'Tipo', type: 'select', required: true, defaultValue: 'despesa', options: [
    { value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }, { value: 'investimento', label: 'Investimento' },
  ] },
  { key: 'color', label: 'Cor', placeholder: '#7B337E' },
  { key: 'icon', label: 'Ícone', placeholder: 'Opcional' },
]

export default function CategoriesPage() {
  return <SimpleCrudPage title="Categorias" eyebrow="Organização" description="Crie categorias próprias. Lançamentos antigos continuam válidos mesmo quando uma categoria deixa de ser usada." table="categories" fields={fields} itemSubtitle={(row) => `${row.type || 'despesa'}${row.color ? ` · ${row.color}` : ''}`} />
}
