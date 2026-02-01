
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Member, ViewMode, EventPhoto } from './types';
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
  CloudDownload,
  DatabaseZap,
  HardDrive,
  Lock,
  X,
  BarChart3,
  PieChart,
  Image as ImageIcon,
  Download,
  Share2,
  Upload,
  PlusCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('synced');
  
  // Estados para acesso protegido
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordPurpose, setPasswordPurpose] = useState<'DELETE' | 'VIEW_LIST' | 'VIEW_STATS' | null>(null);
  const [memberIdToDelete, setMemberIdToDelete] = useState<string | null>(null);
  
  const defaultFormData = {
    nome: '',
    bloco: 'BLOCO 1',
    tipo: 'FOLIÃO',
    apto: '',
    celular: '',
    photo: '' as string | undefined
  };

  const [formData, setFormData] = useState(defaultFormData);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const muralUploadRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setFetching(true);
    setSyncStatus('syncing');
    try {
      const isOnline = databaseService.isConfigured();
      const [membersData, photosData] = await Promise.all([
        databaseService.getMembers(),
        databaseService.getEventPhotos()
      ]);
      setMembers(membersData);
      setEventPhotos(photosData);
      setSyncStatus(isOnline ? 'synced' : 'local');
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      setSyncStatus('local');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleMuralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newPhoto: EventPhoto = {
          id: Math.random().toString(36).substring(7),
          url: reader.result as string,
          createdAt: Date.now()
        };
        try {
          await databaseService.addEventPhoto(newPhoto);
          setEventPhotos(prev => [newPhoto, ...prev]);
        } catch (err) {
          alert("Erro ao salvar foto no mural.");
        } finally {
          setLoading(false);
        }
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
    } catch (error: any) {
      alert(`Erro ao salvar membro.`);
    } finally {
      setLoading(false);
      setFormData(defaultFormData);
    }
  };

  const initiateRemoveMember = (id: string) => {
    setMemberIdToDelete(id);
    setPasswordPurpose('DELETE');
    setPasswordInput('');
    setIsPasswordModalOpen(true);
  };

  const initiateViewList = () => {
    setPasswordPurpose('VIEW_LIST');
    setPasswordInput('');
    setIsPasswordModalOpen(true);
  };

  const initiateViewStats = () => {
    setPasswordPurpose('VIEW_STATS');
    setPasswordInput('');
    setIsPasswordModalOpen(true);
  };

  const handleConfirmPassword = async () => {
    if (passwordInput.toUpperCase() === 'GARRINCHA') {
      if (passwordPurpose === 'DELETE' && memberIdToDelete) {
        await databaseService.deleteMember(memberIdToDelete);
        setMembers(prev => prev.filter(m => m.id !== memberIdToDelete));
        setIsPasswordModalOpen(false);
      } else if (passwordPurpose === 'VIEW_LIST') {
        setView(ViewMode.LIST);
        setIsPasswordModalOpen(false);
      } else if (passwordPurpose === 'VIEW_STATS') {
        setView(ViewMode.STATISTICS);
        setIsPasswordModalOpen(false);
      }
    } else {
      alert('SENHA INCORRETA!');
    }
    setPasswordInput('');
  };

  const handleDownloadPhoto = (url?: string, name?: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `folia_${name || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSharePhoto = async (url?: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `folia_arena.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Carnaval 2026' });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent('Olha essa foto do carnaval!')}`, '_blank');
      }
    } catch (e) { alert("Download a foto primeiro para compartilhar."); }
  };

  const filteredMembers = useMemo(() => 
    members.filter(m => m.nome.toLowerCase().includes(searchTerm.toLowerCase()) && (filterTipo === '' || m.tipo === filterTipo)), 
  [members, searchTerm, filterTipo]);

  const stats = useMemo(() => {
    const byBloco: Record<string, number> = {};
    const byCargo: Record<string, number> = {};
    members.forEach(m => {
      byBloco[m.bloco] = (byBloco[m.bloco] || 0) + 1;
      byCargo[m.tipo] = (byCargo[m.tipo] || 0) + 1;
    });
    return {
      byBloco: Object.entries(byBloco).sort((a,b) => b[1]-a[1]),
      byCargo: Object.entries(byCargo).sort((a,b) => b[1]-a[1]),
      total: members.length
    };
  }, [members]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all";
  const cargos = ['FOLIÃO', 'BATERIA', 'DIRETORIA', 'RAINHA', 'DESTAQUE'];
  const blocosDisponiveis = ['BLOCO 1', 'BLOCO 2', 'BLOCO 3', 'BLOCO 4', 'BLOCO 5', 'BLOCO 6', 'BLOCO 7', 'BLOCO 8','CONVIDADO'];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-6 md:py-10 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4 text-center flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-arena tracking-tighter">
            CADASTRO <span className="text-[#F9B115]">DA FOLIA</span>
          </h1>
          <div className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-60">Carnaval 2026</div>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-8">
        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn mt-6">
            <button onClick={() => setView(ViewMode.REGISTER)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#2B4C7E]">
                <UserPlus size={40} className="text-[#2B4C7E]" />
              </div>
              <h2 className="text-3xl font-arena text-[#2B4C7E]">NOVA INSCRIÇÃO</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Cadastro de Folião</p>
            </button>
            <button onClick={() => setView(ViewMode.PHOTOS)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#F9B115]">
                <ImageIcon size={40} className="text-[#F9B115]" />
              </div>
              <h2 className="text-3xl font-arena text-[#F9B115]">MURAL DE FOTOS</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Público - Veja e Poste!</p>
            </button>
            <button onClick={initiateViewList} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#C63D2F]">
                <Users size={40} className="text-[#C63D2F]" />
              </div>
              <h2 className="text-3xl font-arena text-[#C63D2F]">LISTA PRIVADA</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Apenas com Senha</p>
            </button>
            <button onClick={initiateViewStats} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-gray-400">
                <BarChart3 size={40} className="text-gray-500" />
              </div>
              <h2 className="text-3xl font-arena text-gray-500">ESTATÍSTICAS</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Dados do Bloco</p>
            </button>
          </div>
        )}

        {view === ViewMode.REGISTER && (
          <div className="max-w-md mx-auto arena-card overflow-hidden bg-white animate-slideUp">
             <div className="bg-[#2B4C7E] p-4 text-center text-white"><h2 className="text-2xl font-arena">INSCRIÇÃO</h2></div>
             {isRegistered ? (
               <div className="p-10 text-center">
                 <Trophy size={60} className="mx-auto text-green-500 mb-4" />
                 <h3 className="text-2xl font-arena text-[#2B4C7E]">CADASTRO OK!</h3>
                 <button onClick={() => setIsRegistered(false)} className="btn-arena w-full mt-6 py-3 rounded-xl font-arena">OUTRO</button>
               </div>
             ) : (
               <form onSubmit={handleSubmit} className="p-8 space-y-5">
                 <div className="flex flex-col items-center">
                   <div className="relative w-28 h-28 border-4 border-[#2B4C7E] rounded-full overflow-hidden bg-gray-50">
                     {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-gray-200" />}
                   </div>
                   <div className="flex gap-2 mt-3">
                     <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2 bg-[#2B4C7E] text-white rounded-full"><Camera size={18} /></button>
                     <button type="button" onClick={() => galleryInputRef.current?.click()} className="p-2 bg-[#F9B115] text-[#2B4C7E] rounded-full"><Upload size={18} /></button>
                   </div>
                   <input type="file" ref={cameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                   <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                 </div>
                 <input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="NOME COMPLETO" />
                 <div className="grid grid-cols-2 gap-4">
                   <select name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}>{blocosDisponiveis.map(b => <option key={b}>{b}</option>)}</select>
                   <select name="tipo" value={formData.tipo} onChange={handleInputChange} className={inputStyles}>{cargos.map(c => <option key={c}>{c}</option>)}</select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <input name="apto" value={formData.apto} onChange={handleInputChange} className={inputStyles} placeholder="APTO" />
                   <input required name="celular" value={formData.celular} onChange={handleInputChange} className={inputStyles} placeholder="WHATSAPP" />
                 </div>
                 <button type="submit" disabled={loading} className="btn-arena w-full py-4 rounded-2xl font-arena text-2xl">{loading ? <Loader2 className="animate-spin mx-auto" /> : "CADASTRAR"}</button>
               </form>
             )}
          </div>
        )}

        {view === ViewMode.PHOTOS && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-4 border-[#F9B115] shadow-lg">
              <div>
                <h2 className="text-3xl font-arena text-[#2B4C7E]">MURAL DA FOLIA</h2>
                <p className="text-[10px] font-black uppercase text-gray-400">Poste as fotos do seu bloco aqui!</p>
              </div>
              <button 
                onClick={() => muralUploadRef.current?.click()} 
                className="btn-arena px-6 py-3 rounded-xl flex items-center gap-2 font-arena"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><PlusCircle size={20} /> POSTAR</>}
              </button>
              <input type="file" ref={muralUploadRef} accept="image/*" className="hidden" onChange={handleMuralUpload} />
            </div>

            {eventPhotos.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <ImageIcon size={64} className="mx-auto mb-4" />
                <p className="font-arena text-2xl">MURAL VAZIO. SEJA O PRIMEIRO!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {eventPhotos.map(p => (
                  <div key={p.id} className="arena-card overflow-hidden bg-white group hover:scale-[1.02] transition-transform">
                    <div className="aspect-square relative">
                      <img src={p.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => handleDownloadPhoto(p.url, p.id)} className="p-3 bg-white text-[#2B4C7E] rounded-full"><Download size={24} /></button>
                        <button onClick={() => handleSharePhoto(p.url)} className="p-3 bg-[#25D366] text-white rounded-full"><Share2 size={24} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === ViewMode.LIST && (
           <div className="space-y-6 animate-fadeIn">
              <div className="flex gap-4">
                <div className="flex-grow bg-white p-3 rounded-2xl border-4 border-[#2B4C7E] flex items-center gap-3">
                  <Search className="text-[#2B4C7E]" />
                  <input placeholder="PESQUISAR..." className="w-full outline-none font-bold" onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-2xl border-2 border-[#2B4C7E] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-[#2B4C7E] overflow-hidden">
                      {m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-200" />}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-arena text-lg leading-none">{m.nome}</h4>
                      <span className="text-[9px] font-black uppercase text-[#F9B115]">{m.bloco}</span>
                    </div>
                    <div className="flex gap-2">
                       <a href={`https://wa.me/55${m.celular.replace(/\D/g,'')}`} target="_blank" className="p-2 bg-green-500 text-white rounded-full"><MessageCircle size={16} /></a>
                       <button onClick={() => initiateRemoveMember(m.id)} className="p-2 bg-red-100 text-red-600 rounded-full"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {view === ViewMode.STATISTICS && (
           <div className="space-y-8 animate-fadeIn">
              <div className="arena-card p-6 text-center">
                 <h2 className="text-6xl font-arena text-[#2B4C7E]">{stats.total}</h2>
                 <p className="font-black uppercase text-xs text-gray-400">Total de Foliões</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="arena-card p-6">
                    <h3 className="font-arena text-xl mb-4">BLOCOS</h3>
                    {stats.byBloco.map(([n, c]) => (
                      <div key={n} className="mb-2">
                        <div className="flex justify-between text-[10px] font-black"><span>{n}</span><span>{c}</span></div>
                        <div className="h-2 bg-gray-100 rounded-full"><div className="h-full bg-[#2B4C7E] rounded-full" style={{width: `${(c/stats.total)*100}%`}}></div></div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        )}
      </main>

      {/* Modal de Senha */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="arena-card w-full max-w-sm bg-white p-8">
            <h3 className="font-arena text-xl mb-4 text-center">ÁREA RESTRITA</h3>
            <input 
              type="password" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)}
              className={inputStyles}
              placeholder="SENHA"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleConfirmPassword()}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setIsPasswordModalOpen(false)} className="flex-grow py-2 border-2 rounded-xl font-bold uppercase text-xs">Sair</button>
              <button onClick={handleConfirmPassword} className="btn-arena flex-grow py-2 rounded-xl font-arena">Entrar</button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center ${view === ViewMode.HOME ? 'text-[#F9B115]' : 'opacity-60'}`}><Home size={24} /><span className="text-[8px] font-bold">INÍCIO</span></button>
          <button onClick={() => setView(ViewMode.REGISTER)} className={`flex flex-col items-center ${view === ViewMode.REGISTER ? 'text-[#F9B115]' : 'opacity-60'}`}><UserPlus size={24} /><span className="text-[8px] font-bold">CADASTRO</span></button>
          <button onClick={() => setView(ViewMode.PHOTOS)} className={`flex flex-col items-center ${view === ViewMode.PHOTOS ? 'text-[#F9B115]' : 'opacity-60'}`}><ImageIcon size={24} /><span className="text-[8px] font-bold">MURAL</span></button>
          <button onClick={initiateViewList} className={`flex flex-col items-center ${view === ViewMode.LIST ? 'text-[#F9B115]' : 'opacity-60'}`}><Users size={24} /><span className="text-[8px] font-bold">LISTA</span></button>
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
