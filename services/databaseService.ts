
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member } from "../types";

interface DBProvider {
  getMembers(): Promise<Member[]>;
  addMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
  isLocal: boolean;
}

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

const getEnv = (key: string): string => {
  try {
    // @ts-ignore - Vite way
    const env = import.meta.env;
    if (env) {
      const val = env[`VITE_${key}`] || env[key];
      if (val) return val;
    }
  } catch (e) {}
  return "";
};

let supabaseInstance: SupabaseClient | null = null;

const getProvider = (): DBProvider => {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');

  if (!url || !key) {
    return localProvider;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }

  return {
    isLocal: false,
    async getMembers(): Promise<Member[]> {
      const { data, error } = await supabaseInstance!
        .from('membros')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error("Supabase Select Error:", error);
        throw error;
      }
      return (data as Member[]) || [];
    },
    async addMember(member: Member): Promise<void> {
      // Normalizamos os dados para garantir que campos nulos não quebrem a query
      const payload = {
        id: member.id,
        nome: member.nome,
        bloco: member.bloco,
        tipo: member.tipo,
        apto: member.apto || '',
        celular: member.celular,
        photo: member.photo || '',
        createdAt: member.createdAt
      };

      const { error } = await supabaseInstance!
        .from('membros')
        .insert([payload]);
      
      if (error) {
        console.error("Supabase Insert Error:", error);
        throw error;
      }
    },
    async deleteMember(id: string): Promise<void> {
      const { error } = await supabaseInstance!
        .from('membros')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Supabase Delete Error:", error);
        throw error;
      }
    }
  };
};

export const databaseService = {
  isConfigured: () => !getProvider().isLocal,
  getMembers: () => getProvider().getMembers(),
  addMember: (m: Member) => getProvider().addMember(m),
  deleteMember: (id: string) => getProvider().deleteMember(id)
};
