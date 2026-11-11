import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDown, ArrowUpRight, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronRight,
  CircleAlert, ClipboardList, Clock3, Headset, LayoutDashboard, Menu, MessageCircle, Plus,
  Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Tag, Trash2,
  UsersRound, X,
} from 'lucide-react'
import { api, type Categoria, type Chamado, type Cliente, type Comentario, type Perfil, type Prioridade, type StatusChamado, type Tecnico } from './api'

type Section = 'inicio' | 'chamados' | 'clientes' | 'categorias' | 'tecnicos'
type Entity = Cliente | Categoria | Tecnico | Chamado
type EntityKind = Exclude<Section, 'inicio' | 'chamados'> | 'chamado'
type DialogState = { kind: EntityKind; record?: Entity } | null

const statusNames: Record<StatusChamado, string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  FECHADO: 'Fechado',
}
const priorityNames: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}
const statusOptions: StatusChamado[] = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'FECHADO']
const priorityOptions: Prioridade[] = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function dateLabel(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

function App() {
  const [section, setSection] = useState<Section>('inicio')
  const [clients, setClients] = useState<Cliente[]>([])
  const [categories, setCategories] = useState<Categoria[]>([])
  const [technicians, setTechnicians] = useState<Tecnico[]>([])
  const [calls, setCalls] = useState<Chamado[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [selectedCall, setSelectedCall] = useState<Chamado | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    setLoadError('')
    try {
      const [nextClients, nextCategories, nextTechnicians, page] = await Promise.all([
        api.clientes.list(), api.categorias.list(), api.tecnicos.list(), api.chamados.list(),
      ])
      setClients(nextClients)
      setCategories(nextCategories)
      setTechnicians(nextTechnicians)
      setCalls(page)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData(true) }, [loadData])

  const activeCalls = calls.filter((call) => call.status !== 'FECHADO')

  const visibleCalls = useMemo(() => calls.filter((call) => {
    const text = query.trim().toLocaleLowerCase('pt-BR')
    const client = clients.find((item) => item.id === call.clienteId)?.nome || ''
    const matchesText = !text || `${call.id} ${call.titulo} ${call.descricao || ''} ${client}`.toLocaleLowerCase('pt-BR').includes(text)
    return matchesText
      && (!statusFilter || call.status === statusFilter)
      && (!priorityFilter || call.prioridade === priorityFilter)
      && (!clientFilter || call.clienteId === Number(clientFilter))
  }), [calls, clients, query, statusFilter, priorityFilter, clientFilter])

  async function runAction(action: () => Promise<unknown>) {
    setSaving(true)
    setActionError('')
    try {
      await action()
      await loadData()
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível concluir a operação.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function openCall(call: Chamado) {
    setActionError('')
    try {
      setSelectedCall(await api.chamados.get(call.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível abrir o chamado.')
      setSelectedCall(call)
    }
  }

  async function refreshSelectedCall(id: number) {
    const [updated, allCalls] = await Promise.all([api.chamados.get(id), api.chamados.list()])
    setSelectedCall(updated)
    setCalls(allCalls)
  }

  async function changeStatus(call: Chamado, status: StatusChamado) {
    const ok = await runAction(() => api.chamados.changeStatus(call.id, status))
    if (ok && selectedCall?.id === call.id) {
      try { await refreshSelectedCall(call.id) } catch { setSelectedCall(null) }
    }
  }

  async function deleteEntity(kind: EntityKind, record: Entity) {
    const label = kind === 'chamado' ? `o chamado #${record.id}` : `“${'nome' in record ? record.nome : ''}”`
    if (!window.confirm(`Tem certeza que deseja excluir ${label}? Esta ação não pode ser desfeita.`)) return
    const remove = kind === 'chamado'
      ? () => api.chamados.remove(record.id)
      : kind === 'clientes'
        ? () => api.clientes.remove(record.id)
        : kind === 'categorias'
          ? () => api.categorias.remove(record.id)
          : () => api.tecnicos.remove(record.id)
    const ok = await runAction(remove)
    if (ok) {
      setDialog(null)
      setSelectedCall(null)
    }
  }

  async function submitEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog) return
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) || '').trim()
    let task: Promise<unknown>
    const id = dialog.record?.id

    switch (dialog.kind) {
      case 'clientes':
        task = api.clientes.save({ nome: value('nome'), email: value('email'), telefone: value('telefone') }, id)
        break
      case 'categorias':
        task = api.categorias.save({ nome: value('nome'), descricao: value('descricao') }, id)
        break
      case 'tecnicos':
        task = api.tecnicos.save({ nome: value('nome'), email: value('email'), perfil: value('perfil') as Perfil }, id)
        break
      case 'chamado':
        task = api.chamados.save({
          titulo: value('titulo'),
          descricao: value('descricao'),
          prioridade: value('prioridade') as Prioridade,
          clienteId: Number(value('clienteId')),
          categoriaId: Number(value('categoriaId')),
          tecnicoId: value('tecnicoId') ? Number(value('tecnicoId')) : null,
        }, id)
        break
    }
    const ok = await runAction(() => task)
    if (ok) {
      setDialog(null)
      if (dialog.kind === 'chamado' && id && selectedCall?.id === id) {
        try { await refreshSelectedCall(id) } catch { setSelectedCall(null) }
      }
    }
  }

  const title: Record<Section, string> = {
    inicio: 'Visão geral',
    chamados: 'Chamados',
    clientes: 'Clientes',
    categorias: 'Categorias',
    tecnicos: 'Técnicos',
  }

  const navItems: { key: Section; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'inicio', label: 'Visão geral', icon: LayoutDashboard },
    { key: 'chamados', label: 'Chamados', icon: ClipboardList },
    { key: 'clientes', label: 'Clientes', icon: UsersRound },
    { key: 'categorias', label: 'Categorias', icon: Tag },
    { key: 'tecnicos', label: 'Técnicos', icon: Headset },
  ]

  function navigate(next: Section) {
    setSection(next)
    setMobileMenu(false)
    setActionError('')
  }

  return (
    <div className="app-shell">
      {mobileMenu && <button className="scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Headset size={21} strokeWidth={2.2} /></div>
          <span>atende<span className="brand-dot">.</span></span>
          <button className="mobile-close icon-button" aria-label="Fechar menu" onClick={() => setMobileMenu(false)}><X size={19} /></button>
        </div>
        <div className="workspace-label">CENTRAL DE SUPORTE</div>
        <nav className="main-nav" aria-label="Navegação principal">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`nav-item ${section === key ? 'active' : ''}`} onClick={() => navigate(key)}>
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {key === 'chamados' && activeCalls.length > 0 && <span className="nav-count">{activeCalls.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-icon"><Sparkles size={16} /></div>
            <strong>Um bom dia começa aqui</strong>
            <p>Seu time está pronto para ajudar.</p>
          </div>
          <div className="profile">
            <div className="profile-avatar">AP</div>
            <div className="profile-copy"><strong>Administradora</strong><span>Equipe de suporte</span></div>
            <Settings2 size={17} className="profile-settings" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Abrir menu" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Atende</span><ChevronRight size={14} /><strong>{title[section]}</strong></div>
          <div className="topbar-actions">
            <span className="today-date">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span>
            <button className="notification-button icon-button" aria-label="Notificações">
              <Bell size={18} /><i aria-hidden="true" />
            </button>
            <div className="topbar-avatar" aria-label="Perfil da administradora">AP</div>
          </div>
        </header>

        <div className="page-container">
          {loadError && <div className="error-banner" role="alert"><CircleAlert size={18} /><span>{loadError}</span><button onClick={() => void loadData(true)}>Tentar novamente</button></div>}
          {actionError && !dialog && !selectedCall && <div className="error-banner" role="alert"><CircleAlert size={18} /><span>{actionError}</span><button aria-label="Fechar aviso" onClick={() => setActionError('')}><X size={17} /></button></div>}
          {loading && !calls.length && !loadError ? <LoadingPanel /> : (
            <>
              {section === 'inicio' && <Dashboard calls={calls} clients={clients} categories={categories} technicians={technicians} onNavigate={navigate} onOpenCall={openCall} />}
              {section === 'chamados' && (
                <CallsPage calls={visibleCalls} allCount={calls.length} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} clientFilter={clientFilter} setClientFilter={setClientFilter} clients={clients} categories={categories} technicians={technicians} onNew={() => { setActionError(''); setDialog({ kind: 'chamado' }) }} onEdit={(call) => { setActionError(''); setDialog({ kind: 'chamado', record: call }) }} onDelete={(call) => void deleteEntity('chamado', call)} onOpen={openCall} onStatus={changeStatus} />
              )}
              {section === 'clientes' && <DirectoryPage kind="clientes" title="Clientes" description="Pessoas que contam com a gente." records={clients} onNew={() => { setActionError(''); setDialog({ kind: 'clientes' }) }} onEdit={(record) => { setActionError(''); setDialog({ kind: 'clientes', record }) }} onDelete={(record) => void deleteEntity('clientes', record)} />}
              {section === 'categorias' && <DirectoryPage kind="categorias" title="Categorias" description="Organize os assuntos que chegam até o suporte." records={categories} onNew={() => { setActionError(''); setDialog({ kind: 'categorias' }) }} onEdit={(record) => { setActionError(''); setDialog({ kind: 'categorias', record }) }} onDelete={(record) => void deleteEntity('categorias', record)} />}
              {section === 'tecnicos' && <DirectoryPage kind="tecnicos" title="Técnicos" description="Conheça as pessoas por trás de cada solução." records={technicians} onNew={() => { setActionError(''); setDialog({ kind: 'tecnicos' }) }} onEdit={(record) => { setActionError(''); setDialog({ kind: 'tecnicos', record }) }} onDelete={(record) => void deleteEntity('tecnicos', record)} />}
            </>
          )}
        </div>
      </main>

      {dialog && <EntityDialog state={dialog} clients={clients} categories={categories} technicians={technicians} saving={saving} error={actionError} onClose={() => { setDialog(null); setActionError('') }} onSubmit={submitEntity} />}
      {selectedCall && <CallDetails call={selectedCall} clients={clients} categories={categories} technicians={technicians} error={actionError} saving={saving} onClose={() => { setSelectedCall(null); setActionError('') }} onEdit={() => { const current = selectedCall; setSelectedCall(null); setDialog({ kind: 'chamado', record: current }) }} onDelete={() => void deleteEntity('chamado', selectedCall)} onStatus={(status) => void changeStatus(selectedCall, status)} onAssign={(technicianId) => void runAction(async () => { await api.chamados.assign(selectedCall.id, technicianId); await refreshSelectedCall(selectedCall.id) })} onComment={async (text, author) => { const ok = await runAction(async () => { await api.chamados.comment(selectedCall.id, text, author); await refreshSelectedCall(selectedCall.id) }); return ok }} />}
    </div>
  )
}

function LoadingPanel() {
  return <div className="loading-panel" role="status"><span className="spinner" />Conectando à central de suporte…</div>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Dashboard({ calls, clients, categories, technicians, onNavigate, onOpenCall }: {
  calls: Chamado[]; clients: Cliente[]; categories: Categoria[]; technicians: Tecnico[]
  onNavigate: (section: Section) => void; onOpenCall: (call: Chamado) => void
}) {
  const active = calls.filter((call) => call.status !== 'FECHADO').length
  const urgent = calls.filter((call) => call.prioridade === 'CRITICA' && call.status !== 'FECHADO').length
  const waiting = calls.filter((call) => call.status === 'AGUARDANDO_CLIENTE').length
  const newest = [...calls].sort((a, b) => b.id - a.id).slice(0, 5)
  const statusStats = statusOptions.map((status) => ({ status, count: calls.filter((call) => call.status === status).length }))
  const maxStatus = Math.max(...statusStats.map((item) => item.count), 1)

  return (
    <>
      <PageHeading eyebrow={`${new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date()).toUpperCase()}, SUA CENTRAL EM FOCO`} title="Olá, equipe! 👋" description="Aqui está um resumo do que está acontecendo hoje." action={<button className="button button-primary" onClick={() => onNavigate('chamados')}><Plus size={17} />Novo chamado</button>} />
      <div className="welcome-strip">
        <div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14} /> TUDO EM UM SÓ LUGAR</span><h2>Pequenos cuidados fazem<br />uma grande diferença.</h2><p>Acompanhe cada conversa e transforme dúvidas em boas experiências.</p><button className="text-link" onClick={() => onNavigate('chamados')}>Ver todos os chamados <ArrowUpRight size={16} /></button></div>
        <div className="welcome-art" aria-hidden="true"><div className="art-sun" /><div className="art-blob" /><div className="art-card art-card-main"><div className="art-card-top"><span className="art-dot" /><span className="art-line" /></div><div className="art-line wide" /><div className="art-card-bottom"><span className="art-avatar">A</span><span className="art-line short" /><span className="art-check"><Check size={12} /></span></div></div><div className="art-card art-card-note"><MessageCircle size={15} /><span>resolvido com carinho</span></div><div className="art-sparkle sparkle-one">✦</div><div className="art-sparkle sparkle-two">✦</div></div>
      </div>

      <div className="stats-grid">
        <StatCard label="Chamados em aberto" value={active} note="precisam de atenção" icon={<ClipboardList size={19} />} tone="pink" onClick={() => onNavigate('chamados')} />
        <StatCard label="Aguardando retorno" value={waiting} note="com o cliente" icon={<Clock3 size={19} />} tone="lavender" onClick={() => onNavigate('chamados')} />
        <StatCard label="Prioridade crítica" value={urgent} note={urgent ? 'merecem atenção agora' : 'tudo sob controle'} icon={<Activity size={19} />} tone="peach" onClick={() => onNavigate('chamados')} />
        <StatCard label="Pessoas atendidas" value={clients.length} note={`${technicians.length} pessoas no time`} icon={<UsersRound size={19} />} tone="mint" onClick={() => onNavigate('clientes')} />
      </div>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-header"><div><h2>Chamados recentes</h2><p>As últimas conversas da sua equipe</p></div><button className="subtle-link" onClick={() => onNavigate('chamados')}>Ver todos <ChevronRight size={16} /></button></div>
          {newest.length ? <div className="recent-list">{newest.map((call) => {
            const client = clients.find((item) => item.id === call.clienteId)
            const category = categories.find((item) => item.id === call.categoriaId)
            return <button className="recent-row" key={call.id} onClick={() => onOpenCall(call)}>
              <div className={`recent-symbol priority-${call.prioridade.toLowerCase()}`}><MessageCircle size={17} /></div>
              <div className="recent-main"><strong>{call.titulo}</strong><span>#{call.id} · {client?.nome || 'Cliente'}{category ? ` · ${category.nome}` : ''}</span></div>
              <StatusBadge status={call.status} /><ChevronRight size={16} className="row-chevron" />
            </button>
          })}</div> : <EmptyState title="Nenhum chamado por aqui" text="Quando um chamado for criado, ele aparecerá nesta lista." />}
        </section>

        <section className="panel overview-panel">
          <div className="panel-header"><div><h2>Visão do atendimento</h2><p>Distribuição atual dos chamados</p></div><div className="chart-icon"><SlidersHorizontal size={17} /></div></div>
          <div className="chart-total"><strong>{calls.length}</strong><span>chamados no total</span></div>
          <div className="bar-list">{statusStats.map(({ status, count }) => <div className="bar-item" key={status}><div className="bar-label"><span>{statusNames[status]}</span><strong>{count}</strong></div><div className="bar-track"><span className={`bar-fill bar-${status.toLowerCase()}`} style={{ width: `${Math.max(count ? (count / maxStatus) * 100 : 0, count ? 8 : 0)}%` }} /></div></div>)}</div>
          <div className="overview-footer"><div className="mini-avatars">{technicians.slice(0, 3).map((person) => <span key={person.id} title={person.nome}>{initials(person.nome)}</span>)}</div><span>{technicians.length ? `${technicians.length} técnicos disponíveis` : 'Nenhum técnico cadastrado'}</span><button className="arrow-round" onClick={() => onNavigate('tecnicos')} aria-label="Ver técnicos"><ArrowUpRight size={16} /></button></div>
        </section>
      </div>

      <div className="quick-links">
        <div><span className="eyebrow">ATALHOS DA CENTRAL</span><h2>O que você precisa fazer?</h2></div>
        <QuickLink icon={<UsersRound size={18} />} title="Cadastrar cliente" text="Adicionar uma pessoa" onClick={() => onNavigate('clientes')} />
        <QuickLink icon={<Tag size={18} />} title="Organizar categorias" text={`${categories.length} categorias cadastradas`} onClick={() => onNavigate('categorias')} />
        <QuickLink icon={<ShieldCheck size={18} />} title="Conhecer a equipe" text={`${technicians.length} técnicos cadastrados`} onClick={() => onNavigate('tecnicos')} />
      </div>
    </>
  )
}

function StatCard({ label, value, note, icon, tone, onClick }: { label: string; value: number; note: string; icon: ReactNode; tone: string; onClick: () => void }) {
  return <button className="stat-card" onClick={onClick}><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}<ArrowUpRight size={13} /></span></button>
}

function QuickLink({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return <button className="quick-link" onClick={onClick}><span className="quick-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={17} /></button>
}

function CallsPage({ calls, allCount, query, setQuery, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, clientFilter, setClientFilter, clients, categories, technicians, onNew, onEdit, onDelete, onOpen, onStatus }: {
  calls: Chamado[]; allCount: number; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; priorityFilter: string; setPriorityFilter: (value: string) => void; clientFilter: string; setClientFilter: (value: string) => void
  clients: Cliente[]; categories: Categoria[]; technicians: Tecnico[]
  onNew: () => void; onEdit: (call: Chamado) => void; onDelete: (call: Chamado) => void; onOpen: (call: Chamado) => void; onStatus: (call: Chamado, status: StatusChamado) => void
}) {
  return <>
    <PageHeading eyebrow="ACOMPANHAMENTO E CUIDADO" title="Chamados" description="Cada chamado é uma oportunidade de ajudar." action={<button className="button button-primary" onClick={onNew}><Plus size={17} />Novo chamado</button>} />
    <div className="panel calls-panel">
      <div className="toolbar">
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por assunto, cliente ou número…" aria-label="Buscar chamados" />{query && <button onClick={() => setQuery('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
        <div className="filter-fields">
          <label className="select-wrap"><span className="sr-only">Filtrar por status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos os status</option>{statusOptions.map((status) => <option value={status} key={status}>{statusNames[status]}</option>)}</select><ChevronDown size={14} /></label>
          <label className="select-wrap"><span className="sr-only">Filtrar por prioridade</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">Prioridades</option>{priorityOptions.map((priority) => <option value={priority} key={priority}>{priorityNames[priority]}</option>)}</select><ChevronDown size={14} /></label>
          <label className="select-wrap client-select"><span className="sr-only">Filtrar por cliente</span><select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="">Todos os clientes</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.nome}</option>)}</select><ChevronDown size={14} /></label>
        </div>
      </div>
      <div className="table-summary"><span><strong>{calls.length}</strong> de {allCount} chamados</span><span className="summary-live"><i /> Dados da API</span></div>
      {calls.length ? <div className="table-scroll"><table className="data-table calls-table"><thead><tr><th>CHAMADO</th><th>CLIENTE</th><th>CATEGORIA</th><th>PRIORIDADE</th><th>STATUS</th><th>ABERTO EM</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
        {calls.map((call) => {
          const client = clients.find((item) => item.id === call.clienteId)
          const category = categories.find((item) => item.id === call.categoriaId)
          const technician = technicians.find((item) => item.id === call.tecnicoId)
          return <tr key={call.id}>
            <td><button className="call-title-button" onClick={() => onOpen(call)}><span className="call-id">#{call.id}</span><strong>{call.titulo}</strong><small>{call.descricao || 'Sem descrição'}</small></button></td>
            <td><div className="person-cell"><span className="person-avatar">{initials(client?.nome || '?')}</span><span>{client?.nome || `Cliente #${call.clienteId}`}</span></div></td>
            <td>{category?.nome || '—'}</td>
            <td><PriorityBadge priority={call.prioridade} /></td>
            <td><label className="status-select"><span className="sr-only">Alterar status do chamado #{call.id}</span><select disabled={call.status === 'FECHADO'} value={call.status} onChange={(event) => onStatus(call, event.target.value as StatusChamado)}>{statusOptions.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><ChevronDown size={12} /></label></td>
            <td className="date-cell"><span>{dateLabel(call.dataAbertura)}</span>{technician && <small>{technician.nome}</small>}</td>
            <td><div className="row-actions"><button title="Ver detalhes" aria-label={`Ver chamado ${call.id}`} onClick={() => onOpen(call)}><ChevronRight size={17} /></button><button title="Editar" aria-label={`Editar chamado ${call.id}`} onClick={() => onEdit(call)}><Settings2 size={15} /></button><button title="Excluir" aria-label={`Excluir chamado ${call.id}`} onClick={() => onDelete(call)}><Trash2 size={15} /></button></div></td>
          </tr>
        })}
      </tbody></table></div> : <EmptyState title={allCount ? 'Nenhum chamado encontrado' : 'Sua fila está tranquila'} text={allCount ? 'Experimente ajustar os filtros ou a busca.' : 'Quando uma nova solicitação chegar, ela aparecerá por aqui.'} action={allCount ? <button className="button button-secondary" onClick={() => { setQuery(''); setStatusFilter(''); setPriorityFilter(''); setClientFilter('') }}>Limpar filtros</button> : <button className="button button-primary" onClick={onNew}><Plus size={16} />Criar primeiro chamado</button>} />}
    </div>
  </>
}

function DirectoryPage({ kind, title, description, records, onNew, onEdit, onDelete }: {
  kind: Exclude<Section, 'inicio' | 'chamados'>; title: string; description: string; records: Entity[]
  onNew: () => void; onEdit: (record: Entity) => void; onDelete: (record: Entity) => void
}) {
  const [search, setSearch] = useState('')
  const visible = records.filter((record) => JSON.stringify(record).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const copy = {
    clientes: { singular: 'cliente', noun: 'clientes', label: 'PESSOA', icon: <UsersRound size={18} /> },
    categorias: { singular: 'categoria', noun: 'categorias', label: 'CATEGORIA', icon: <Tag size={18} /> },
    tecnicos: { singular: 'técnico', noun: 'técnicos', label: 'TÉCNICO', icon: <Headset size={18} /> },
  }[kind]
  return <>
    <PageHeading eyebrow="SUA EQUIPE, SEMPRE POR PERTO" title={title} description={description} action={<button className="button button-primary" onClick={onNew}><Plus size={17} />Novo {copy.singular}</button>} />
    <div className="directory-intro"><div className={`directory-icon directory-${kind}`}>{copy.icon}</div><div><strong>{records.length} {copy.noun}</strong><span>cadastrados na central</span></div><div className="directory-spacer" /><div className="directory-tip"><Sparkles size={15} /> Tudo organizado, tudo flui melhor.</div></div>
    <section className="panel directory-panel">
      <div className="toolbar directory-toolbar"><div><h2>Todos os {copy.noun}</h2><p>Gerencie as informações da sua central</p></div><label className="search-field directory-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${copy.noun}…`} aria-label={`Buscar ${copy.noun}`} /></label></div>
      {visible.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>{copy.label}</th><th>{kind === 'categorias' ? 'DESCRIÇÃO' : 'E-MAIL'}</th><th>{kind === 'clientes' ? 'TELEFONE' : kind === 'tecnicos' ? 'PERFIL' : 'CADASTRO'}</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{visible.map((record) => {
        const name = 'nome' in record ? record.nome : ''
        const secondary = kind === 'categorias' ? (record as Categoria).descricao || 'Sem descrição' : kind === 'clientes' ? (record as Cliente).email : (record as Tecnico).email
        const third = kind === 'clientes' ? (record as Cliente).telefone || '—' : kind === 'tecnicos' ? ((record as Tecnico).perfil === 'ADMIN' ? 'Administradora' : 'Técnico') : `#${record.id}`
        return <tr key={record.id}><td><div className="person-cell directory-person"><span className={`person-avatar ${kind}-avatar`}>{kind === 'categorias' ? <Tag size={16} /> : initials(name)}</span><span><strong>{name}</strong><small>Identificação #{record.id}</small></span></div></td><td className="muted-cell">{secondary}</td><td className="muted-cell">{third}</td><td><div className="row-actions"><button title="Editar" aria-label={`Editar ${copy.singular} ${name}`} onClick={() => onEdit(record)}><Settings2 size={15} /></button><button title="Excluir" aria-label={`Excluir ${copy.singular} ${name}`} onClick={() => onDelete(record)}><Trash2 size={15} /></button></div></td></tr>
      })}</tbody></table></div> : <EmptyState title={records.length ? 'Não encontramos resultados' : `Nenhum ${copy.singular} cadastrado`} text={records.length ? 'Tente outra palavra para sua busca.' : `Cadastre o primeiro ${copy.singular} para começar.`} action={!records.length ? <button className="button button-primary" onClick={onNew}><Plus size={16} />Cadastrar {copy.singular}</button> : undefined} />}
    </section>
  </>
}

function EntityDialog({ state, clients, categories, technicians, saving, error, onClose, onSubmit }: {
  state: NonNullable<DialogState>; clients: Cliente[]; categories: Categoria[]; technicians: Tecnico[]; saving: boolean; error: string
  onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const { kind, record } = state
  const isEdit = Boolean(record)
  const heading = kind === 'chamado' ? (isEdit ? 'Editar chamado' : 'Novo chamado') : `${isEdit ? 'Editar' : 'Novo'} ${kind === 'clientes' ? 'cliente' : kind === 'categorias' ? 'categoria' : 'técnico'}`
  return <Modal title={heading} onClose={onClose} wide={kind === 'chamado'}>
    <form className="entity-form" onSubmit={onSubmit}>
      {kind === 'clientes' && <><Field label="Nome completo" required><input name="nome" required maxLength={100} defaultValue={(record as Cliente | undefined)?.nome} placeholder="Ex.: Mariana Costa" /></Field><Field label="E-mail" required><input name="email" type="email" required defaultValue={(record as Cliente | undefined)?.email} placeholder="mariana@email.com" /></Field><Field label="Telefone"><input name="telefone" maxLength={20} defaultValue={(record as Cliente | undefined)?.telefone || ''} placeholder="(11) 99999-9999" /></Field></>}
      {kind === 'categorias' && <><Field label="Nome da categoria" required><input name="nome" required maxLength={100} defaultValue={(record as Categoria | undefined)?.nome} placeholder="Ex.: Dúvida técnica" /></Field><Field label="Descrição"><textarea name="descricao" rows={4} maxLength={500} defaultValue={(record as Categoria | undefined)?.descricao || ''} placeholder="Conte brevemente sobre esta categoria" /></Field></>}
      {kind === 'tecnicos' && <><Field label="Nome completo" required><input name="nome" required maxLength={100} defaultValue={(record as Tecnico | undefined)?.nome} placeholder="Ex.: Rafael Almeida" /></Field><Field label="E-mail" required><input name="email" type="email" required maxLength={120} defaultValue={(record as Tecnico | undefined)?.email} placeholder="rafael@empresa.com" /></Field><Field label="Perfil" required><select name="perfil" required defaultValue={(record as Tecnico | undefined)?.perfil || 'TECNICO'}><option value="TECNICO">Técnico</option><option value="ADMIN">Administradora</option></select></Field></>}
      {kind === 'chamado' && <>
        <Field label="Assunto" required><input name="titulo" required maxLength={200} defaultValue={(record as Chamado | undefined)?.titulo} placeholder="Resuma a solicitação" /></Field>
        <Field label="Descrição"><textarea name="descricao" rows={4} maxLength={2000} defaultValue={(record as Chamado | undefined)?.descricao || ''} placeholder="Conte um pouco mais sobre o que aconteceu" /></Field>
        <div className="form-grid"><Field label="Cliente" required><select name="clienteId" required defaultValue={(record as Chamado | undefined)?.clienteId || ''}><option value="" disabled>Selecione um cliente</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field><Field label="Categoria" required><select name="categoriaId" required defaultValue={(record as Chamado | undefined)?.categoriaId || ''}><option value="" disabled>Selecione uma categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field></div>
        <div className="form-grid"><Field label="Prioridade" required><select name="prioridade" required defaultValue={(record as Chamado | undefined)?.prioridade || 'MEDIA'}>{priorityOptions.map((item) => <option key={item} value={item}>{priorityNames[item]}</option>)}</select></Field><Field label="Técnico responsável"><select name="tecnicoId" defaultValue={(record as Chamado | undefined)?.tecnicoId || ''}><option value="">Ainda não atribuído</option>{technicians.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field></div>
        {isEdit && <p className="form-hint"><CircleAlert size={15} /> O status é atualizado pelo chamado, fora deste formulário.</p>}
      </>}
      {error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando…' : <>{isEdit ? 'Salvar alterações' : 'Criar cadastro'} <ChevronRight size={16} /></>}</button></div>
    </form>
  </Modal>
}

function CallDetails({ call, clients, categories, technicians, error, saving, onClose, onEdit, onDelete, onStatus, onAssign, onComment }: {
  call: Chamado; clients: Cliente[]; categories: Categoria[]; technicians: Tecnico[]; error: string; saving: boolean
  onClose: () => void; onEdit: () => void; onDelete: () => void; onStatus: (status: StatusChamado) => void; onAssign: (technicianId: number) => void; onComment: (text: string, author: string) => Promise<boolean>
}) {
  const client = clients.find((item) => item.id === call.clienteId)
  const category = categories.find((item) => item.id === call.categoriaId)
  const technician = technicians.find((item) => item.id === call.tecnicoId)
  const [comment, setComment] = useState('')
  const [author, setAuthor] = useState('')
  const [commentError, setCommentError] = useState('')
  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCommentError('')
    if (!comment.trim() || !author.trim()) {
      setCommentError('Informe o comentário e seu nome para continuar.')
      return
    }
    const ok = await onComment(comment.trim(), author.trim())
    if (ok) { setComment(''); setAuthor('') }
  }
  return <Modal title={`Chamado #${call.id}`} onClose={onClose} wide>
    <div className="detail-layout">
      <div className="detail-main">
        <div className="detail-title-row"><div><div className="eyebrow">DETALHES DO CHAMADO</div><h2>{call.titulo}</h2></div><PriorityBadge priority={call.prioridade} /></div>
        <p className="detail-description">{call.descricao || 'Nenhuma descrição foi adicionada.'}</p>
        <div className="detail-info-grid"><InfoItem label="Cliente" value={client?.nome || `Cliente #${call.clienteId}`} /><InfoItem label="Categoria" value={category?.nome || '—'} /><InfoItem label="Aberto em" value={dateLabel(call.dataAbertura)} /><InfoItem label="Fechado em" value={dateLabel(call.dataFechamento)} /></div>
        <div className="detail-control-grid">
          <Field label="Status"><select aria-label="Alterar status" value={call.status} disabled={saving || call.status === 'FECHADO'} onChange={(event) => onStatus(event.target.value as StatusChamado)}>{statusOptions.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select></Field>
          <Field label="Técnico responsável"><select aria-label="Atribuir técnico" disabled={saving || call.status === 'FECHADO'} value={call.tecnicoId || ''} onChange={(event) => { if (event.target.value) onAssign(Number(event.target.value)) }}><option value="">Sem atribuição</option>{technicians.map((person) => <option key={person.id} value={person.id}>{person.nome}</option>)}</select>{call.tecnicoId && !technician && <small className="field-note">Técnico #{call.tecnicoId}</small>}</Field>
        </div>
        <div className="comments-heading"><div><h3>Conversa</h3><span>{call.comentarios?.length || 0} comentários</span></div><MessageCircle size={18} /></div>
        <div className="comment-list">{call.comentarios?.length ? call.comentarios.map((item) => <CommentItem key={item.id} comment={item} />) : <p className="comments-empty">Ainda não há comentários. Que tal começar a conversa?</p>}</div>
        <form className="comment-form" onSubmit={submitComment}><Field label="Seu comentário"><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={3} placeholder="Escreva uma atualização para este chamado…" /></Field><div className="comment-submit-row"><input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} aria-label="Nome do autor" placeholder="Seu nome" /><button className="button button-primary" disabled={saving}><MessageCircle size={15} />Enviar</button></div>{commentError && <span className="inline-error">{commentError}</span>}</form>
      </div>
      <aside className="detail-sidebar"><StatusBadge status={call.status} /><div className="detail-meta"><span>Aberto por</span><strong>{client?.nome || 'Cliente'}</strong></div><div className="detail-meta"><span>Responsável</span><strong>{technician?.nome || 'Aguardando atribuição'}</strong></div><div className="detail-meta"><span>Categoria</span><strong>{category?.nome || '—'}</strong></div><div className="detail-meta"><span>Prioridade</span><PriorityBadge priority={call.prioridade} /></div><div className="detail-actions"><button className="button button-secondary full-width" onClick={onEdit} disabled={call.status === 'FECHADO'}><Settings2 size={16} />Editar chamado</button><button className="button button-danger full-width" onClick={onDelete}><Trash2 size={16} />Excluir chamado</button></div></aside>
    </div>
    {error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}</div>}
  </Modal>
}

function CommentItem({ comment }: { comment: Comentario }) {
  return <div className="comment-item"><div className="comment-avatar">{initials(comment.autor)}</div><div className="comment-content"><div><strong>{comment.autor}</strong><time>{dateLabel(comment.data)}</time></div><p>{comment.texto}</p></div></div>
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div className="info-item"><span>{label}</span><strong>{value}</strong></div>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <i aria-hidden="true"> *</i>}</span>{children}</label>
}

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><span className="eyebrow">CENTRAL DE SUPORTE</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div><div className="modal-body">{children}</div></section></div>
}

function StatusBadge({ status }: { status: StatusChamado }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><i />{statusNames[status]}</span>
}

function PriorityBadge({ priority }: { priority: Prioridade }) {
  const Icon = priority === 'BAIXA' ? ArrowDown : ArrowUpRight
  return <span className={`priority-badge priority-label-${priority.toLowerCase()}`}><Icon size={13} />{priorityNames[priority]}</span>
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-illustration"><BriefcaseBusiness size={24} /></div><h3>{title}</h3><p>{text}</p>{action}</div>
}

export default App
