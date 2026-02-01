
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
  Upload
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
  
  // Estados para acesso protegido
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordPurpose, setPasswordPurpose] = useState<'DELETE' | 'VIEW_LIST' | 'VIEW_STATS' | 'VIEW_PHOTOS' | null>(null);
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

  const initiateViewPhotos = () => {
    setPasswordPurpose('VIEW_PHOTOS');
    setPasswordInput('');
    setIsPasswordModalOpen(true);
  };

  const handleConfirmPassword = async () => {
    if (passwordInput.toUpperCase() === 'GARRINCHA') {
      if (passwordPurpose === 'DELETE') {
        if (!memberIdToDelete) return;
        try {
          await databaseService.deleteMember(memberIdToDelete);
          setMembers(prev => prev.filter(m => m.id !== memberIdToDelete));
          setIsPasswordModalOpen(false);
          setMemberIdToDelete(null);
          setPasswordInput('');
        } catch (error: any) {
          alert(`Erro ao excluir: ${error.message}`);
        }
      } else if (passwordPurpose === 'VIEW_LIST') {
        setView(ViewMode.LIST);
        setIsPasswordModalOpen(false);
        setPasswordInput('');
      } else if (passwordPurpose === 'VIEW_STATS') {
        setView(ViewMode.STATISTICS);
        setIsPasswordModalOpen(false);
        setPasswordInput('');
      } else if (passwordPurpose === 'VIEW_PHOTOS') {
        setView(ViewMode.PHOTOS);
        setIsPasswordModalOpen(false);
        setPasswordInput('');
      }
    } else {
      alert('SENHA INCORRETA! ACESSO NEGADO.');
      setPasswordInput('');
    }
  };

  const handleDownloadPhoto = (m: Member) => {
    if (!m.photo) return;
    const link = document.createElement('a');
    link.href = m.photo;
    link.download = `foto_${m.nome.replace(/\s+/g, '_').toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSharePhoto = async (m: Member) => {
    if (!m.photo) return;
    
    try {
      const res = await fetch(m.photo);
      const blob = await res.blob();
      const file = new File([blob], `${m.nome}_carnaval.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Folia 2026',
          text: `Olha a foto do(a) ${m.nome} no ${m.bloco}! 🎉`,
        });
      } else {
        const text = encodeURIComponent(`Olha a foto de ${m.nome} no ${m.bloco}! (Baixe a foto no app para enviar o arquivo)`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      alert("Não foi possível compartilhar diretamente. Tente baixar a foto primeiro.");
    }
  };

  const filteredMembers = useMemo(() => 
    members.filter(m => {
      const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = filterTipo === '' || m.tipo === filterTipo;
      return matchesSearch && matchesTipo;
    }), 
  [members, searchTerm, filterTipo]);

  const membersWithPhotos = useMemo(() => 
    filteredMembers.filter(m => m.photo),
  [filteredMembers]);

  const stats = useMemo(() => {
    const byBloco: Record<string, number> = {};
    const byCargo: Record<string, number> = {};
    
    members.forEach(m => {
      byBloco[m.bloco] = (byBloco[m.bloco] || 0) + 1;
      byCargo[m.tipo] = (byCargo[m.tipo] || 0) + 1;
    });

    const sortedByBloco = Object.entries(byBloco).sort((a, b) => b[1] - a[1]);
    const sortedByCargo = Object.entries(byCargo).sort((a, b) => b[1] - a[1]);
    
    return {
      byBloco: sortedByBloco,
      byCargo: sortedByCargo,
      total: members.length
    };
  }, [members]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all";
  const cargos = ['FOLIÃO', 'BATERIA', 'DIRETORIA', 'RAINHA', 'DESTAQUE'];
  const blocosDisponiveis = ['BLOCO 1', 'BLOCO 2', 'BLOCO 3', 'BLOCO 4', 'BLOCO 5', 'BLOCO 6', 'BLOCO 7', 'BLOCO 8','CONVIDADO'];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-6 md:py-10 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="text-center flex flex-col items-center">
            <h1 className="text-3xl md:text-5xl font-arena tracking-tighter">
              CADASTRO <span className="text-[#F9B115]">DA FOLIA</span>
            </h1>
            
            <div className="mt-3 flex items-center gap-2 px-4 py-1.5 bg-black/20 rounded-full border border-white/10 w-fit animate-fadeIn">
              {syncStatus === 'synced' && (
                <>
                  <DatabaseZap size={14} className="text-green-400" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Online</span>
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
            <button onClick={initiateViewList} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#C63D2F]">
                <Users size={40} className="text-[#C63D2F]" />
              </div>
              <h2 className="text-3xl font-arena text-[#C63D2F]">GERENCIAR</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Lista de Membros</p>
            </button>
            <button onClick={initiateViewPhotos} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#2B4C7E]">
                <ImageIcon size={40} className="text-[#2B4C7E]" />
              </div>
              <h2 className="text-3xl font-arena text-[#2B4C7E]">GALERIA</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Fotos dos Foliões</p>
            </button>
            <button onClick={initiateViewStats} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#F9B115]">
                <BarChart3 size={40} className="text-[#F9B115]" />
              </div>
              <h2 className="text-3xl font-arena text-[#F9B115]">ESTATÍSTICAS</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Análise de Membros</p>
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
                    <div className="w-32 h-32 rounded-full border-4 border-[#2B4C7E] bg-gray-50 flex items-center justify-center overflow-hidden">
                      {formData.photo ? (
                        <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-gray-300" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => cameraInputRef.current?.click()} 
                        className="bg-[#2B4C7E] text-white p-3 rounded-full shadow-lg hover:bg-[#C63D2F] transition-colors border-2 border-white"
                        title="Tirar Foto"
                      >
                        <Camera size={20} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => galleryInputRef.current?.click()} 
                        className="bg-[#F9B115] text-[#2B4C7E] p-3 rounded-full shadow-lg hover:bg-white transition-colors border-2 border-white"
                        title="Enviar da Galeria"
                      >
                        <Upload size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sua foto de Folião</p>
                  
                  {/* Input oculto para Câmera */}
                  <input 
                    type="file" 
                    ref={cameraInputRef} 
                    accept="image/*" 
                    capture="user" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  
                  {/* Input oculto para Galeria/Upload */}
                  <input 
                    type="file" 
                    ref={galleryInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>

                <input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="NOME COMPLETO" />
                
                <div className="grid grid-cols-2 gap-4">
                  <select name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}>
                    {blocosDisponiveis.map(b => <option key={b} value={b}>{b}</option>)}
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
                      
                      <div className="flex flex-row items-center justify-between md:grid md:grid-cols-3 gap-4 w-full border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
                        <div className="flex flex-row gap-6 md:contents">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase">Apto</span>
                            <span className="font-bold text-[#2B4C7E] text-sm">{m.apto || '-'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase">WhatsApp</span>
                            <span className="font-bold text-[#2B4C7E] text-xs">{m.celular}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 md:col-start-3">
                          <a href={`https://wa.me/55${m.celular.replace(/\D/g,'')}`} target="_blank" className="p-2 bg-green-500 text-white rounded-full hover:scale-110 transition-transform"><MessageCircle size={16} /></a>
                          <button onClick={() => initiateRemoveMember(m.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {view === ViewMode.PHOTOS && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow bg-white p-3 rounded-2xl border-4 border-[#2B4C7E] flex items-center gap-3 shadow-sm">
                <Search className="text-[#2B4C7E]" />
                <input placeholder="BUSCAR POR NOME..." className="w-full outline-none font-bold text-[#2B4C7E]" onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            {membersWithPhotos.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <ImageIcon size={64} className="mx-auto mb-4" />
                <p className="font-arena text-2xl uppercase">Nenhuma foto encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {membersWithPhotos.map(m => (
                  <div key={m.id} className="arena-card overflow-hidden bg-white group hover:scale-[1.02] transition-transform">
                    <div className="aspect-square w-full relative">
                      <img src={m.photo} className="w-full h-full object-cover" alt={m.nome} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={() => handleDownloadPhoto(m)}
                          className="p-3 bg-white text-[#2B4C7E] rounded-full hover:bg-[#F9B115] transition-colors"
                          title="Baixar Foto"
                        >
                          <Download size={24} />
                        </button>
                        <button 
                          onClick={() => handleSharePhoto(m)}
                          className="p-3 bg-[#25D366] text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                          title="Enviar p/ WhatsApp"
                        >
                          <Share2 size={24} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border-t-2 border-[#2B4C7E]">
                      <h4 className="font-arena text-lg text-[#2B4C7E] truncate">{m.nome}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-black bg-[#F9B115] px-2 py-0.5 rounded uppercase">{m.bloco}</span>
                        <div className="flex gap-2">
                           <button onClick={() => handleDownloadPhoto(m)} className="sm:hidden p-1 text-[#2B4C7E]"><Download size={18} /></button>
                           <button onClick={() => handleSharePhoto(m)} className="sm:hidden p-1 text-[#25D366]"><Share2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === ViewMode.STATISTICS && (
          <div className="space-y-8 animate-fadeIn">
            <div className="arena-card p-6 bg-white text-center">
              <div className="w-16 h-16 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-[#2B4C7E]">
                <Users size={32} className="text-[#2B4C7E]" />
              </div>
              <h2 className="text-5xl font-arena text-[#2B4C7E]">{stats.total}</h2>
              <p className="font-bold text-gray-400 uppercase text-xs tracking-[0.2em]">Foliões Cadastrados</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="arena-card p-6 bg-white">
                <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-3">
                  <BarChart3 className="text-[#2B4C7E]" />
                  <h3 className="font-arena text-xl text-[#2B4C7E]">POR BLOCO</h3>
                </div>
                <div className="space-y-4">
                  {stats.byBloco.length === 0 ? (
                    <p className="text-center py-10 text-gray-300 font-bold text-xs">SEM DADOS</p>
                  ) : (
                    stats.byBloco.map(([name, count]) => {
                      const percentage = (count / stats.total) * 100;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-[#2B4C7E] uppercase">{name}</span>
                            <span className="text-[10px] font-black text-gray-400">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                            <div 
                              className="h-full bg-[#2B4C7E] rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="arena-card p-6 bg-white">
                <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-3">
                  <PieChart className="text-[#C63D2F]" />
                  <h3 className="font-arena text-xl text-[#C63D2F]">POR CARGO</h3>
                </div>
                <div className="space-y-4">
                  {stats.byCargo.length === 0 ? (
                    <p className="text-center py-10 text-gray-300 font-bold text-xs">SEM DADOS</p>
                  ) : (
                    stats.byCargo.map(([name, count]) => {
                      const percentage = (count / stats.total) * 100;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-[#C63D2F] uppercase">{name}</span>
                            <span className="text-[10px] font-black text-gray-400">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                            <div 
                              className="h-full bg-[#C63D2F] rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Senha para Ações Protegidas */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="arena-card w-full max-w-sm bg-white overflow-hidden animate-slideUp">
            <div className={`${passwordPurpose === 'DELETE' ? 'bg-[#C63D2F]' : passwordPurpose === 'VIEW_STATS' ? 'bg-[#F9B115]' : 'bg-[#2B4C7E]'} p-4 flex justify-between items-center text-white`}>
              <h3 className="font-arena text-xl flex items-center gap-2 text-white">
                <Lock size={20} /> 
                {passwordPurpose === 'DELETE' ? 'EXCLUSÃO RESTRITA' : 
                 passwordPurpose === 'VIEW_STATS' ? 'ESTATÍSTICAS RESTRITAS' : 
                 passwordPurpose === 'VIEW_PHOTOS' ? 'GALERIA RESTRITA' :
                 'ACESSO RESTRITO'}
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
                Informe a senha de administrador para continuar:
              </p>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmPassword()}
                autoFocus
                className={`${inputStyles} text-center tracking-widest`}
                placeholder="SENHA"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsPasswordModalOpen(false)} 
                  className="flex-grow py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-400 hover:bg-gray-50 transition-colors uppercase text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmPassword} 
                  className="btn-arena flex-grow py-3 rounded-xl font-arena text-lg"
                >
                  CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center text-[#2B4C7E]/40 text-[10px] font-black uppercase tracking-widest mt-auto">
        Desenvolvido por Maycon Dias
      </footer>

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center ${view === ViewMode.HOME ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <Home size={24} /> <span className="text-[10px] font-bold">INÍCIO</span>
          </button>
          <button onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }} className={`flex flex-col items-center ${view === ViewMode.REGISTER ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <UserPlus size={24} /> <span className="text-[10px] font-bold">CADASTRO</span>
          </button>
          <button onClick={() => { if(view !== ViewMode.LIST) initiateViewList(); }} className={`flex flex-col items-center ${view === ViewMode.LIST ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <Users size={24} /> <span className="text-[10px] font-bold">LISTA</span>
          </button>
          <button onClick={() => { if(view !== ViewMode.PHOTOS) initiateViewPhotos(); }} className={`flex flex-col items-center ${view === ViewMode.PHOTOS ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <ImageIcon size={24} /> <span className="text-[10px] font-bold">GALERIA</span>
          </button>
          <button onClick={() => { if(view !== ViewMode.STATISTICS) initiateViewStats(); }} className={`flex flex-col items-center ${view === ViewMode.STATISTICS ? 'text-[#F9B115]' : 'opacity-60'}`}>
            <BarChart3 size={24} /> <span className="text-[10px] font-bold">STATS</span>
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
