
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Member, ViewMode } from './types';
import { databaseService } from './services/databaseService';
import { 
  Users, 
  UserPlus, 
  Home, 
  Search,
  Trash2,
  Loader2,
  Trophy,
  MessageCircle,
  Camera,
  User,
  Filter,
  CloudCheck,
  CloudDownload,
  DatabaseZap,
  HardDrive
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('synced');
  
  const [formData, setFormData] = useState({
    nome: '',
    bloco: 'BLOCO 1',
    tipo: 'FOLIÃO',
    apto: '',
    celular: '',
    photo: '' as string | undefined
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMembers = async () => {
    setFetching(true);
    setSyncStatus('syncing');
    try {
      const isOnline = databaseService.isConfigured();
      const data = await databaseService.getMembers();
      setMembers(data);
      setSyncStatus(isOnline ? 'synced' : 'local');
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      setSyncStatus('local');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const maskPhone = (value: string) => {
    value = value.replace(/\D/g, "");
    if (value.length > 2) value = `(${value.substring(0,2)}) ${value.substring(2)}`;
    if (value.length > 9) value = `${value.substring(0,10)}-${value.substring(10,14)}`;
    return value.substring(0, 15);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'celular' ? maskPhone(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const newMember: Member = {
      id: Math.random().toString(36).substring(7),
      ...formData,
      createdAt: Date.now()
    };

    try {
      await databaseService.addMember(newMember);
      setMembers(prev => [newMember, ...prev]);
      setIsRegistered(true);
      if (!databaseService.isConfigured()) setSyncStatus('local');
    } catch (error: any) {
      console.error("Erro completo:", error);
      const msg = error.message || "Erro desconhecido";
      const code = error.code || "";
      alert(`ERRO SUPABASE: ${msg} (Código: ${code}). Verifique se a tabela 'membros' existe e o RLS está desativado.`);
    } finally {
      setLoading(false);
      setFormData({ nome: '', bloco: 'BLOCO 1', tipo: 'FOLIÃO', apto: '', celular: '', photo: undefined });
    }
  };

  const removeMember = async (id: string) => {
    if (!window.confirm('Deseja excluir este registro?')) return;
    try {
      await databaseService.deleteMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const filteredMembers = useMemo(() => 
    members.filter(m => {
      const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = filterTipo === '' || m.tipo === filterTipo;
      return matchesSearch && matchesTipo;
    }), 
  [members, searchTerm, filterTipo]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all";
  const cargos = ['FOLIÃO', 'BATERIA', 'DIRETORIA', 'RAINHA', 'DESTAQUE'];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-6 md:py-10 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="text-center flex flex-col items-center">
            <h1 className="text-3xl md:text-5xl font-arena tracking-tighter">
              CADASTRO <span className="text-[#F9B115]">DA FOLIA</span>
            </h1>
            
            {/* Status de Sincronização agora embaixo do título */}
            <div className="mt-3 flex items-center gap-2 px-4 py-1.5 bg-black/20 rounded-full border border-white/10 w-fit animate-fadeIn">
              {syncStatus === 'synced' && (
                <>
                  <DatabaseZap size={14} className="text-green-400" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Cloud Online</span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <>
                  <CloudDownload size={14} className="text-yellow-400 animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Sincronizando</span>
                </>
              )}
              {syncStatus === 'local' && (
                <>
                  <HardDrive size={14} className="text-orange-400" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Modo Local (Offline)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-8">
        {syncStatus === 'local' && (
          <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center gap-4 text-orange-800 animate-fadeIn">
            <div className="bg-orange-200 p-2 rounded-full"><HardDrive size={20} /></div>
            <div>
              <p className="font-bold text-sm">Atenção: Rodando em Modo Local</p>
              <p className="text-xs">Para salvar na nuvem, adicione as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel e faça um Redeploy.</p>
            </div>
          </div>
        )}

        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn mt-6">
            <button onClick={() => setView(ViewMode.REGISTER)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#2B4C7E]">
                <UserPlus size={40} className="text-[#2B4C7E]" />
              </div>
              <h2 className="text-3xl font-arena text-[#2B4C7E]">NOVA INSCRIÇÃO</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Adicionar Folião</p>
            </button>
            <button onClick={() => setView(ViewMode.LIST)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#C63D2F]">
                <Users size={40} className="text-[#C63D2F]" />
              </div>
              <h2 className="text-3xl font-arena text-[#C63D2F]">GERENCIAR</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Lista de Membros</p>
            </button>
          </div>
        )}

        {view === ViewMode.REGISTER && (
          <div className="max-w-md mx-auto arena-card overflow-hidden bg-white animate-slideUp">
            <div className="bg-[#2B4C7E] p-4 text-center text-white">
              <h2 className="text-2xl font-arena uppercase tracking-widest">NOVO REGISTRO</h2>
            </div>
            {isRegistered ? (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500">
                  <Trophy size={40} />
                </div>
                <h3 className="text-2xl font-arena text-[#2B4C7E] mb-2">GRAVADO!</h3>
                <p className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">Salvo no {syncStatus === 'local' ? 'Navegador' : 'Banco Cloud'}</p>
                <button onClick={() => setIsRegistered(false)} className="btn-arena w-full py-4 rounded-xl font-arena text-xl uppercase tracking-widest">FAZER OUTRO</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full border-4 border-[#2B4C7E] bg-gray-50 flex items-center justify-center overflow-hidden">
                      {formData.photo ? (
                        <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} className="text-gray-300" />
                      )}
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-[#2B4C7E] text-white p-2 rounded-full shadow-lg hover:bg-[#C63D2F] transition-colors"><Camera size={18} /></button>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                </div>

                <input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="NOME COMPLETO" />
                
                <div className="grid grid-cols-2 gap-4">
                  <select name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}>
                    {['BLOCO 1', 'BLOCO 2', 'BLOCO 3', 'BLOCO 4', 'BLOCO 5', 'CONVIDADO'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <select name="tipo" value={formData.tipo} onChange={handleInputChange} className={inputStyles}>
                    {cargos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input name="apto" value={formData.apto} onChange={handleInputChange} className={inputStyles} placeholder="APTO" />
                  <input required name="celular" value={formData.celular} onChange={handleInputChange} className={inputStyles} placeholder="WHATSAPP" />
                </div>

                <button type="submit" disabled={loading} className="btn-arena w-full py-4 rounded-2xl font-arena text-2xl flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" /> : "GRAVAR"}
                </button>
              </form>
            )}
          </div>
        )}

        {view === ViewMode.LIST && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow bg-white p-3 rounded-2xl border-4 border-[#2B4C7E] flex items-center gap-3 shadow-sm">
                <Search className="text-[#2B4C7E]" />
                <input placeholder="PESQUISAR..." className="w-full outline-none font-bold text-[#2B4C7E]" onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="md:w-64 bg-white p-3 rounded-2xl border-4 border-[#2B4C7E] flex items-center gap-3 shadow-sm">
                <Filter className="text-[#2B4C7E]" />
                <select className="w-full outline-none font-bold text-[#2B4C7E] bg-white" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                  <option value="">TODOS</option>
                  {cargos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {fetching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-[#2B4C7E]" size={48} />
                <p className="font-arena text-xl text-[#2B4C7E] animate-pulse">CARREGANDO...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-20 opacity-30">
                    <Users size={64} className="mx-auto mb-4" />
                    <p className="font-arena text-2xl">NENHUM FOLIÃO ENCONTRADO</p>
                  </div>
                ) : (
                  filteredMembers.map(m => (
                    <div key={m.id} className="bg-white p-5 rounded-3xl border-2 border-[#2B4C7E] flex flex-col md:flex-row gap-4 items-center shadow-lg hover:border-[#C63D2F] transition-all">
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-14 h-14 rounded-full border-2 border-[#2B4C7E] overflow-hidden shrink-0 bg-[#F9E7C7]">
                          {m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-300 w-full h-full" />}
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-arena text-xl text-[#2B4C7E] leading-none mb-1">{m.nome}</h4>
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-[#F9B115] text-[#2B4C7E] text-[9px] font-black rounded uppercase">{m.tipo}</span>
                            <span className="px-2 py-0.5 bg-[#2B4C7E] text-white text-[9px] font-black rounded uppercase">{m.bloco}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
                        <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">Apto</span><span className="font-bold text-[#2B4C7E] text-sm">{m.apto || '-'}</span></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">WhatsApp</span><span className="font-bold text-[#2B4C7E] text-xs">{m.celular}</span></div>
                        <div className="flex items-center justify-end gap-2">
                          <a href={`https://wa.me/55${m.celular.replace(/\D/g,'')}`} target="_blank" className="p-2 bg-green-500 text-white rounded-full hover:scale-110 transition-transform"><MessageCircle size={16} /></a>
                          <button onClick={() => removeMember(m.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center ${view === ViewMode.HOME ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <Home size={24} /> <span className="text-[10px] font-bold">INÍCIO</span>
          </button>
          <button onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }} className={`flex flex-col items-center ${view === ViewMode.REGISTER ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <UserPlus size={24} /> <span className="text-[10px] font-bold">CADASTRO</span>
          </button>
          <button onClick={() => setView(ViewMode.LIST)} className={`flex flex-col items-center ${view === ViewMode.LIST ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <Users size={24} /> <span className="text-[10px] font-bold">FOLIÕES</span>
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
      `}} />
    </div>
  );
};

export default App;
