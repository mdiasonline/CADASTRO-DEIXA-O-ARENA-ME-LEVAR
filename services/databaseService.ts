
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member } from "../types";

// Interface para garantir que ambos os drivers (Supabase e Local) funcionem igual
interface DBProvider {
  getMembers(): Promise<Member[]>;
  addMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
  isLocal: boolean;
}

/**
 * Driver de Fallback: LocalStorage
 * Usado quando as chaves do Supabase não estão configuradas.
 */
const localProvider: DBProvider = {
  isLocal: true,
  async getMembers(): Promise<Member[]> {
    const data = localStorage.getItem('carnaval_members');
    return data ? JSON.parse(data) : [];
  },
  async addMember(member: Member): Promise<void> {
    const members = await this.getMembers();
    localStorage.setItem('carnaval_members', JSON.stringify([member, ...members]));
  },
  async deleteMember(id: string): Promise<void> {
    const members = await this.getMembers();
    const filtered = members.filter(m => m.id !== id);
    localStorage.setItem('carnaval_members', JSON.stringify(filtered));
  }
};

/**
 * Tenta obter variáveis de ambiente de forma ultra-resiliente
 */
const getEnv = (key: string): string => {
  try {
    // Cast para any para evitar erros de tipagem no ImportMeta
    const meta = import.meta as any;
    if (meta && meta.env) {
      // Procura com prefixo VITE_ e sem prefixo
      const val = meta.env[`VITE_${key}`] || meta.env[key];
      if (val) return val;
    }
    
    // Tenta via process.env (Vercel/Node)
    if (typeof process !== 'undefined' && process.env) {
      const env = process.env as any;
      const val = env[`VITE_${key}`] || env[key];
      if (val) return val;
    }
  } catch (e) {}
  return "";
};

// Cliente Supabase instanciado preguiçosamente
let supabaseInstance: SupabaseClient | null = null;

/**
 * Retorna o provedor de dados adequado (Supabase ou Local)
 */
const getProvider = (): DBProvider => {
  // Chamamos apenas o nome base, o getEnv cuida do prefixo VITE_
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');

  if (!url || !key) {
    return localProvider;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key);
    } catch (e) {
      console.error("Erro ao criar cliente Supabase, usando LocalStorage", e);
      return localProvider;
    }
  }

  return {
    isLocal: false,
    async getMembers(): Promise<Member[]> {
      const { data, error } = await supabaseInstance!
        .from('membros')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return (data as Member[]) || [];
    },
    async addMember(member: Member): Promise<void> {
      const { error } = await supabaseInstance!
        .from('membros')
        .insert([member]);
      if (error) throw error;
    },
    async deleteMember(id: string): Promise<void> {
      const { error } = await supabaseInstance!
        .from('membros')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  };
};

export const databaseService = {
  isConfigured: () => !getProvider().isLocal,
  getMembers: () => getProvider().getMembers(),
  addMember: (m: Member) => getProvider().addMember(m),
  deleteMember: (id: string) => getProvider().deleteMember(id)
};
