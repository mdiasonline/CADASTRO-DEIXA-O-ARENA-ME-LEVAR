
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
  Settings,
  ShieldAlert,
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
  const [loginData, setLoginData] = useState({ nome: '', email: '' });

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
      
      // Carregar usuários se for admin
      if (currentUser?.isAdmin) {
        const users = await databaseService.getUsers();
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
    // Check session
    const savedUser = sessionStorage.getItem('arena_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (currentUser?.isAdmin && view === ViewMode.USER_ADMIN) {
      databaseService.getUsers().then(setPlatformUsers);
    }
  }, [view, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.nome) return notify("Preencha todos os campos!");
    
    setLoading(true);
    try {
      const users = await databaseService.getUsers();
      let user = users.find(u => u.email.toLowerCase() === loginData.email.toLowerCase());
      
      if (!user) {
        // Primeiro usuário do sistema é admin por padrão (para facilitar setup)
        const isFirst = users.length === 0;
        user = {
          id: Math.random().toString(36).substring(7),
          nome: loginData.nome,
          email: loginData.email.toLowerCase(),
          isAdmin: isFirst,
          createdAt: Date.now()
        };
        await databaseService.addUser(user);
        notify(isFirst ? "Boas vindas, Administrador!" : "Conta criada com sucesso!");
      } else {
        notify(`Bem-vindo de volta, ${user.nome}!`);
      }
      
      setCurrentUser(user);
      sessionStorage.setItem('arena_user', JSON.stringify(user));
      setView(ViewMode.HOME);
    } catch (err) {
      notify("Erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('arena_user');
    setView(ViewMode.HOME);
    notify("Você saiu da conta.");
  };

  const toggleAdmin = async (user: AppUser) => {
    if (user.id === currentUser?.id) return notify("Você não pode alterar seu próprio privilégio!");
    const updated = { ...user, isAdmin: !user.isAdmin };
    await databaseService.updateUser(updated);
    setPlatformUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    notify(`${user.nome} agora é ${updated.isAdmin ? 'Admin' : 'Membro'}`);
  };

  const deleteUser = async (id: string) => {
    if (id === currentUser?.id) return notify("Operação proibida.");
    if (!confirm("Remover este usuário definitivamente?")) return;
    await databaseService.deleteUser(id);
    setPlatformUsers(prev => prev.filter(u => u.id !== id));
    notify("Usuário removido.");
  };

  // Reusing existing logic... (compressImage, processLogo, etc kept identical)
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

  // Fixed Gemini SDK usage and model name according to guidelines
  const processLogoBackground = async (base64Data: string): Promise<string> => {
    setIsProcessingLogo(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data.split(',')[1], mimeType: 'image/jpeg' } },
            { text: 'Remove the background of this logo. Return only the main element.' },
          ],
        },
      });
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return base64Data;
    } catch (error) {
      return base64Data;
    } finally {
      setIsProcessingLogo(false);
    }
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

  // Fixed missing handleImportFileChange function
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const backup = JSON.parse(content);
          if (backup.members || backup.eventPhotos || backup.sponsors) {
            setLoading(true);
            if (backup.members) {
              for (const m of backup.members) await databaseService.addMember(m);
            }
            if (backup.eventPhotos) {
              for (const p of backup.eventPhotos) await databaseService.addEventPhoto(p);
            }
            if (backup.sponsors) {
              for (const s of backup.sponsors) await databaseService.addSponsor(s);
            }
            await loadData();
            notify("Backup importado com sucesso!");
          } else {
            notify("Arquivo de backup inválido.");
          }
        } catch (err) {
          notify("Erro ao importar backup.");
        } finally {
          setLoading(false);
          if (importInputRef.current) importInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFaceSearchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && eventPhotos.length > 0) {
      setIsFacialSearching(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const selfie = await compressImage(reader.result as string, 0.6, 256);
          setFaceSearchRef(selfie);
          const targetPhotos = eventPhotos.slice(0, 15);
          const targets = await Promise.all(targetPhotos.map(async p => ({ id: p.id, url: await compressImage(p.url, 0.5, 256) })));
          const matches = await findFaceMatches(selfie, targets);
          setMatchedPhotoIds(matches);
          if (matches.length === 0) notify("Não te achei no mural.");
        } catch (err) { notify("Erro na busca."); } finally { setIsFacialSearching(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFaceFilter = () => { setMatchedPhotoIds(null); setFaceSearchRef(null); };
  const togglePhotoSelection = (id: string) => { setSelectedPhotoIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]); };
  const filteredMuralPhotos = useMemo(() => matchedPhotoIds === null ? eventPhotos : eventPhotos.filter(p => matchedPhotoIds.includes(p.id)), [eventPhotos, matchedPhotoIds]);
  const handleSelectAll = () => { if (selectedPhotoIds.length === filteredMuralPhotos.length && filteredMuralPhotos.length > 0) { setSelectedPhotoIds([]); } else { setSelectedPhotoIds(filteredMuralPhotos.map(p => p.id)); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.celular || !formData.bloco) return notify("Dados incompletos!");
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
    } catch (e) { notify("Erro no parceiro."); } finally { setLoading(false); setSponsorFormData(defaultSponsorFormData); setSponsorLogoScale(1); }
  };

  const handleConfirmPassword = async () => {
    if (passwordInput.toUpperCase() === 'GARRINCHA') {
      if (passwordPurpose === 'DELETE' && memberIdToDelete) { await databaseService.deleteMember(memberIdToDelete); setMembers(prev => prev.filter(m => m.id !== memberIdToDelete)); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'DELETE_PHOTO' && photoIdToDelete) { await databaseService.deleteEventPhoto(photoIdToDelete); setEventPhotos(prev => prev.filter(p => p.id !== photoIdToDelete)); setIsPasswordModalOpen(false); setViewingPhoto(null); }
      else if (passwordPurpose === 'DELETE_PHOTOS_BATCH' && selectedPhotoIds.length > 0) { setLoading(true); for (const id of selectedPhotoIds) await databaseService.deleteEventPhoto(id); setEventPhotos(prev => prev.filter(p => !selectedPhotoIds.includes(p.id))); setSelectedPhotoIds([]); setIsSelectionMode(false); setIsPasswordModalOpen(false); setLoading(false); }
      else if (passwordPurpose === 'VIEW_LIST') { setView(ViewMode.LIST); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'VIEW_STATS') { setView(ViewMode.STATISTICS); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'ADD_SPONSOR') { setSponsorIdToEdit(null); setSponsorFormData(defaultSponsorFormData); setShowSponsorForm(true); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'EDIT_SPONSOR' && sponsorIdToEdit) { const s = sponsors.find(sp => sp.id === sponsorIdToEdit); if (s) setSponsorFormData({ nome: s.nome, atuacao: s.atuacao, telefone: s.telefone, descricao: s.descricao || '', logo: s.logo }); setShowSponsorForm(true); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'DELETE_SPONSOR' && sponsorIdToDelete) { await databaseService.deleteSponsor(sponsorIdToDelete); setSponsors(prev => prev.filter(s => s.id !== sponsorIdToDelete)); setIsPasswordModalOpen(false); }
      else if (passwordPurpose === 'IMPORT_BACKUP_REQUEST') { setIsPasswordModalOpen(false); importInputRef.current?.click(); }
      else if (passwordPurpose === 'EXPORT_BACKUP') { setIsPasswordModalOpen(false); const b = { version: '2.2', members, eventPhotos, sponsors }; const blob = new Blob([JSON.stringify(b)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'backup_arena.json'; a.click(); }
    } else { notify('SENHA INCORRETA!'); }
    setPasswordInput(''); setMemberIdToDelete(null); setPhotoIdToDelete(null); setSponsorIdToDelete(null);
  };

  const handleDownloadPhoto = async (url?: string, name?: string) => { if (!url) return; const res = await fetch(url); const blob = await res.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `foto_${name}.jpg`; link.click(); };
  const handleSharePhoto = (url?: string) => { if (url) window.open(`https://wa.me/?text=${encodeURIComponent('Olha essa foto da Arena! 🎭 '+url)}`, '_blank'); };
  const navigatePhoto = useCallback((direction: 'next' | 'prev') => { if (!viewingPhoto) return; const idx = filteredMuralPhotos.findIndex(p => p.id === viewingPhoto.id); let nIdx = direction === 'next' ? (idx + 1) % filteredMuralPhotos.length : (idx - 1 + filteredMuralPhotos.length) % filteredMuralPhotos.length; setViewingPhoto(filteredMuralPhotos[nIdx]); }, [viewingPhoto, filteredMuralPhotos]);

  const stats = useMemo(() => {
    const bB: Record<string, number> = {}; const bC: Record<string, number> = {};
    members.forEach(m => { bB[m.bloco] = (bB[m.bloco] || 0) + 1; bC[m.tipo] = (bC[m.tipo] || 0) + 1; });
    const sB = Object.entries(bB).sort((a,b) => b[1]-a[1]);
    return { byBloco: sB, total: members.length, max: sB[0]?.[1] || 0 };
  }, [members]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all placeholder:opacity-30";
  const filteredMembers = useMemo(() => members.filter(m => (!searchTerm || m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || m.bloco.toLowerCase().includes(searchTerm.toLowerCase())) && (!blocoFilter || m.bloco === blocoFilter) && (!cargoFilter || m.tipo === cargoFilter)), [members, searchTerm, blocoFilter, cargoFilter]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-4 md:py-6 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4">
           <div className="flex justify-between items-start mb-2">
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
                <button 
                  onClick={() => setView(ViewMode.LOGIN)}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1.5"
                >
                  <LogIn size={12}/> Logar ou Cadastre-se
                </button>
              )}
           </div>
           <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => setView(ViewMode.HOME)}>
              <h1 className="text-2xl md:text-5xl font-arena tracking-tighter leading-tight">
                DEIXA O <span className="text-[#F9B115]">ARENA ME LEVAR</span>
              </h1>
              <div className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-80 -mt-1">
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
                <h2 className="text-3xl font-arena">ACESSO ARENA</h2>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Identifique-se para continuar</p>
             </div>
             <form onSubmit={handleLogin} className="p-8 space-y-6">
                <div className="space-y-4">
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1">Seu Nome</label>
                      <input required value={loginData.nome} onChange={e => setLoginData({...loginData, nome: e.target.value})} className={inputStyles} placeholder="NOME COMPLETO" />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1">Seu E-mail</label>
                      <input type="email" required value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} className={inputStyles} placeholder="EMAIL@EXEMPLO.COM" />
                   </div>
                </div>
                <button type="submit" disabled={loading} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl flex items-center justify-center gap-3">
                   {loading ? <Loader2 className="animate-spin" /> : <><LogIn size={20} /> ENTRAR NO SISTEMA</>}
                </button>
                <button type="button" onClick={() => setView(ViewMode.HOME)} className="w-full py-2 text-[10px] font-black text-gray-400 uppercase">Voltar ao Início</button>
             </form>
          </div>
        )}

        {view === ViewMode.USER_ADMIN && currentUser?.isAdmin && (
           <div className="space-y-6 animate-fadeIn pb-24">
              <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-4 border-[#C63D2F] shadow-lg">
                 <div className="bg-[#C63D2F] p-3 rounded-2xl text-white"><UserCog size={32} /></div>
                 <div>
                    <h2 className="text-2xl font-arena text-[#C63D2F]">GESTÃO DE ACESSOS</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400">Gerencie quem pode administrar o sistema</p>
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
                         <button 
                            onClick={() => toggleAdmin(u)}
                            className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${u.isAdmin ? 'bg-[#F9B115] text-[#2B4C7E] border-[#2B4C7E]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                         >
                            {u.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                         </button>
                         <button 
                            onClick={() => deleteUser(u.id)}
                            className="p-2 text-red-100 bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                         >
                            <Trash2 size={16}/>
                         </button>
                      </div>
                   </div>
                 ))}
                 {platformUsers.length === 0 && (
                   <div className="text-center py-20 opacity-20"><Users size={64} className="mx-auto mb-4"/><p className="font-arena text-2xl uppercase">Sem outros usuários</p></div>
                 )}
              </div>
           </div>
        )}

        {/* Existing views: REGISTER, SPONSORS, PHOTOS, LIST, STATISTICS remain untouched but integrated */}
        {view === ViewMode.REGISTER && (
          <div className="max-w-xl mx-auto arena-card overflow-hidden bg-white animate-slideUp">
             <div className="bg-[#2B4C7E] p-6 text-center text-white border-b-4 border-[#F9B115]">
               <h2 className="text-3xl font-arena">FICHA DE INSCRIÇÃO</h2>
               <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Preencha todos os dados abaixo</p>
             </div>
             {isRegistered ? (
               <div className="p-10 text-center animate-fadeIn">
                 <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500"><Trophy size={48} className="text-green-600" /></div>
                 <h3 className="text-3xl font-arena text-[#2B4C7E] mb-2">CADASTRO CONCLUÍDO!</h3>
                 <p className="font-bold text-gray-500 mb-8 uppercase text-xs">Você já faz parte da nossa folia!</p>
                 <button onClick={() => setIsRegistered(false)} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl uppercase">CADASTRAR OUTRO</button>
               </div>
             ) : (
               <form onSubmit={handleSubmit} className="p-8 space-y-6">
                 <div className="flex flex-col items-center mb-4">
                   <div className="relative group">
                     <div className="w-32 h-32 border-4 border-[#2B4C7E] rounded-3xl overflow-hidden bg-gray-50 shadow-inner rotate-3 group-hover:rotate-0 transition-transform">{formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-8 text-gray-200" />}</div>
                     <div className="absolute -bottom-3 -right-3 flex gap-2">
                       <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-3 bg-[#2B4C7E] text-white rounded-2xl border-2 border-white shadow-lg hover:scale-110 transition-transform"><Camera size={20} /></button>
                       <button type="button" onClick={() => galleryInputRef.current?.click()} className="p-3 bg-[#F9B115] text-[#2B4C7E] rounded-2xl border-2 border-white shadow-lg hover:scale-110 transition-transform"><Upload size={20} /></button>
                     </div>
                   </div>
                   <input type="file" ref={cameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                   <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                 </div>
                 <div className="space-y-4">
                    <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Nome Completo</label><input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="EX: JOÃO DA SILVA" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Bloco</label><select required name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}><option value="">SELECIONE</option>{['BLOCO 1','BLOCO 2','BLOCO 3','BLOCO 4','BLOCO 5','BLOCO 6','BLOCO 7','BLOCO 8','CONVIDADO'].map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                      <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Cargo</label><select name="tipo" value={formData.tipo} onChange={handleInputChange} className={inputStyles}>{['FOLIÃO','ORGANIZADOR','DIRETORIA','BATERIA','APOIO','MUSA/MUSO'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Apto</label><input name="apto" value={formData.apto} onChange={handleInputChange} className={inputStyles} placeholder="EX: 101-B" /></div>
                      <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Celular</label><input required name="celular" value={formData.celular} onChange={handleInputChange} className={inputStyles} placeholder="(00) 00000-0000" /></div>
                    </div>
                 </div>
                 <button type="submit" disabled={loading} className="btn-arena w-full py-5 rounded-2xl font-arena text-2xl flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={28} /> CONFIRMAR</>}</button>
               </form>
             )}
          </div>
        )}

        {view === ViewMode.SPONSORS && (
          <div className="space-y-10 animate-fadeIn">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-arena text-[#C63D2F] uppercase flex items-center gap-2"><Handshake size={32} /> PARCEIROS</h2>{!showSponsorForm && <button onClick={() => { setPasswordPurpose('ADD_SPONSOR'); setIsPasswordModalOpen(true); }} className="btn-arena px-6 py-3 rounded-xl font-arena text-lg uppercase">ADICIONAR</button>}</div>
            {showSponsorForm && (
              <div className="arena-card p-8 bg-white border-[#C63D2F] animate-slideUp">
                <form onSubmit={handleSponsorSubmit} className="space-y-6">
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-48 border-4 border-[#C63D2F] rounded-3xl overflow-hidden bg-white flex items-center justify-center cursor-pointer" onClick={() => sponsorLogoInputRef.current?.click()}>{sponsorFormData.logo ? <img src={sponsorFormData.logo} className="max-w-full max-h-full object-contain p-4" style={{ transform: `scale(${sponsorLogoScale})`, mixBlendMode: 'multiply' }} /> : <ImageIcon size={48} className="text-gray-200" />}</div>
                      <input type="file" ref={sponsorLogoInputRef} accept="image/*" className="hidden" onChange={handleSponsorLogoChange} />
                      {sponsorFormData.logo && <input type="range" min="0.5" max="2.5" step="0.05" value={sponsorLogoScale} onChange={(e) => setSponsorLogoScale(parseFloat(e.target.value))} className="w-full max-w-xs mt-4" />}
                    </div>
                    <div className="space-y-4">
                      <input required name="nome" value={sponsorFormData.nome} onChange={handleSponsorInputChange} className={inputStyles} placeholder="NOME DO PARCEIRO" />
                      <div className="grid grid-cols-2 gap-4"><input name="atuacao" value={sponsorFormData.atuacao} onChange={handleSponsorInputChange} className={inputStyles} placeholder="ATUAÇÃO" /><input name="telefone" value={sponsorFormData.telefone} onChange={handleSponsorInputChange} className={inputStyles} placeholder="TEL/WHATSAPP" /></div>
                      <textarea name="descricao" value={sponsorFormData.descricao} onChange={handleSponsorInputChange} className={`${inputStyles} h-24 resize-none`} placeholder="DESCRIÇÃO..."></textarea>
                    </div>
                    <button type="submit" disabled={loading} className="btn-arena w-full py-4 rounded-xl font-arena text-xl uppercase">{loading ? <Loader2 className="animate-spin" /> : 'SALVAR'}</button>
                </form>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sponsors.map(s => (
                <div key={s.id} onClick={() => setViewingSponsor(s)} className="arena-card p-6 bg-white flex flex-col items-center group relative cursor-pointer">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={(e) => { e.stopPropagation(); setSponsorIdToEdit(s.id); setPasswordPurpose('EDIT_SPONSOR'); setIsPasswordModalOpen(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Pencil size={14}/></button><button onClick={(e) => { e.stopPropagation(); setSponsorIdToDelete(s.id); setPasswordPurpose('DELETE_SPONSOR'); setIsPasswordModalOpen(true); }} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 size={14}/></button></div>
                  <div className="w-32 h-32 mb-4 flex items-center justify-center overflow-hidden"><img src={s.logo} className="max-w-full max-h-full object-contain" style={{ mixBlendMode: 'multiply' }} /></div>
                  <h4 className="font-arena text-xl text-[#2B4C7E]">{s.nome}</h4>
                  <p className="text-[10px] font-black uppercase text-[#C63D2F]">{s.atuacao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === ViewMode.PHOTOS && (
          <div className="space-y-6 animate-fadeIn pb-24">
            <div className="bg-white p-6 rounded-3xl border-4 border-[#F9B115] shadow-lg">
              <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-arena text-[#2B4C7E]">MURAL DA FOLIA</h2><div className="flex gap-2"><button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedPhotoIds([]); }} className="p-3 bg-gray-100 rounded-xl"><CheckSquare size={20}/></button><button onClick={() => muralUploadRef.current?.click()} className="btn-arena px-4 py-2 rounded-xl">POSTAR</button></div></div>
              <input type="file" ref={muralUploadRef} accept="image/*" className="hidden" onChange={handleMuralUpload} multiple />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMuralPhotos.map(p => (
                <div key={p.id} onClick={() => isSelectionMode ? togglePhotoSelection(p.id) : setViewingPhoto(p)} className={`arena-card overflow-hidden group relative cursor-pointer ${isSelectionMode && selectedPhotoIds.includes(p.id) ? 'ring-4 ring-[#F9B115]' : ''}`}>
                  <img src={p.url} className="w-full aspect-square object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === ViewMode.STATISTICS && (
           <div className="space-y-10 animate-fadeIn pb-24">
              <div className="flex justify-between items-center"><h2 className="text-3xl font-arena text-[#2B4C7E]">DASHBOARD ARENA</h2>{currentUser?.isAdmin && <button onClick={() => setView(ViewMode.USER_ADMIN)} className="flex items-center gap-2 text-[10px] font-black uppercase bg-[#C63D2F] text-white px-4 py-2 rounded-xl border-2 border-[#2B4C7E] shadow-[2px_2px_0px_#2B4C7E]"><UserCog size={14}/> Gestão de Acessos</button>}</div>
              <div className="grid grid-cols-3 gap-6">
                <div className="arena-card p-8 bg-white"><h3 className="text-[10px] font-black uppercase text-gray-400">Total</h3><p className="text-6xl font-arena text-[#2B4C7E]">{stats.total}</p></div>
                <div className="arena-card p-8 bg-white border-[#F9B115]"><h3 className="text-[10px] font-black uppercase text-gray-400">Fotos</h3><p className="text-6xl font-arena text-[#F9B115]">{eventPhotos.length}</p></div>
                <div className="arena-card p-8 bg-white border-[#C63D2F]"><h3 className="text-[10px] font-black uppercase text-gray-400">Parceiros</h3><p className="text-6xl font-arena text-[#C63D2F]">{sponsors.length}</p></div>
              </div>
              <div className="arena-card p-8 bg-[#2B4C7E] text-white">
                <h4 className="font-arena text-2xl mb-4">CENTRAL DE SINCRONIZAÇÃO</h4>
                <div className="flex gap-4"><button onClick={() => { setPasswordPurpose('EXPORT_BACKUP'); setIsPasswordModalOpen(true); }} className="flex-grow py-4 border-2 border-white/20 rounded-2xl">EXPORTAR</button><button onClick={() => { setPasswordPurpose('IMPORT_BACKUP_REQUEST'); setIsPasswordModalOpen(true); }} className="flex-grow py-4 bg-[#F9B115] text-[#2B4C7E] rounded-2xl">IMPORTAR</button></div>
                <input type="file" ref={importInputRef} accept=".json" className="hidden" onChange={handleImportFileChange} />
              </div>
           </div>
        )}

        {view === ViewMode.LIST && (
           <div className="space-y-6 animate-fadeIn pb-24">
              <div className="bg-white p-4 rounded-[2rem] border-4 border-[#2B4C7E] flex items-center gap-3"><Search className="text-[#2B4C7E]"/><input placeholder="PESQUISAR..." className="w-full outline-none font-bold" onChange={e => setSearchTerm(e.target.value)} /></div>
              <div className="grid gap-4">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-3xl border-2 border-[#2B4C7E]/20 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#2B4C7E] overflow-hidden shrink-0">{m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : <User className="p-4 text-gray-100"/>}</div>
                    <div className="flex-grow">
                      <h4 className="font-arena text-xl text-[#2B4C7E]">{m.nome}</h4>
                      <p className="text-[10px] font-black uppercase text-[#F9B115]">{m.bloco} • {m.tipo}</p>
                    </div>
                    <div className="flex gap-2">
                       <a href={`https://wa.me/55${m.celular.replace(/\D/g,'')}`} target="_blank" className="p-3 bg-[#25D366] text-white rounded-xl"><MessageCircle size={18}/></a>
                       <button onClick={() => { setMemberIdToDelete(m.id); setPasswordPurpose('DELETE'); setIsPasswordModalOpen(true); }} className="p-3 bg-red-50 text-[#C63D2F] rounded-xl"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </main>

      <footer className="mt-auto py-4 text-center">
        <p className="text-[9px] font-bold text-[#2B4C7E] uppercase tracking-widest opacity-60">Desenvolvido por <span className="text-[#C63D2F]">Maycon Dias</span> | v2.2</p>
      </footer>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="arena-card w-full max-sm bg-white p-8 animate-slideUp">
            <h3 className="font-arena text-2xl mb-4 text-center text-[#2B4C7E]">ACESSO RESTRITO</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={inputStyles} placeholder="SENHA" autoFocus onKeyDown={e => e.key === 'Enter' && handleConfirmPassword()} />
            <div className="flex gap-3 mt-6"><button onClick={() => setIsPasswordModalOpen(false)} className="flex-grow py-3 border-2 border-gray-100 rounded-xl font-bold uppercase text-[10px] text-black">Sair</button><button onClick={handleConfirmPassword} className="btn-arena flex-grow py-3 rounded-xl font-arena text-lg uppercase">Confirmar</button></div>
          </div>
        </div>
      )}

      {infoMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => setInfoMessage(null)}>
          <div className="bg-white border-4 border-[#2B4C7E] rounded-[2rem] p-8 max-w-sm text-center animate-slideUp">
            <AlertCircle size={48} className="text-[#C63D2F] mx-auto mb-4" />
            <p className="font-bold text-[#2B4C7E]">{infoMessage}</p>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-fadeIn">
           <div className="flex justify-between items-center p-6 text-white"><span className="text-[10px] font-black uppercase opacity-50">Visualizando Foto</span><button onClick={() => setViewingPhoto(null)}><X size={32} /></button></div>
           <div className="flex-grow flex items-center justify-between p-4 relative">
              <button onClick={() => navigatePhoto('prev')} className="p-4 bg-white/10 rounded-full text-white"><ChevronLeft size={32} /></button>
              <img src={viewingPhoto.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-zoomIn" />
              <button onClick={() => navigatePhoto('next')} className="p-4 bg-white/10 rounded-full text-white"><ChevronRight size={32} /></button>
           </div>
        </div>
      )}

      {viewingSponsor && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewingSponsor(null)}>
           <div className="arena-card w-full max-w-lg bg-white overflow-hidden p-8 text-center space-y-4" onClick={e => e.stopPropagation()}>
              <img src={viewingSponsor.logo} className="w-32 h-32 mx-auto object-contain" style={{ mixBlendMode: 'multiply' }} />
              <h3 className="font-arena text-3xl text-[#2B4C7E]">{viewingSponsor.nome}</h3>
              <span className="text-[10px] font-black uppercase text-[#C63D2F] tracking-widest">{viewingSponsor.atuacao}</span>
              <p className="text-gray-600 italic">"{viewingSponsor.descricao}"</p>
              <a href={`https://wa.me/55${viewingSponsor.telefone.replace(/\D/g,'')}`} target="_blank" className="btn-arena w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-arena text-xl"><MessageCircle size={24} /> CHAMAR</a>
           </div>
        </div>
      )}

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center transition-all ${view === ViewMode.HOME ? 'text-[#F9B115] scale-110' : 'opacity-50'}`}><Home size={24} /><span className="text-[7px] font-black mt-1 uppercase">Início</span></button>
          <button onClick={() => setView(ViewMode.REGISTER)} className={`flex flex-col items-center transition-all ${view === ViewMode.REGISTER ? 'text-[#F9B115] scale-110' : 'opacity-50'}`}><UserPlus size={24} /><span className="text-[7px] font-black mt-1 uppercase">Inscrição</span></button>
          <button onClick={() => setView(ViewMode.PHOTOS)} className={`flex flex-col items-center transition-all ${view === ViewMode.PHOTOS ? 'text-[#F9B115] scale-110' : 'opacity-50'}`}><ImageIcon size={24} /><span className="text-[7px] font-black mt-1 uppercase">Mural</span></button>
          <button onClick={() => setView(ViewMode.SPONSORS)} className={`flex flex-col items-center transition-all ${view === ViewMode.SPONSORS ? 'text-[#F9B115] scale-110' : 'opacity-50'}`}><Handshake size={24} /><span className="text-[7px] font-black mt-1 uppercase">Parceiros</span></button>
          <button onClick={() => setView(ViewMode.STATISTICS)} className={`flex flex-col items-center transition-all ${view === ViewMode.STATISTICS ? 'text-[#F9B115] scale-110' : 'opacity-50'}`}><BarChart3 size={24} /><span className="text-[7px] font-black mt-1 uppercase">Dados</span></button>
          <button onClick={() => { setPasswordPurpose('VIEW_LIST'); setIsPasswordModalOpen(true); }} className={`flex flex-col items-center transition-all ${view === ViewMode.LIST ? 'text-[#F9B115] scale-110' : 'opacity-50'}`}><Users size={24} /><span className="text-[7px] font-black mt-1 uppercase">Lista</span></button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .btn-arena:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
      `}} />
    </div>
  );
};

export default App;
