
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Member, ViewMode, EventPhoto } from './types';
import { databaseService } from './services/databaseService';
import { findFaceMatches } from './services/geminiService';
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
  X,
  BarChart3,
  Image as ImageIcon,
  Download,
  Share2,
  Upload,
  PlusCircle,
  ScanFace,
  RefreshCcw,
  CheckSquare,
  Square,
  CheckCheck,
  AlertCircle,
  ShieldCheck,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Music4
} from 'lucide-react';

// Componente de Logo SVG para garantir que sempre carregue
const ArenaLogo = () => (
  <div className="relative w-16 h-16 md:w-24 md:h-24 flex items-center justify-center bg-[#F9B115] rounded-full border-4 border-[#2B4C7E] shadow-lg transform -rotate-6">
    <Music4 size={40} className="text-[#2B4C7E] md:hidden" />
    <Music4 size={60} className="text-[#2B4C7E] hidden md:block" />
    <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#C63D2F] rounded-full border-2 border-white animate-bounce"></div>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [blocoFilter, setBlocoFilter] = useState('');
  const [cargoFilter, setCargoFilter] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  
  const [faceSearchRef, setFaceSearchRef] = useState<string | null>(null);
  const [matchedPhotoIds, setMatchedPhotoIds] = useState<string[] | null>(null);
  const [isFacialSearching, setIsFacialSearching] = useState(false);

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<EventPhoto | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordPurpose, setPasswordPurpose] = useState<'DELETE' | 'VIEW_LIST' | 'VIEW_STATS' | 'DELETE_PHOTO' | 'DELETE_PHOTOS_BATCH' | null>(null);
  const [memberIdToDelete, setMemberIdToDelete] = useState<string | null>(null);
  const [photoIdToDelete, setPhotoIdToDelete] = useState<string | null>(null);
  
  const defaultFormData = {
    nome: '',
    bloco: '', 
    tipo: 'FOLIÃO',
    apto: '',
    celular: '',
    photo: '' as string | undefined
  };

  const [formData, setFormData] = useState(defaultFormData);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const muralUploadRef = useRef<HTMLInputElement>(null);
  const faceSearchInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => setInfoMessage(msg);

  const compressImage = (base64Str: string, quality = 0.6, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const loadData = async () => {
    setFetching(true);
    try {
      const [membersData, photosData] = await Promise.all([
        databaseService.getMembers(),
        databaseService.getEventPhotos()
      ]);
      setMembers(membersData || []);
      setEventPhotos(photosData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
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
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 0.4, 300);
        setFormData(prev => ({ ...prev, photo: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.celular || !formData.bloco || !formData.apto) {
      notify("Preencha Nome, Bloco, Apto e Celular!");
      return;
    }
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
      notify("Erro ao salvar o cadastro.");
    } finally {
      setLoading(false);
      setFormData(defaultFormData);
    }
  };

  const handleConfirmPassword = async () => {
    if (passwordInput.toUpperCase() === 'GARRINCHA') {
      if (passwordPurpose === 'DELETE' && memberIdToDelete) {
        await databaseService.deleteMember(memberIdToDelete);
        setMembers(prev => prev.filter(m => m.id !== memberIdToDelete));
      } else if (passwordPurpose === 'VIEW_LIST') {
        setView(ViewMode.LIST);
      } else if (passwordPurpose === 'VIEW_STATS') {
        setView(ViewMode.STATISTICS);
      }
      setIsPasswordModalOpen(false);
    } else { 
      notify('SENHA INCORRETA!'); 
    }
    setPasswordInput('');
  };

  const handleMuralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLoading(true);
      try {
        // Fix: Added explicit type cast to File[] for Array.from(files) to ensure 'file' is recognized as a Blob/File
        for (const file of Array.from(files) as File[]) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((res) => {
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(file);
          });
          const compressed = await compressImage(base64, 0.3, 500);
          const newPhoto: EventPhoto = { id: Math.random().toString(36).substring(7), url: compressed, createdAt: Date.now() };
          await databaseService.addEventPhoto(newPhoto);
          setEventPhotos(prev => [newPhoto, ...prev]);
        }
        notify("Fotos enviadas!");
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredMuralPhotos = useMemo(() => {
    if (matchedPhotoIds === null) return eventPhotos;
    return eventPhotos.filter(p => matchedPhotoIds.includes(p.id));
  }, [eventPhotos, matchedPhotoIds]);

  const stats = useMemo(() => {
    const byBloco: Record<string, number> = {};
    members.forEach(m => byBloco[m.bloco] = (byBloco[m.bloco] || 0) + 1);
    return {
      byBloco: Object.entries(byBloco).sort((a,b) => b[1]-a[1]),
      total: members.length
    };
  }, [members]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all placeholder:opacity-30";
  const blocosDisponiveis = ['ARENA 1', 'ARENA 2', 'ARENA 3', 'ARENA 4', 'CONVIDADO'];
  const cargosDisponiveis = ['FOLIÃO', 'BATERIA', 'DIRETORIA', 'APOIO'];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-6 md:py-8 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView(ViewMode.HOME)}>
            <ArenaLogo />
            <div className="flex flex-col text-left">
              <h1 className="text-2xl md:text-5xl font-arena tracking-tighter leading-tight">
                DEIXA O <span className="text-[#F9B115]">ARENA ME LEVAR</span>
              </h1>
              <div className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-80 -mt-1">
                Carnaval <span className="text-[#F9B115]">2026</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-8">
        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn mt-6">
            <button onClick={() => setView(ViewMode.REGISTER)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#2B4C7E]"><UserPlus size={40} className="text-[#2B4C7E]" /></div>
              <h2 className="text-3xl font-arena text-[#2B4C7E]">CADASTRO</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Inscrição de Membros</p>
            </button>
            <button onClick={() => setView(ViewMode.PHOTOS)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#F9B115]"><ImageIcon size={40} className="text-[#F9B115]" /></div>
              <h2 className="text-3xl font-arena text-[#F9B115]">MURAL</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Fotos da Folia</p>
            </button>
          </div>
        )}

        {view === ViewMode.REGISTER && (
          <div className="max-w-xl mx-auto arena-card overflow-hidden bg-white animate-slideUp">
             <div className="bg-[#2B4C7E] p-6 text-center text-white border-b-4 border-[#F9B115]">
               <h2 className="text-3xl font-arena">FICHA DE MEMBRO</h2>
               <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Preencha os dados obrigatórios</p>
             </div>
             {isRegistered ? (
               <div className="p-10 text-center animate-fadeIn">
                 <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500"><Trophy size={48} className="text-green-600" /></div>
                 <h3 className="text-3xl font-arena text-[#2B4C7E] mb-2">CADASTRO OK!</h3>
                 <button onClick={() => setIsRegistered(false)} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl uppercase">CADASTRAR OUTRO</button>
               </div>
             ) : (
               <form onSubmit={handleSubmit} className="p-8 space-y-6">
                 <div className="flex flex-col items-center mb-4">
                   <div className="relative group">
                     <div className="w-32 h-32 border-4 border-[#2B4C7E] rounded-3xl overflow-hidden bg-gray-50 shadow-inner rotate-3 transition-transform group-hover:rotate-0">
                       {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-8 text-gray-200" />}
                     </div>
                     <div className="absolute -bottom-3 -right-3 flex gap-2">
                       <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-3 bg-[#2B4C7E] text-white rounded-2xl border-2 border-white shadow-lg"><Camera size={20} /></button>
                     </div>
                   </div>
                   <input type="file" ref={cameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                   <p className="text-[9px] font-black text-gray-400 mt-6 uppercase tracking-widest">Sua selfie ajuda no reconhecimento facial</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1 tracking-widest">Nome Completo</label>
                      <input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="NOME DO FOLIÃO" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1 tracking-widest">Bloco</label>
                        <select required name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}>
                          <option value="">SELECIONE</option>
                          {blocosDisponiveis.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1 tracking-widest">Apto</label>
                        <input required name="apto" value={formData.apto} onChange={handleInputChange} className={inputStyles} placeholder="Nº APTO" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1 tracking-widest">WhatsApp / Celular</label>
                      <input required name="celular" value={formData.celular} onChange={handleInputChange} className={inputStyles} placeholder="(00) 00000-0000" />
                    </div>
                 </div>

                 <button type="submit" disabled={loading} className="btn-arena w-full py-5 rounded-2xl font-arena text-2xl flex items-center justify-center gap-3">
                   {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={28} /> CONFIRMAR</>}
                 </button>
               </form>
             )}
          </div>
        )}

        {view === ViewMode.PHOTOS && (
          <div className="space-y-6 animate-fadeIn pb-24">
            <div className="bg-white p-6 rounded-3xl border-4 border-[#F9B115] flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-arena text-[#2B4C7E]">MURAL DA FOLIA</h2>
              <div className="flex gap-2">
                <button onClick={() => muralUploadRef.current?.click()} className="btn-arena px-6 py-3 rounded-xl flex items-center gap-2 font-arena">
                  <PlusCircle size={20} /> POSTAR FOTO
                </button>
              </div>
              <input type="file" ref={muralUploadRef} accept="image/*" className="hidden" onChange={handleMuralUpload} multiple />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMuralPhotos.map(p => (
                <div key={p.id} className="arena-card overflow-hidden bg-white group cursor-pointer" onClick={() => setViewingPhoto(p)}>
                  <div className="aspect-square relative">
                    <img src={p.url} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="arena-card w-full max-w-sm bg-white p-8 animate-slideUp">
            <h3 className="font-arena text-2xl mb-4 text-center text-[#2B4C7E]">ADMINISTRAÇÃO</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={inputStyles} placeholder="SENHA" autoFocus onKeyDown={e => e.key === 'Enter' && handleConfirmPassword()} />
            <button onClick={handleConfirmPassword} className="btn-arena w-full py-3 rounded-xl font-arena text-lg uppercase mt-4">Entrar</button>
            <button onClick={() => setIsPasswordModalOpen(false)} className="w-full py-3 text-[10px] font-black uppercase text-gray-400 mt-2">Cancelar</button>
          </div>
        </div>
      )}

      {infoMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 animate-fadeIn">
          <div className="bg-white border-4 border-[#2B4C7E] rounded-[2rem] p-8 text-center max-w-xs w-full">
            <AlertCircle size={48} className="text-[#C63D2F] mx-auto mb-4" />
            <p className="font-bold text-gray-600 mb-6">{infoMessage}</p>
            <button onClick={() => setInfoMessage(null)} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl">OK!</button>
          </div>
        </div>
      )}

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center ${view === ViewMode.HOME ? 'text-[#F9B115]' : 'opacity-50'}`}><Home size={24} /><span className="text-[7px] font-black mt-1 uppercase">Início</span></button>
          <button onClick={() => setView(ViewMode.REGISTER)} className={`flex flex-col items-center ${view === ViewMode.REGISTER ? 'text-[#F9B115]' : 'opacity-50'}`}><UserPlus size={24} /><span className="text-[7px] font-black mt-1 uppercase">Inscrição</span></button>
          <button onClick={() => setView(ViewMode.PHOTOS)} className={`flex flex-col items-center ${view === ViewMode.PHOTOS ? 'text-[#F9B115]' : 'opacity-50'}`}><ImageIcon size={24} /><span className="text-[7px] font-black mt-1 uppercase">Mural</span></button>
          <button onClick={() => { setPasswordPurpose('VIEW_LIST'); setIsPasswordModalOpen(true); }} className={`flex flex-col items-center ${view === ViewMode.LIST ? 'text-[#F9B115]' : 'opacity-50'}`}><Users size={24} /><span className="text-[7px] font-black mt-1 uppercase">Admin</span></button>
        </div>
      </nav>
    </div>
  );
};

export default App;
