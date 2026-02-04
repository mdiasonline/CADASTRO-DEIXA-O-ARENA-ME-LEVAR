
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Member, ViewMode, EventPhoto, Sponsor, AppUser } from './types';
import { databaseService } from './services/databaseService';
import { findFaceMatches } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
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
  Handshake,
  Store,
  Pencil,
  Sparkles,
  Info,
  ExternalLink,
  PieChart,
  TrendingUp,
  LayoutGrid,
  CloudDownload,
  CloudUpload,
  FileJson,
  LogIn,
  LogOut,
  ShieldAlert,
  KeyRound,
  Mail,
  UserCog
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [platformUsers, setPlatformUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [blocoFilter, setBlocoFilter] = useState('');
  const [cargoFilter, setCargoFilter] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ nome: '', email: '', senha: '' });

  // Estados para Busca Facial
  const [faceSearchRef, setFaceSearchRef] = useState<string | null>(null);
  const [matchedPhotoIds, setMatchedPhotoIds] = useState<string[] | null>(null);
  const [isFacialSearching, setIsFacialSearching] = useState(false);

  // Estados para Seleção e Visualização
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<EventPhoto | null>(null);
  const [viewingSponsor, setViewingSponsor] = useState<Sponsor | null>(null);
  
  // Estados para Notificação Customizada
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordPurpose, setPasswordPurpose] = useState<'DELETE' | 'VIEW_LIST' | 'VIEW_STATS' | 'DELETE_PHOTO' | 'DELETE_PHOTOS_BATCH' | 'ADD_SPONSOR' | 'EDIT_SPONSOR' | 'DELETE_SPONSOR' | 'IMPORT_BACKUP_REQUEST' | 'EXPORT_BACKUP' | null>(null);
  const [memberIdToDelete, setMemberIdToDelete] = useState<string | null>(null);
  const [photoIdToDelete, setPhotoIdToDelete] = useState<string | null>(null);
  const [sponsorIdToDelete, setSponsorIdToDelete] = useState<string | null>(null);
  const [sponsorIdToEdit, setSponsorIdToEdit] = useState<string | null>(null);
  
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [sponsorLogoScale, setSponsorLogoScale] = useState(1);

  const defaultFormData = {
    nome: '',
    bloco: '', 
    tipo: 'FOLIÃO',
    apto: '',
    celular: '',
    photo: '' as string | undefined
  };

  const defaultSponsorFormData = {
    nome: '',
    atuacao: '',
    telefone: '',
    descricao: '',
    logo: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [sponsorFormData, setSponsorFormData] = useState(defaultSponsorFormData);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const muralUploadRef = useRef<HTMLInputElement>(null);
  const faceSearchInputRef = useRef<HTMLInputElement>(null);
  const sponsorLogoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    setInfoMessage(msg);
  };

  const loadData = async () => {
    setFetching(true);
    try {
      const [membersData, photosData, sponsorsData] = await Promise.all([
        databaseService.getMembers(),
        databaseService.getEventPhotos(),
        databaseService.getSponsors()
      ]);
      setMembers(membersData || []);
      setEventPhotos(photosData || []);
      setSponsors(sponsorsData || []);
      
      if (currentUser?.isAdmin) {
        const users = await databaseService.getUsers().catch(() => []);
        setPlatformUsers(users);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
    const saved = sessionStorage.getItem('arena_session');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        sessionStorage.removeItem('arena_session');
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.email || !authForm.senha) return notify("E-mail e senha são obrigatórios.");
    
    setLoading(true);
    try {
      // Tenta buscar usuários, com fallback para array vazio se der erro no banco
      let users: AppUser[] = [];
      try {
        users = await databaseService.getUsers();
      } catch (dbErr) {
        console.warn("Erro ao buscar usuários do banco, assumindo primeiro acesso.", dbErr);
        users = [];
      }
      
      if (isLoginMode) {
        const user = users.find(u => u.email.toLowerCase() === authForm.email.toLowerCase() && u.senha === authForm.senha);
        if (user) {
          setCurrentUser(user);
          sessionStorage.setItem('arena_session', JSON.stringify(user));
          setView(ViewMode.HOME);
          notify(`Olá de novo, ${user.nome}!`);
        } else {
          notify("E-mail ou senha incorretos.");
        }
      } else {
        // Modo Cadastro
        if (!authForm.nome) return notify("Informe seu nome completo.");
        
        const emailExists = users.some(u => u.email.toLowerCase() === authForm.email.toLowerCase());
        if (emailExists) return notify("Este e-mail já está em uso.");
        
        const isFirst = users.length === 0;
        const newUser: AppUser = {
          id: Math.random().toString(36).substring(7),
          nome: authForm.nome,
          email: authForm.email.toLowerCase(),
          senha: authForm.senha,
          isAdmin: isFirst,
          createdAt: Date.now()
        };
        
        try {
          await databaseService.addUser(newUser);
          setCurrentUser(newUser);
          sessionStorage.setItem('arena_session', JSON.stringify(newUser));
          setView(ViewMode.HOME);
          notify(isFirst ? "Administrador criado com sucesso!" : "Cadastro realizado!");
        } catch (addErr) {
          console.error("Erro ao adicionar usuário no banco:", addErr);
          notify("Erro ao salvar cadastro. Tente novamente.");
        }
      }
    } catch (err) {
      console.error("Erro geral no processamento de Auth:", err);
      notify("Erro no processamento da autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('arena_session');
    setView(ViewMode.HOME);
    notify("Você saiu da sessão.");
  };

  const toggleUserAdmin = async (user: AppUser) => {
    if (user.id === currentUser?.id) return notify("Você não pode alterar seu próprio privilégio.");
    const updated = { ...user, isAdmin: !user.isAdmin };
    try {
      await databaseService.updateUser(updated);
      setPlatformUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      notify(`${user.nome} agora é ${updated.isAdmin ? 'Administrador' : 'Membro'}`);
    } catch (e) {
      notify("Erro ao atualizar privilégios.");
    }
  };

  const deletePlatformUser = async (id: string) => {
    if (id === currentUser?.id) return notify("Não é possível remover a si mesmo.");
    if (!confirm("Remover este usuário permanentemente?")) return;
    try {
      await databaseService.deleteUser(id);
      setPlatformUsers(prev => prev.filter(u => u.id !== id));
      notify("Usuário removido.");
    } catch (e) {
      notify("Erro ao remover usuário.");
    }
  };

  // Importar Backup
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          setLoading(true);
          
          if (data.members && Array.isArray(data.members)) {
            for (const m of data.members) await databaseService.addMember(m);
          }
          if (data.eventPhotos && Array.isArray(data.eventPhotos)) {
            for (const p of data.eventPhotos) await databaseService.addEventPhoto(p);
          }
          if (data.sponsors && Array.isArray(data.sponsors)) {
            for (const s of data.sponsors) await databaseService.addSponsor(s);
          }
          
          await loadData();
          notify("Dados importados!");
        } catch (err) {
          notify("Arquivo inválido.");
        } finally {
          setLoading(false);
          if (importInputRef.current) importInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  // Funções de Imagem
  const compressImage = (base64Str: string, quality = 0.6, maxWidth = 800, scale = 1): Promise<string> => {
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
        if (ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0)';
          ctx.fillRect(0, 0, width, height);
          const scaledW = width * scale;
          const scaledH = height * scale;
          const offsetX = (width - scaledW) / 2;
          const offsetY = (height - scaledH) / 2;
          ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
        }
        resolve(canvas.toDataURL('image/png', quality));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const processLogoBackground = async (base64Data: string): Promise<string> => {
    setIsProcessingLogo(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data.split(',')[1], mimeType: 'image/jpeg' } },
            { text: 'Remove the background of this logo. Return with transparent or white bg.' },
          ],
        },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
      return base64Data;
    } catch (error) { return base64Data; } finally { setIsProcessingLogo(false); }
  };

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

  const handleSponsorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSponsorFormData(prev => ({ ...prev, [name]: name === 'telefone' ? maskPhone(value) : value }));
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

  const handleSponsorLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result as string;
        setSponsorFormData(prev => ({ ...prev, logo: originalBase64 }));
        const processedLogo = await processLogoBackground(originalBase64);
        setSponsorFormData(prev => ({ ...prev, logo: processedLogo }));
        setSponsorLogoScale(1.1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMuralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLoading(true);
      const fileList = Array.from(files) as File[];
      const uploadedPhotos: EventPhoto[] = [];
      try {
        for (const file of fileList) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const compressed = await compressImage(base64, 0.3, 500);
          const newPhoto: EventPhoto = { id: Math.random().toString(36).substring(7), url: compressed, createdAt: Date.now() };
          await databaseService.addEventPhoto(newPhoto);
          uploadedPhotos.push(newPhoto);
        }
        setEventPhotos(prev => [...uploadedPhotos, ...prev]);
        notify(`${uploadedPhotos.length} fotos postadas!`);
      } catch (err) { notify("Erro no upload."); } finally { setLoading(false); if (muralUploadRef.current) muralUploadRef.current.value = ""; }
    }
  };

  const clearFaceFilter = () => { setMatchedPhotoIds(null); setFaceSearchRef(null); };
  const togglePhotoSelection = (id: string) => { setSelectedPhotoIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]); };
  const filteredMuralPhotos = useMemo(() => matchedPhotoIds === null ? eventPhotos : eventPhotos.filter(p => matchedPhotoIds.includes(p.id)), [eventPhotos, matchedPhotoIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.celular || !formData.bloco) return notify("Preencha os campos obrigatórios!");
    setLoading(true);
    const newMember: Member = { id: Math.random().toString(36).substring(7), ...formData, createdAt: Date.now() };
    try { await databaseService.addMember(newMember); setMembers(prev => [newMember, ...prev]); setIsRegistered(true); } catch (e) { notify("Erro ao salvar."); } finally { setLoading(false); setFormData(defaultFormData); }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorFormData.nome || !sponsorFormData.logo) return notify("Dados incompletos!");
    setLoading(true);
    try {
      const finalLogo = await compressImage(sponsorFormData.logo, 0.8, 400, sponsorLogoScale);
      if (sponsorIdToEdit) {
        const original = sponsors.find(s => s.id === sponsorIdToEdit);
        const updated = { ...sponsorFormData, id: sponsorIdToEdit, logo: finalLogo, createdAt: original?.createdAt || Date.now() };
        await databaseService.updateSponsor(updated);
        setSponsors(prev => prev.map(s => s.id === sponsorIdToEdit ? updated : s));
        setSponsorIdToEdit(null);
      } else {
        const newS = { id: Math.random().toString(36).substring(7), ...sponsorFormData, logo: finalLogo, createdAt: Date.now() };
        await databaseService.addSponsor(newS);
        setSponsors(prev => [newS, ...prev]);
      }
      setShowSponsorForm(false);
    } catch (e) { notify("Erro ao salvar parceiro."); } finally { setLoading(false); setSponsorFormData(defaultSponsorFormData); setSponsorLogoScale(1); }
  };

  const handleConfirmPassword = async () => {
    if (passwordInput.toUpperCase() === 'GARRINCHA') {
      if (passwordPurpose === 'DELETE' && memberIdToDelete) { await databaseService.deleteMember(memberIdToDelete); setMembers(prev => prev.filter(m => m.id !== memberIdToDelete)); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'DELETE_PHOTO' && photoIdToDelete) { await databaseService.deleteEventPhoto(photoIdToDelete); setEventPhotos(prev => prev.filter(p => p.id !== photoIdToDelete)); setIsPasswordModalOpen(false); setViewingPhoto(null); }
      else if (passwordPurpose === 'DELETE_PHOTOS_BATCH' && selectedPhotoIds.length > 0) { setLoading(true); for (const id of selectedPhotoIds) await databaseService.deleteEventPhoto(id); setEventPhotos(prev => prev.filter(p => !selectedPhotoIds.includes(p.id))); setSelectedPhotoIds([]); setIsSelectionMode(false); setIsPasswordModalOpen(false); setLoading(false); }
      else if (passwordPurpose === 'VIEW_LIST') { setView(ViewMode.LIST); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'VIEW_STATS') { setView(ViewMode.STATISTICS); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'ADD_SPONSOR') { setSponsorIdToEdit(null); setShowSponsorForm(true); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'EDIT_SPONSOR' && sponsorIdToEdit) { const s = sponsors.find(sp => sp.id === sponsorIdToEdit); if (s) setSponsorFormData({ nome: s.nome, atuacao: s.atuacao, telefone: s.telefone, descricao: s.descricao || '', logo: s.logo }); setShowSponsorForm(true); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'DELETE_SPONSOR' && sponsorIdToDelete) { await databaseService.deleteSponsor(sponsorIdToDelete); setSponsors(prev => prev.filter(s => s.id !== sponsorIdToDelete)); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'EXPORT_BACKUP') { setIsPasswordModalOpen(false); const b = { members, eventPhotos, sponsors }; const blob = new Blob([JSON.stringify(b)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click(); }
      else if (passwordPurpose === 'IMPORT_BACKUP_REQUEST') { setIsPasswordModalOpen(false); importInputRef.current?.click(); }
    } else { notify('SENHA INCORRETA!'); }
    setPasswordInput(''); setMemberIdToDelete(null); setPhotoIdToDelete(null); setSponsorIdToDelete(null);
  };

  const stats = useMemo(() => {
    const bB: Record<string, number> = {};
    members.forEach(m => { bB[m.bloco] = (bB[m.bloco] || 0) + 1; });
    const sB = Object.entries(bB).sort((a,b) => b[1]-a[1]);
    return { byBloco: sB, total: members.length };
  }, [members]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all placeholder:opacity-30";
  const filteredMembers = useMemo(() => members.filter(m => (!searchTerm || m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || m.bloco.toLowerCase().includes(searchTerm.toLowerCase())) && (!blocoFilter || m.bloco === blocoFilter) && (!cargoFilter || m.tipo === cargoFilter)), [members, searchTerm, blocoFilter, cargoFilter]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-6 md:py-8 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-2">
            <div className="invisible"><LogIn size={16}/></div>
            {currentUser ? (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={handleLogout}>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase opacity-60">Logado como</p>
                  <p className="text-[10px] font-bold text-[#F9B115]">{currentUser.nome}</p>
                </div>
                <LogOut size={16} className="text-[#F9B115] group-hover:scale-110 transition-transform"/>
              </div>
            ) : (
              <button onClick={() => setView(ViewMode.LOGIN)} className="text-[10px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5"><LogIn size={12}/> Entrar</button>
            )}
          </div>
          <div className="cursor-pointer" onClick={() => setView(ViewMode.HOME)}>
            <h1 className="text-2xl md:text-5xl font-arena tracking-tighter leading-tight text-center">
              DEIXA O <span className="text-[#F9B115]">ARENA ME LEVAR</span>
            </h1>
            <div className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-80 -mt-1 text-center">
              Carnaval <span className="text-[#F9B115]">2026</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-8">
        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn mt-6">
            <button onClick={() => setView(ViewMode.REGISTER)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#2B4C7E]"><UserPlus size={40} className="text-[#2B4C7E]" /></div>
              <h2 className="text-3xl font-arena text-[#2B4C7E]">NOVA INSCRIÇÃO</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Cadastro de Folião</p>
            </button>
            <button onClick={() => setView(ViewMode.PHOTOS)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#F9B115]"><ImageIcon size={40} className="text-[#F9B115]" /></div>
              <h2 className="text-3xl font-arena text-[#F9B115]">MURAL DE FOTOS</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Público - Veja e Poste!</p>
            </button>
            <button onClick={() => setView(ViewMode.SPONSORS)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#C63D2F]"><Handshake size={40} className="text-[#C63D2F]" /></div>
              <h2 className="text-3xl font-arena text-[#C63D2F]">PARCEIROS</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Nossos Patrocinadores</p>
            </button>
            <button onClick={() => setView(ViewMode.STATISTICS)} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#2B4C7E]"><BarChart3 size={40} className="text-[#2B4C7E]" /></div>
              <h2 className="text-3xl font-arena text-[#2B4C7E]">ESTATÍSTICAS</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Dados da Folia</p>
            </button>
            <button onClick={() => { setPasswordPurpose('VIEW_LIST'); setIsPasswordModalOpen(true); }} className="arena-card p-10 group bg-white text-center hover:scale-[1.02] transition-all md:col-span-2">
              <div className="w-20 h-20 bg-[#F9E7C7] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#C63D2F]"><Users size={40} className="text-[#C63D2F]" /></div>
              <h2 className="text-3xl font-arena text-[#C63D2F]">LISTA PRIVADA</h2>
              <p className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mt-2">Apenas com Senha</p>
            </button>
          </div>
        )}

        {view === ViewMode.LOGIN && (
          <div className="max-w-md mx-auto arena-card overflow-hidden animate-slideUp bg-white">
             <div className="bg-[#2B4C7E] p-6 text-center text-white border-b-4 border-[#F9B115]">
                <h2 className="text-3xl font-arena">{isLoginMode ? 'IDENTIFIQUE-SE' : 'NOVO CADASTRO'}</h2>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Acesso à Plataforma Arena</p>
             </div>
             <form onSubmit={handleAuth} className="p-8 space-y-5">
                {!isLoginMode && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1">Seu Nome Completo</label>
                    <input required value={authForm.nome} onChange={e => setAuthForm({...authForm, nome: e.target.value})} className={inputStyles} placeholder="NOME" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1">Seu E-mail</label>
                  <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className={inputStyles} placeholder="E-MAIL" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block px-1">Sua Senha</label>
                  <input type="password" required value={authForm.senha} onChange={e => setAuthForm({...authForm, senha: e.target.value})} className={inputStyles} placeholder="••••••" />
                </div>
                <button type="submit" disabled={loading} className="btn-arena w-full py-4 rounded-xl font-arena text-xl flex items-center justify-center gap-3">
                   {loading ? <Loader2 className="animate-spin" /> : <>{isLoginMode ? <LogIn size={20} /> : <UserPlus size={20} />} {isLoginMode ? 'ACESSAR' : 'REGISTRAR'}</>}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-[10px] font-black text-[#2B4C7E] uppercase hover:underline">
                    {isLoginMode ? 'Não tem conta? Clique para criar' : 'Já tem conta? Clique para entrar'}
                  </button>
                </div>
                <button type="button" onClick={() => setView(ViewMode.HOME)} className="w-full text-[9px] font-bold text-gray-300 uppercase mt-4">Continuar como Visitante</button>
             </form>
          </div>
        )}

        {view === ViewMode.USER_ADMIN && currentUser?.isAdmin && (
           <div className="space-y-6 animate-fadeIn pb-24">
              <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-4 border-[#C63D2F] shadow-lg">
                 <div className="bg-[#C63D2F] p-3 rounded-2xl text-white"><UserCog size={32} /></div>
                 <div>
                    <h2 className="text-2xl font-arena text-[#C63D2F]">GESTÃO DE ACESSOS</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400">Administradores da Plataforma</p>
                 </div>
              </div>

              <div className="grid gap-4">
                 {platformUsers.map(u => (
                   <div key={u.id} className="bg-white p-5 rounded-3xl border-2 border-gray-100 flex items-center justify-between gap-4 shadow-sm group">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.isAdmin ? 'bg-[#C63D2F] text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {u.isAdmin ? <ShieldAlert size={24} /> : <User size={24} />}
                         </div>
                         <div>
                            <p className="font-bold text-[#2B4C7E] uppercase text-sm leading-tight">{u.nome}</p>
                            <div className="flex items-center gap-2 opacity-60">
                               <Mail size={10}/>
                               <span className="text-[10px] font-bold">{u.email}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => toggleUserAdmin(u)} className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${u.isAdmin ? 'bg-[#F9B115] text-[#2B4C7E] border-[#2B4C7E]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                            {u.isAdmin ? 'Tornar Membro' : 'Tornar Admin'}
                         </button>
                         <button onClick={() => deletePlatformUser(u.id)} className="p-2 text-red-100 bg-red-600 rounded-xl hover:bg-red-700 transition-colors"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 ))}
                 {platformUsers.length === 0 && (
                   <div className="text-center py-20 opacity-20"><Users size={64} className="mx-auto mb-4"/><p className="font-arena text-2xl uppercase">Vazio</p></div>
                 )}
              </div>
              <button onClick={() => setView(ViewMode.STATISTICS)} className="btn-arena w-full py-4 rounded-xl font-arena text-xl uppercase">VOLTAR</button>
           </div>
        )}

        {/* ... Resto das views permanecem as mesmas (REGISTER, SPONSORS, PHOTOS, STATISTICS, LIST) ... */}
        {view === ViewMode.REGISTER && (
          <div className="max-w-xl mx-auto arena-card overflow-hidden bg-white animate-slideUp">
             <div className="bg-[#2B4C7E] p-6 text-center text-white border-b-4 border-[#F9B115]">
               <h2 className="text-3xl font-arena">FICHA DE INSCRIÇÃO</h2>
             </div>
             {isRegistered ? (
               <div className="p-10 text-center">
                 <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500"><Trophy size={48} className="text-green-600" /></div>
                 <h3 className="text-3xl font-arena text-[#2B4C7E] mb-2">SUCESSO!</h3>
                 <button onClick={() => setIsRegistered(false)} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl uppercase">NOVO CADASTRO</button>
               </div>
             ) : (
               <form onSubmit={handleSubmit} className="p-8 space-y-6">
                 <div className="flex flex-col items-center mb-4">
                   <div className="relative group">
                     <div className="w-32 h-32 border-4 border-[#2B4C7E] rounded-3xl overflow-hidden bg-gray-50 shadow-inner rotate-3">{formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-8 text-gray-200" />}</div>
                     <div className="absolute -bottom-3 -right-3 flex gap-2">
                       <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-3 bg-[#2B4C7E] text-white rounded-2xl border-2 border-white shadow-lg"><Camera size={20} /></button>
                       <button type="button" onClick={() => galleryInputRef.current?.click()} className="p-3 bg-[#F9B115] text-[#2B4C7E] rounded-2xl border-2 border-white shadow-lg"><Upload size={20} /></button>
                     </div>
                   </div>
                   <input type="file" ref={cameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                   <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                 </div>
                 <div className="space-y-4">
                    <input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="NOME DO FOLIÃO" />
                    <div className="grid grid-cols-2 gap-4">
                      <select required name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}><option value="">BLOCO</option>{['BLOCO 1','BLOCO 2','CONVIDADO'].map(b=><option key={b} value={b}>{b}</option>)}</select>
                      <select name="tipo" value={formData.tipo} onChange={handleInputChange} className={inputStyles}>{['FOLIÃO','DIRETORIA','APOIO'].map(c=><option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    <input required name="celular" value={formData.celular} onChange={handleInputChange} className={inputStyles} placeholder="WHATSAPP (00) 00000-0000" />
                 </div>
                 <button type="submit" disabled={loading} className="btn-arena w-full py-5 rounded-2xl font-arena text-2xl flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" /> : 'CONFIRMAR INSCRIÇÃO'}</button>
               </form>
             )}
          </div>
        )}

        {view === ViewMode.SPONSORS && (
          <div className="space-y-10 animate-fadeIn">
            <h2 className="text-3xl font-arena text-[#C63D2F] flex items-center gap-2"><Handshake size={32} /> PARCEIROS</h2>
            {showSponsorForm && (
              <form onSubmit={handleSponsorSubmit} className="arena-card p-8 bg-white space-y-6">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 border-4 border-[#C63D2F] rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer" onClick={() => sponsorLogoInputRef.current?.click()}>{sponsorFormData.logo ? <img src={sponsorFormData.logo} className="object-contain" /> : <ImageIcon size={32} />}</div>
                  <input type="file" ref={sponsorLogoInputRef} accept="image/*" className="hidden" onChange={handleSponsorLogoChange} />
                </div>
                <input required name="nome" value={sponsorFormData.nome} onChange={handleSponsorInputChange} className={inputStyles} placeholder="NOME" />
                <button type="submit" className="btn-arena w-full py-4 rounded-xl font-arena">SALVAR</button>
              </form>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sponsors.map(s => (
                <div key={s.id} onClick={() => setViewingSponsor(s)} className="arena-card p-6 bg-white flex flex-col items-center group relative">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); setSponsorIdToEdit(s.id); setPasswordPurpose('EDIT_SPONSOR'); setIsPasswordModalOpen(true); }} className="p-1 bg-blue-50 text-blue-600 rounded"><Pencil size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setSponsorIdToDelete(s.id); setPasswordPurpose('DELETE_SPONSOR'); setIsPasswordModalOpen(true); }} className="p-1 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button>
                  </div>
                  <img src={s.logo} className="w-24 h-24 object-contain mb-2" />
                  <h4 className="font-arena text-xl text-[#2B4C7E]">{s.nome}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === ViewMode.PHOTOS && (
          <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-4 border-[#F9B115]">
              <h2 className="text-2xl font-arena">MURAL</h2>
              <button onClick={() => muralUploadRef.current?.click()} className="btn-arena px-6 py-2 rounded-xl">POSTAR FOTO</button>
              <input type="file" ref={muralUploadRef} accept="image/*" className="hidden" onChange={handleMuralUpload} multiple />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredMuralPhotos.map(p => (
                <div key={p.id} onClick={() => setViewingPhoto(p)} className="arena-card overflow-hidden cursor-pointer">
                  <img src={p.url} className="w-full aspect-square object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === ViewMode.STATISTICS && (
           <div className="space-y-10 pb-24">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-arena">DASHBOARD</h2>
                {currentUser?.isAdmin && <button onClick={() => setView(ViewMode.USER_ADMIN)} className="btn-arena px-4 py-2 rounded-xl text-[10px] font-black uppercase">Gestão de Usuários</button>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="arena-card p-8 bg-white"><h3 className="text-[10px] font-black uppercase">Inscritos</h3><p className="text-5xl font-arena">{stats.total}</p></div>
                <div className="arena-card p-8 bg-white"><h3 className="text-[10px] font-black uppercase">Fotos</h3><p className="text-5xl font-arena">{eventPhotos.length}</p></div>
              </div>
              <div className="arena-card p-8 bg-[#2B4C7E] text-white space-y-4">
                <h4 className="font-arena text-2xl">BACKUP</h4>
                <div className="flex gap-4">
                  <button onClick={() => { setPasswordPurpose('EXPORT_BACKUP'); setIsPasswordModalOpen(true); }} className="flex-grow py-3 border-2 border-white/20 rounded-xl">EXPORTAR</button>
                  <button onClick={() => { setPasswordPurpose('IMPORT_BACKUP_REQUEST'); setIsPasswordModalOpen(true); }} className="flex-grow py-3 bg-[#F9B115] text-[#2B4C7E] rounded-xl">IMPORTAR</button>
                </div>
                <input type="file" ref={importInputRef} accept=".json" className="hidden" onChange={handleImportFileChange} />
              </div>
           </div>
        )}

        {view === ViewMode.LIST && (
           <div className="space-y-6 pb-24">
              <div className="bg-white p-4 rounded-3xl border-4 border-[#2B4C7E] flex items-center gap-3"><Search /><input placeholder="PESQUISAR..." className="w-full outline-none" onChange={e => setSearchTerm(e.target.value)} /></div>
              <div className="grid gap-4">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-3xl border-2 flex items-center gap-4">
                    <img src={m.photo || ''} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-grow"><h4 className="font-arena text-lg">{m.nome}</h4><p className="text-[10px] uppercase font-bold text-gray-400">{m.bloco}</p></div>
                    <button onClick={() => { setMemberIdToDelete(m.id); setPasswordPurpose('DELETE'); setIsPasswordModalOpen(true); }} className="p-2 text-red-500"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
           </div>
        )}
      </main>

      {/* FOOTER & MODALS */}
      <footer className="py-4 text-center opacity-40 text-[9px] font-black uppercase tracking-widest">v2.2 | Deixa o Arena me Levar</footer>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="arena-card w-full max-w-sm bg-white p-8">
            <h3 className="font-arena text-xl mb-4 text-center">CONFIRME A SENHA MESTRA</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={inputStyles} placeholder="SENHA" autoFocus onKeyDown={e => e.key === 'Enter' && handleConfirmPassword()} />
            <div className="flex gap-3 mt-6"><button onClick={() => setIsPasswordModalOpen(false)} className="flex-grow py-2 border">Voltar</button><button onClick={handleConfirmPassword} className="btn-arena flex-grow py-2">OK</button></div>
          </div>
        </div>
      )}

      {infoMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setInfoMessage(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm text-center border-4 border-[#2B4C7E]">
            <AlertCircle size={48} className="text-[#C63D2F] mx-auto mb-4" />
            <p className="font-bold text-[#2B4C7E]">{infoMessage}</p>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-4" onClick={() => setViewingPhoto(null)}>
           <div className="flex justify-end"><X size={32} className="text-white"/></div>
           <div className="flex-grow flex items-center justify-center"><img src={viewingPhoto.url} className="max-w-full max-h-full object-contain" /></div>
        </div>
      )}

      {viewingSponsor && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={() => setViewingSponsor(null)}>
           <div className="arena-card max-w-md bg-white p-8 text-center" onClick={e => e.stopPropagation()}>
              <img src={viewingSponsor.logo} className="w-32 h-32 mx-auto mb-4" />
              <h3 className="font-arena text-2xl">{viewingSponsor.nome}</h3>
              <a href={`https://wa.me/55${viewingSponsor.telefone.replace(/\D/g,'')}`} target="_blank" className="btn-arena w-full py-4 rounded-xl mt-6 block">FALAR COM PARCEIRO</a>
           </div>
        </div>
      )}

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center ${view === ViewMode.HOME ? 'text-[#F9B115]' : 'opacity-50'}`}><Home size={24} /><span className="text-[7px] font-black mt-1 uppercase">Início</span></button>
          <button onClick={() => setView(ViewMode.REGISTER)} className={`flex flex-col items-center ${view === ViewMode.REGISTER ? 'text-[#F9B115]' : 'opacity-50'}`}><UserPlus size={24} /><span className="text-[7px] font-black mt-1 uppercase">Inscrição</span></button>
          <button onClick={() => setView(ViewMode.PHOTOS)} className={`flex flex-col items-center ${view === ViewMode.PHOTOS ? 'text-[#F9B115]' : 'opacity-50'}`}><ImageIcon size={24} /><span className="text-[7px] font-black mt-1 uppercase">Mural</span></button>
          <button onClick={() => setView(ViewMode.SPONSORS)} className={`flex flex-col items-center ${view === ViewMode.SPONSORS ? 'text-[#F9B115]' : 'opacity-50'}`}><Handshake size={24} /><span className="text-[7px] font-black mt-1 uppercase">Parceiros</span></button>
          <button onClick={() => setView(ViewMode.STATISTICS)} className={`flex flex-col items-center ${view === ViewMode.STATISTICS ? 'text-[#F9B115]' : 'opacity-50'}`}><BarChart3 size={24} /><span className="text-[7px] font-black mt-1 uppercase">Dados</span></button>
          <button onClick={() => { setPasswordPurpose('VIEW_LIST'); setIsPasswordModalOpen(true); }} className={`flex flex-col items-center ${view === ViewMode.LIST ? 'text-[#F9B115]' : 'opacity-50'}`}><Users size={24} /><span className="text-[7px] font-black mt-1 uppercase">Lista</span></button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
};

export default App;
