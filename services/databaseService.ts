
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member, EventPhoto } from "../types";

/* 
  SQL PARA CRIAR AS TABELAS NO SUPABASE (Copie e cole no SQL Editor do Supabase):

  CREATE TABLE membros (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    bloco TEXT,
    tipo TEXT,
    apto TEXT,
    celular TEXT,
    photo TEXT,
    "createdAt" BIGINT
  );

  CREATE TABLE fotos_evento (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    "createdAt" BIGINT
  );

  -- Desative o RLS para testes ou crie políticas de acesso público:
  ALTER TABLE membros DISABLE ROW LEVEL SECURITY;
  ALTER TABLE fotos_evento DISABLE ROW LEVEL SECURITY;
*/

interface DBProvider {
  getMembers(): Promise<Member[]>;
  addMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
  getEventPhotos(): Promise<EventPhoto[]>;
  addEventPhoto(photo: EventPhoto): Promise<void>;
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
  },
  async getEventPhotos(): Promise<EventPhoto[]> {
    const data = localStorage.getItem('carnaval_event_photos');
    return data ? JSON.parse(data) : [];
  },
  async addEventPhoto(photo: EventPhoto): Promise<void> {
    const photos = await this.getEventPhotos();
    localStorage.setItem('carnaval_event_photos', JSON.stringify([photo, ...photos]));
  }
};

const getEnv = (key: string): string => {
  try {
    // @ts-ignore
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

  if (!url || !key) return localProvider;

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
    },
    async getEventPhotos(): Promise<EventPhoto[]> {
      const { data, error } = await supabaseInstance!
        .from('fotos_evento')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) {
        console.error("Erro Supabase Photos:", error);
        return [];
      }
      return (data as EventPhoto[]) || [];
    },
    async addEventPhoto(photo: EventPhoto): Promise<void> {
      const { error } = await supabaseInstance!
        .from('fotos_evento')
        .insert([{ 
          id: photo.id, 
          url: photo.url, 
          createdAt: photo.createdAt 
        }]);
      if (error) throw error;
    }
  };
};

export const databaseService = {
  isConfigured: () => !getProvider().isLocal,
  getMembers: () => getProvider().getMembers(),
  addMember: (m: Member) => getProvider().addMember(m),
  deleteMember: (id: string) => getProvider().deleteMember(id),
  getEventPhotos: () => getProvider().getEventPhotos(),
  addEventPhoto: (p: EventPhoto) => getProvider().addEventPhoto(p)
};
