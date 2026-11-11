export type StatusChamado = 'ABERTO' | 'EM_ATENDIMENTO' | 'AGUARDANDO_CLIENTE' | 'FECHADO'
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type Perfil = 'ADMIN' | 'TECNICO'

export interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string | null
}

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
}

export interface Tecnico {
  id: number
  nome: string
  email: string
  perfil: Perfil
}

export interface Comentario {
  id: number
  texto: string
  data: string
  autor: string
}

export interface Chamado {
  id: number
  titulo: string
  descricao: string | null
  dataAbertura: string
  dataFechamento: string | null
  prioridade: Prioridade
  status: StatusChamado
  clienteId: number
  categoriaId: number
  tecnicoId: number | null
  comentarios: Comentario[]
}

export interface ChamadoPage {
  content: Chamado[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface ClienteInput {
  nome: string
  email: string
  telefone: string
}

export interface CategoriaInput {
  nome: string
  descricao: string
}

export interface TecnicoInput {
  nome: string
  email: string
  perfil: Perfil
}

export interface ChamadoInput {
  titulo: string
  descricao: string
  prioridade: Prioridade
  clienteId: number
  categoriaId: number
  tecnicoId: number | null
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Não foi possível conectar à API. Verifique se o backend está em execução.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as
      | { mensagem?: string; message?: string; error?: string; erro?: string; erros?: string[]; detalhes?: string[]; errors?: Array<{ defaultMessage?: string; message?: string }> }
      | null
    const validationMessages = body?.errors?.map((error) => error.defaultMessage || error.message).filter(Boolean)
    const detail = body?.detalhes?.join(' • ') || body?.erros?.join(' • ') || validationMessages?.join(' • ')
    const message = detail || body?.mensagem || body?.erro || body?.message || body?.error || `A solicitação falhou (${response.status}).`
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
})

export const api = {
  clientes: {
    list: () => request<Cliente[]>('/clientes'),
    save: (data: ClienteInput, id?: number) => request<Cliente>(id ? `/clientes/${id}` : '/clientes', json(id ? 'PUT' : 'POST', data)),
    remove: (id: number) => request<void>(`/clientes/${id}`, json('DELETE')),
  },
  categorias: {
    list: () => request<Categoria[]>('/categorias'),
    save: (data: CategoriaInput, id?: number) => request<Categoria>(id ? `/categorias/${id}` : '/categorias', json(id ? 'PUT' : 'POST', data)),
    remove: (id: number) => request<void>(`/categorias/${id}`, json('DELETE')),
  },
  tecnicos: {
    list: () => request<Tecnico[]>('/tecnicos'),
    save: (data: TecnicoInput, id?: number) => request<Tecnico>(id ? `/tecnicos/${id}` : '/tecnicos', json(id ? 'PUT' : 'POST', data)),
    remove: (id: number) => request<void>(`/tecnicos/${id}`, json('DELETE')),
  },
  chamados: {
    list: async (filters: { status?: StatusChamado; prioridade?: Prioridade; clienteId?: number } = {}) => {
      const params = new URLSearchParams({ page: '0', size: '100', sort: 'dataAbertura,desc' })
      if (filters.status) params.set('status', filters.status)
      if (filters.prioridade) params.set('prioridade', filters.prioridade)
      if (filters.clienteId) params.set('clienteId', String(filters.clienteId))
      const firstPage = await request<ChamadoPage>(`/chamados?${params.toString()}`)
      if (firstPage.totalPages <= 1) return firstPage.content
      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.totalPages - 1 }, (_, index) => {
          const pageParams = new URLSearchParams(params)
          pageParams.set('page', String(index + 1))
          return request<ChamadoPage>(`/chamados?${pageParams.toString()}`)
        }),
      )
      return [...firstPage.content, ...remainingPages.flatMap((page) => page.content)]
    },
    get: (id: number) => request<Chamado>(`/chamados/${id}`),
    save: (data: ChamadoInput, id?: number) => request<Chamado>(id ? `/chamados/${id}` : '/chamados', json(id ? 'PUT' : 'POST', data)),
    remove: (id: number) => request<void>(`/chamados/${id}`, json('DELETE')),
    changeStatus: (id: number, status: StatusChamado) => request<Chamado>(`/chamados/${id}/status`, json('PATCH', { status })),
    assign: (id: number, tecnicoId: number) => request<Chamado>(`/chamados/${id}/atribuir`, json('PATCH', { tecnicoId })),
    comment: (id: number, texto: string, autor: string) => request<Comentario>(`/chamados/${id}/comentarios`, json('POST', { texto, autor })),
  },
}
