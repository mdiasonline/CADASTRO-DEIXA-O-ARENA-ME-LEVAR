import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member, EventPhoto } from "../types";

interface DBProvider {
  getMembers(): Promise<Member[]>;
  addMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
  getEventPhotos(): Promise<EventPhoto[]>;
  addEventPhotos(photos: EventPhoto[]): Promise<void>;
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
    const updated = [member, ...members];
    localStorage.setItem('carnaval_members', JSON.stringify(updated));
    console.log("Membro salvo no banco local");
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
  async addEventPhotos(newPhotos: EventPhoto[]): Promise<void> {
    try {
      const photos = await this.getEventPhotos();
      const updated = [...newPhotos, ...photos];
      localStorage.setItem('carnaval_event_photos', JSON.stringify(updated));
      console.log(`${newPhotos.length} fotos salvas no banco local`);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        throw new Error("Memória do navegador cheia! O banco de dados local atingiu o limite.");
      }
      throw e;
    }
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
    async addEventPhotos(photos: EventPhoto[]): Promise<void> {
      const { error } = await supabaseInstance!
        .from('fotos_evento')
        .insert(photos.map(p => ({ 
          id: p.id, 
          url: p.url, 
          createdAt: p.createdAt 
        })));
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
  addEventPhotos: (p: EventPhoto[]) => getProvider().addEventPhotos(p)
};