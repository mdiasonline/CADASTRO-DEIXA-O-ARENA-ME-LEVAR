
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Member, ViewMode, EventPhoto, Sponsor } from './types';
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
  FileJson
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [blocoFilter, setBlocoFilter] = useState('');
  const [cargoFilter, setCargoFilter] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  
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
            {
              inlineData: {
                data: base64Data.split(',')[1],
                mimeType: 'image/jpeg',
              },
            },
            {
              text: 'Remove the background of this logo. Keep only the main logo element and crop tightly to its borders. Return the logo on a white background (I will process the transparency later). Ensure the logo is sharp and centered.',
            },
          ],
        },
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return base64Data;
    } catch (error) {
      console.error("Erro ao processar logo:", error);
      return base64Data;
    } finally {
      setIsProcessingLogo(false);
    }
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
        
        // Iniciar remoção de fundo via Gemini
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
          const newPhoto: EventPhoto = {
            id: Math.random().toString(36).substring(7),
            url: compressed,
            createdAt: Date.now()
          };
          
          await databaseService.addEventPhoto(newPhoto);
          uploadedPhotos.push(newPhoto);
        }
        setEventPhotos(prev => [...uploadedPhotos, ...prev]);
        notify(`${uploadedPhotos.length} fotos postadas com sucesso!`);
      } catch (err: any) {
        console.error("Erro no upload mural:", err);
        notify("Erro ao processar fotos selecionadas.");
      } finally {
        setLoading(false);
        if (muralUploadRef.current) muralUploadRef.current.value = "";
      }
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
          const targets = await Promise.all(targetPhotos.map(async p => ({
            id: p.id,
            url: await compressImage(p.url, 0.5, 256)
          })));

          const matches = await findFaceMatches(selfie, targets);
          setMatchedPhotoIds(matches);
          if (matches.length === 0) {
            notify("Nenhuma foto sua foi encontrada no mural recente.");
          }
        } catch (err) {
          console.error("Erro na busca facial:", err);
          notify("Ocorreu algum erro, informe ao administrador.");
        } finally {
          setIsFacialSearching(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFaceFilter = () => {
    setMatchedPhotoIds(null);
    setFaceSearchRef(null);
  };

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const filteredMuralPhotos = useMemo(() => {
    if (matchedPhotoIds === null) return eventPhotos;
    return eventPhotos.filter(p => matchedPhotoIds.includes(p.id));
  }, [eventPhotos, matchedPhotoIds]);

  const handleSelectAll = () => {
    if (selectedPhotoIds.length === filteredMuralPhotos.length && filteredMuralPhotos.length > 0) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(filteredMuralPhotos.map(p => p.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.celular || !formData.bloco) {
      notify("Preencha Nome, Celular e Bloco!");
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
      notify("Erro ao salvar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
      setFormData(defaultFormData);
    }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorFormData.nome || !sponsorFormData.logo) {
      notify("Preencha pelo menos o Nome e o Logo do parceiro!");
      return;
    }
    setLoading(true);
    
    try {
      const finalLogo = await compressImage(sponsorFormData.logo, 0.8, 400, sponsorLogoScale);

      if (sponsorIdToEdit) {
        const originalSponsor = sponsors.find(s => s.id === sponsorIdToEdit);
        const updatedSponsor: Sponsor = {
          ...sponsorFormData,
          id: sponsorIdToEdit,
          logo: finalLogo,
          createdAt: originalSponsor?.createdAt || Date.now()
        };
        
        await databaseService.updateSponsor(updatedSponsor);
        
        // Atualiza a UI imediatamente
        setSponsors(prev => prev.map(s => s.id === sponsorIdToEdit ? updatedSponsor : s));
        setSponsorIdToEdit(null);
        setShowSponsorForm(false);
        notify("Parceiro atualizado com sucesso!");
      } else {
        const newSponsor: Sponsor = {
          id: Math.random().toString(36).substring(7),
          ...sponsorFormData,
          logo: finalLogo,
          createdAt: Date.now()
        };
        await databaseService.addSponsor(newSponsor);
        setSponsors(prev => [newSponsor, ...prev]);
        setShowSponsorForm(false);
        notify("Parceiro cadastrado com sucesso!");
      }
      setSponsorFormData(defaultSponsorFormData);
      setSponsorLogoScale(1);
    } catch (e) {
      console.error("Erro ao salvar parceiro:", e);
      notify("Erro ao salvar parceiro. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '2.2',
      exportDate: new Date().toISOString(),
      members,
      eventPhotos,
      sponsors
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_arena_carnaval_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify("Backup exportado com sucesso!");
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.members || !json.sponsors) {
            notify("Arquivo de backup inválido.");
            return;
          }
          
          setLoading(true);
          try {
            // Processa a importação dos dados recebidos
            for (const m of json.members) await databaseService.addMember(m);
            for (const s of json.sponsors) await databaseService.addSponsor(s);
            for (const p of (json.eventPhotos || [])) await databaseService.addEventPhoto(p);
            
            await loadData(); // Recarrega os dados na UI
            notify("Sincronização concluída! Dados restaurados.");
          } catch (err) {
            notify("Erro durante a restauração dos dados.");
          } finally {
            setLoading(false);
            if (importInputRef.current) importInputRef.current.value = "";
          }
        } catch (err) {
          notify("Erro ao ler o arquivo de backup.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmPassword = async () => {
    if (passwordInput.toUpperCase() === 'GARRINCHA') {
      if (passwordPurpose === 'DELETE' && memberIdToDelete) {
        try {
          await databaseService.deleteMember(memberIdToDelete);
          setMembers(prev => prev.filter(m => m.id !== memberIdToDelete));
          setIsPasswordModalOpen(false);
        } catch (e) { notify("Erro ao realizar a exclusão."); }
      } else if (passwordPurpose === 'DELETE_PHOTO' && photoIdToDelete) {
        try {
          await databaseService.deleteEventPhoto(photoIdToDelete);
          setEventPhotos(prev => prev.filter(p => p.id !== photoIdToDelete));
          setIsPasswordModalOpen(false);
          setViewingPhoto(null);
        } catch (e) { notify("Erro ao excluir a foto."); }
      } else if (passwordPurpose === 'DELETE_PHOTOS_BATCH' && selectedPhotoIds.length > 0) {
        try {
          setLoading(true);
          for (const id of selectedPhotoIds) {
            await databaseService.deleteEventPhoto(id);
          }
          setEventPhotos(prev => prev.filter(p => !selectedPhotoIds.includes(p.id)));
          setSelectedPhotoIds([]);
          setIsSelectionMode(false);
          setIsPasswordModalOpen(false);
          notify("Fotos excluídas com sucesso!");
        } catch (e) { notify("Erro ao excluir as fotos selecionadas."); }
        finally { setLoading(false); }
      } else if (passwordPurpose === 'VIEW_LIST') {
        setView(ViewMode.LIST);
        setIsPasswordModalOpen(false);
      } else if (passwordPurpose === 'VIEW_STATS') {
        setView(ViewMode.STATISTICS);
        setIsPasswordModalOpen(false);
      } else if (passwordPurpose === 'ADD_SPONSOR') {
        setSponsorIdToEdit(null);
        setSponsorFormData(defaultSponsorFormData);
        setShowSponsorForm(true);
        setIsPasswordModalOpen(false);
      } else if (passwordPurpose === 'EDIT_SPONSOR' && sponsorIdToEdit) {
        const sponsorToEdit = sponsors.find(s => s.id === sponsorIdToEdit);
        if (sponsorToEdit) {
          setSponsorFormData({
            nome: sponsorToEdit.nome,
            atuacao: sponsorToEdit.atuacao,
            telefone: sponsorToEdit.telefone,
            descricao: sponsorToEdit.descricao || '',
            logo: sponsorToEdit.logo
          });
          setShowSponsorForm(true);
          setSponsorLogoScale(1);
        }
        setIsPasswordModalOpen(false);
      } else if (passwordPurpose === 'DELETE_SPONSOR' && sponsorIdToDelete) {
        try {
          await databaseService.deleteSponsor(sponsorIdToDelete);
          setSponsors(prev => prev.filter(s => s.id !== sponsorIdToDelete));
          setIsPasswordModalOpen(false);
          notify("Parceiro removido.");
        } catch (e) { notify("Erro ao remover parceiro."); }
      } else if (passwordPurpose === 'IMPORT_BACKUP_REQUEST') {
        setIsPasswordModalOpen(false);
        // Abre o seletor de arquivos após confirmação da senha
        importInputRef.current?.click();
      } else if (passwordPurpose === 'EXPORT_BACKUP') {
        setIsPasswordModalOpen(false);
        handleExportBackup();
      }
    } else { 
      notify('SENHA INCORRETA!'); 
    }
    setPasswordInput('');
    setMemberIdToDelete(null);
    setPhotoIdToDelete(null);
    setSponsorIdToDelete(null);
  };

  const handleDownloadPhoto = async (url?: string, name?: string) => {
    if (!url) return;
    const isRestricted = /Instagram|FBAN|FBAV|Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const fileName = `folia_${name || Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      if (isRestricted && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Foto Carnaval 2026',
        });
        return; 
      }
    } catch (e) {
      console.warn("Navegador não suporta compartilhamento de arquivo:", e);
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = `folia_${name || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSelected = () => {
    selectedPhotoIds.forEach((id, index) => {
      const photo = eventPhotos.find(p => p.id === id);
      if (photo) {
        setTimeout(() => handleDownloadPhoto(photo.url, photo.id), index * 500);
      }
    });
    notify(`Iniciando ação de download para ${selectedPhotoIds.length} fotos...`);
  };

  const handleSharePhoto = async (url?: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `foto_folia.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Carnaval 2026' });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent('Olha essa foto do carnaval! 🎭')}`, '_blank');
      }
    } catch (e) { notify("Utilize o botão de Download direto."); }
  };

  const navigatePhoto = useCallback((direction: 'next' | 'prev') => {
    if (!viewingPhoto) return;
    const currentIndex = filteredMuralPhotos.findIndex(p => p.id === viewingPhoto.id);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % filteredMuralPhotos.length;
    } else {
      nextIndex = (currentIndex - 1 + filteredMuralPhotos.length) % filteredMuralPhotos.length;
    }
    setViewingPhoto(filteredMuralPhotos[nextIndex]);
  }, [viewingPhoto, filteredMuralPhotos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingPhoto) return;
      if (e.key === 'ArrowRight') navigatePhoto('next');
      if (e.key === 'ArrowLeft') navigatePhoto('prev');
      if (e.key === 'Escape') setViewingPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPhoto, navigatePhoto]);

  const stats = useMemo(() => {
    const byBloco: Record<string, number> = {};
    const byCargo: Record<string, number> = {};
    members.forEach(m => {
      byBloco[m.bloco] = (byBloco[m.bloco] || 0) + 1;
      byCargo[m.tipo] = (byCargo[m.tipo] || 0) + 1;
    });
    
    const sortedBlocos = Object.entries(byBloco).sort((a,b) => b[1]-a[1]);
    const maxBlocoCount = sortedBlocos.length > 0 ? sortedBlocos[0][1] : 0;

    return {
      byBloco: sortedBlocos,
      byCargo: Object.entries(byCargo).sort((a,b) => b[1]-a[1]),
      total: members.length,
      maxBlocoCount
    };
  }, [members]);

  const inputStyles = "w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white transition-all placeholder:opacity-30";
  const blocosDisponiveis = ['BLOCO 1', 'BLOCO 2', 'BLOCO 3', 'BLOCO 4', 'BLOCO 5', 'BLOCO 6', 'BLOCO 7', 'BLOCO 8', 'CONVIDADO'];
  const cargosDisponiveis = ['FOLIÃO', 'ORGANIZADOR', 'DIRETORIA', 'BATERIA', 'APOIO', 'MUSA/MUSO'];

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !searchTerm || 
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.bloco.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBloco = !blocoFilter || m.bloco === blocoFilter;
      const matchesCargo = !cargoFilter || m.tipo === cargoFilter;
      return matchesSearch && matchesBloco && matchesCargo;
    });
  }, [members, searchTerm, blocoFilter, cargoFilter]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#2B4C7E] text-white py-6 md:py-8 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95" 
            onClick={() => setView(ViewMode.HOME)}
          >
            <div className="flex flex-col text-center">
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

        {view === ViewMode.REGISTER && (
          <div className="max-w-xl mx-auto arena-card overflow-hidden bg-white animate-slideUp">
             <div className="bg-[#2B4C7E] p-6 text-center text-white border-b-4 border-[#F9B115]">
               <h2 className="text-3xl font-arena">FICHA DE INSCRIÇÃO</h2>
               <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Preencha todos os dados abaixo</p>
             </div>
             {isRegistered ? (
               <div className="p-10 text-center animate-fadeIn">
                 <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500">
                   <Trophy size={48} className="text-green-600" />
                 </div>
                 <h3 className="text-3xl font-arena text-[#2B4C7E] mb-2">CADASTRO CONCLUÍDO!</h3>
                 <p className="font-bold text-gray-500 mb-8 uppercase text-xs">Você já faz parte da nossa folia!</p>
                 <button onClick={() => setIsRegistered(false)} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl uppercase">CADASTRAR OUTRO</button>
               </div>
             ) : (
               <form onSubmit={handleSubmit} className="p-8 space-y-6">
                 {/* Foto de Perfil */}
                 <div className="flex flex-col items-center mb-4">
                   <div className="relative group">
                     <div className="w-32 h-32 border-4 border-[#2B4C7E] rounded-3xl overflow-hidden bg-gray-50 shadow-inner rotate-3 group-hover:rotate-0 transition-transform">
                       {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-8 text-gray-200" />}
                     </div>
                     <div className="absolute -bottom-3 -right-3 flex gap-2">
                       <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-3 bg-[#2B4C7E] text-white rounded-2xl border-2 border-white shadow-lg hover:scale-110 transition-transform"><Camera size={20} /></button>
                       <button type="button" onClick={() => galleryInputRef.current?.click()} className="p-3 bg-[#F9B115] text-[#2B4C7E] rounded-2xl border-2 border-white shadow-lg hover:scale-110 transition-transform"><Upload size={20} /></button>
                     </div>
                   </div>
                   <input type="file" ref={cameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                   <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                   <p className="text-[9px] font-black text-gray-400 mt-6 uppercase tracking-tighter">Sua foto ajuda a te encontrar no mural!</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Nome Completo</label>
                      <input required name="nome" value={formData.nome} onChange={handleInputChange} className={inputStyles} placeholder="EX: JOÃO DA SILVA" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Seu Bloco</label>
                        <select required name="bloco" value={formData.bloco} onChange={handleInputChange} className={inputStyles}>
                          <option value="" disabled>SELECIONE SEU BLOCO</option>
                          {blocosDisponiveis.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Cargo/Tipo</label>
                        <select name="tipo" value={formData.tipo} onChange={handleInputChange} className={inputStyles}>
                          {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Nº Apartamento</label>
                        <input name="apto" value={formData.apto} onChange={handleInputChange} className={inputStyles} placeholder="EX: 101-B" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">WhatsApp / Celular</label>
                        <input required name="celular" value={formData.celular} onChange={handleInputChange} className={inputStyles} placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                 </div>

                 <button type="submit" disabled={loading} className="btn-arena w-full py-5 rounded-2xl font-arena text-2xl flex items-center justify-center gap-3">
                   {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={28} /> CONFIRMAR INSCRIÇÃO</>}
                 </button>
               </form>
             )}
          </div>
        )}

        {view === ViewMode.SPONSORS && (
          <div className="space-y-10 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-3xl font-arena text-[#C63D2F] uppercase flex items-center gap-2">
                <Handshake size={32} /> PARCEIROS
              </h2>
              {!showSponsorForm && (
                <button 
                  onClick={() => { setPasswordPurpose('ADD_SPONSOR'); setIsPasswordModalOpen(true); }}
                  className="btn-arena px-6 py-3 rounded-xl font-arena text-lg uppercase flex items-center gap-2"
                >
                  <PlusCircle size={20} /> ADICIONAR PARCEIRO
                </button>
              )}
            </div>

            {showSponsorForm && (
              <div className="arena-card p-8 bg-white border-[#C63D2F] shadow-[#C63D2F] animate-slideUp">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#F9E7C7] p-3 rounded-2xl border-2 border-[#C63D2F]"><PlusCircle className="text-[#C63D2F]" size={32} /></div>
                    <h3 className="text-2xl font-arena text-[#C63D2F] uppercase">{sponsorIdToEdit ? 'EDITAR PARCEIRO' : 'NOVO CADASTRO'}</h3>
                  </div>
                  <button onClick={() => { setShowSponsorForm(false); setSponsorIdToEdit(null); setSponsorFormData(defaultSponsorFormData); }} className="text-gray-400 hover:text-[#C63D2F] transition-colors">
                    <X size={28} />
                  </button>
                </div>
                
                <form onSubmit={handleSponsorSubmit} className="space-y-6">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-48 h-48 border-4 border-[#C63D2F] rounded-3xl overflow-hidden bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative"
                        onClick={() => sponsorLogoInputRef.current?.click()}
                      >
                        {isProcessingLogo && (
                          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                             <Loader2 className="animate-spin text-[#C63D2F] mb-2" size={32} />
                             <p className="text-[10px] font-black uppercase text-[#C63D2F] animate-pulse">Processando Imagem...</p>
                          </div>
                        )}
                        {sponsorFormData.logo ? (
                          <div className="w-full h-full flex items-center justify-center overflow-hidden p-4">
                            <img 
                              src={sponsorFormData.logo} 
                              className="max-w-full max-h-full object-contain transition-transform" 
                              style={{ transform: `scale(${sponsorLogoScale})`, mixBlendMode: 'multiply' }} 
                              alt="Logo preview" 
                            />
                          </div>
                        ) : (
                          <div className="text-center text-gray-300">
                            <ImageIcon size={48} className="mx-auto mb-2" />
                            <span className="text-[8px] font-black uppercase">Selecionar Logo</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={sponsorLogoInputRef} accept="image/*" className="hidden" onChange={handleSponsorLogoChange} />
                      
                      {sponsorFormData.logo && !isProcessingLogo && (
                        <div className="w-full max-w-xs mt-6 space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 flex justify-between px-1">
                            Ajustar Contorno (Zoom) <span>{Math.round(sponsorLogoScale * 100)}%</span>
                          </label>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="2.5" 
                            step="0.05" 
                            value={sponsorLogoScale} 
                            onChange={(e) => setSponsorLogoScale(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C63D2F]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Nome da Empresa</label>
                        <input required name="nome" value={sponsorFormData.nome} onChange={handleSponsorInputChange} className={inputStyles} placeholder="NOME DA EMPRESA" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Área de Atuação</label>
                        <input name="atuacao" value={sponsorFormData.atuacao} onChange={handleSponsorInputChange} className={inputStyles} placeholder="EX: BEBIDAS, GASTRONOMIA" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Telefone WhatsApp</label>
                        <input name="telefone" value={sponsorFormData.telefone} onChange={handleSponsorInputChange} className={inputStyles} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block px-1 tracking-widest">Descrição / Slogan do Parceiro</label>
                        <textarea 
                          name="descricao" 
                          value={sponsorFormData.descricao} 
                          onChange={handleSponsorInputChange} 
                          className={`${inputStyles} h-24 resize-none`} 
                          placeholder="FALE UM POUCO SOBRE O PARCEIRO OU COLOQUE O SLOGAN..."
                        ></textarea>
                      </div>
                      <div className="md:col-span-2">
                        <button type="submit" disabled={loading || isProcessingLogo} className="btn-arena w-full py-4 rounded-xl font-arena text-xl uppercase flex items-center justify-center gap-2">
                          {loading ? <Loader2 className="animate-spin" /> : (sponsorIdToEdit ? <><Pencil size={20}/> ATUALIZAR DADOS</> : <><Sparkles size={20}/> SALVAR PARCEIRO</>)}
                        </button>
                      </div>
                    </div>
                </form>
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-2xl font-arena text-[#2B4C7E] border-b-4 border-[#F9B115] w-fit pr-4 uppercase">Nossos Apoiadores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                 {sponsors.map(s => (
                   <div 
                    key={s.id} 
                    onClick={() => setViewingSponsor(s)}
                    className="arena-card p-6 bg-white border-gray-200 shadow-gray-200 flex flex-col items-center text-center group relative overflow-hidden transition-all hover:border-[#C63D2F] cursor-pointer"
                   >
                     <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setSponsorIdToEdit(s.id); setPasswordPurpose('EDIT_SPONSOR'); setIsPasswordModalOpen(true); }}
                         className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors"
                         title="Editar"
                       >
                         <Pencil size={14} />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); setSponsorIdToDelete(s.id); setPasswordPurpose('DELETE_SPONSOR'); setIsPasswordModalOpen(true); }}
                         className="p-1.5 bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-colors"
                         title="Excluir"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                     <div className="w-32 h-32 mb-4 flex items-center justify-center bg-transparent rounded-2xl overflow-hidden">
                        <img src={s.logo} className="max-w-full max-h-full object-contain p-2" style={{ mixBlendMode: 'multiply' }} alt={s.nome} />
                     </div>
                     <h4 className="font-arena text-xl text-[#2B4C7E] leading-tight mb-1">{s.nome}</h4>
                     <p className="text-[10px] font-black uppercase text-[#C63D2F] mb-3">{s.atuacao || 'Parceiro Arena'}</p>
                     
                     <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 group-hover:text-[#2B4C7E] transition-colors">
                        <Info size={12} /> VER DETALHES
                     </div>
                   </div>
                 ))}
                 {sponsors.length === 0 && (
                   <div className="col-span-full py-16 text-center opacity-30">
                     <Store size={64} className="mx-auto mb-4" />
                     <p className="font-arena text-2xl uppercase tracking-widest">Nenhum parceiro ainda...</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {view === ViewMode.PHOTOS && (
          <div className="space-y-6 animate-fadeIn pb-24">
            <div className="flex flex-col gap-4 bg-white p-6 rounded-3xl border-4 border-[#F9B115] shadow-lg">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#2B4C7E] bg-[#F9E7C7] flex items-center justify-center overflow-hidden">
                      {faceSearchRef ? <img src={faceSearchRef} className="w-full h-full object-cover" /> : <ScanFace className="text-[#2B4C7E]" size={32} />}
                    </div>
                    {isFacialSearching && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-[#2B4C7E]" size={20} /></div>}
                  </div>
                  <div>
                    <h2 className="text-2xl font-arena text-[#2B4C7E]">MURAL DA FOLIA</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400">Localize suas fotos na folia • {eventPhotos.length} fotos postadas</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedPhotoIds([]);
                    }} 
                    className={`flex-grow md:flex-none px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase border-2 transition-all ${isSelectionMode ? 'bg-[#2B4C7E] text-white border-[#2B4C7E]' : 'bg-white text-[#2B4C7E] border-[#2B4C7E]'}`}
                  >
                    {isSelectionMode ? <X size={18} /> : <CheckSquare size={18} />}
                    {isSelectionMode ? 'Cancelar' : 'Selecionar'}
                  </button>

                  {!isSelectionMode && (
                    <>
                      {matchedPhotoIds ? (
                        <button onClick={clearFaceFilter} className="flex-grow md:flex-none px-4 py-3 bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase">
                          <RefreshCcw size={16} /> Ver Tudo
                        </button>
                      ) : (
                        <button onClick={() => faceSearchInputRef.current?.click()} className="flex-grow md:flex-none px-4 py-3 bg-[#F9B115] text-[#2B4C7E] rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase border-2 border-[#2B4C7E] hover:scale-105 transition-transform">
                          <ScanFace size={20} /> Me Localizar
                        </button>
                      )}
                      <button onClick={() => muralUploadRef.current?.click()} className="flex-grow md:flex-none btn-arena px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-arena" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <><PlusCircle size={20} /> POSTAR</>}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isSelectionMode && (
                <div className="flex flex-wrap gap-2 w-full pt-4 border-t-2 border-gray-100 animate-slideUp">
                  <button 
                    onClick={handleSelectAll}
                    className="flex-grow p-3 bg-white text-[#2B4C7E] border-2 border-[#2B4C7E] rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase hover:bg-gray-50 transition-colors"
                  >
                    <CheckCheck size={18} />
                    {selectedPhotoIds.length === filteredMuralPhotos.length && filteredMuralPhotos.length > 0 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                  </button>
                  
                  {selectedPhotoIds.length > 0 && (
                    <>
                      <button 
                        onClick={handleDownloadSelected}
                        className="flex-grow p-3 bg-[#F9B115] text-[#2B4C7E] border-2 border-[#2B4C7E] rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase hover:scale-[1.02] transition-transform"
                      >
                        <Download size={18} />
                        Baixar ({selectedPhotoIds.length})
                      </button>
                      <button 
                        onClick={() => { setPasswordPurpose('DELETE_PHOTOS_BATCH'); setIsPasswordModalOpen(true); }}
                        className="flex-grow p-3 bg-[#C63D2F] text-white border-2 border-[#2B4C7E] rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase hover:scale-[1.02] transition-transform"
                      >
                        <Trash2 size={18} />
                        Excluir ({selectedPhotoIds.length})
                      </button>
                    </>
                  )}
                </div>
              )}
              
              <input type="file" ref={muralUploadRef} accept="image/*" className="hidden" onChange={handleMuralUpload} multiple />
              <input type="file" ref={faceSearchInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFaceSearchUpload} />
            </div>

            {fetching ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#F9B115]" size={40} /></div>
            ) : filteredMuralPhotos.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <ImageIcon size={64} className="mx-auto mb-4" />
                <p className="font-arena text-2xl uppercase">{matchedPhotoIds ? "Nenhuma correspondência encontrada" : "MURAL VAZIO"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                {filteredMuralPhotos.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => isSelectionMode ? togglePhotoSelection(p.id) : setViewingPhoto(p)}
                    className={`arena-card overflow-hidden bg-white group hover:scale-[1.02] transition-transform relative cursor-pointer ${isSelectionMode && selectedPhotoIds.includes(p.id) ? 'border-[#F9B115] ring-4 ring-[#F9B115]/30' : ''}`}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-30">
                        {selectedPhotoIds.includes(p.id) ? (
                          <div className="bg-[#F9B115] p-1 rounded-lg text-[#2B4C7E] border-2 border-[#2B4C7E] shadow-md animate-fadeIn">
                            <CheckSquare size={20} />
                          </div>
                        ) : (
                          <div className="bg-white/80 backdrop-blur-sm p-1 rounded-lg text-gray-400 border-2 border-gray-300 shadow-md">
                            <Square size={20} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!isSelectionMode && (
                      <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPhoto(p.url, p.id); }} className="p-2 bg-white/90 text-[#2B4C7E] rounded-lg shadow-sm backdrop-blur-sm border border-[#2B4C7E]/20"><Download size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleSharePhoto(p.url); }} className="p-2 bg-[#25D366]/90 text-white rounded-lg shadow-sm backdrop-blur-sm border border-[#25D366]/20"><Share2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPhotoIdToDelete(p.id); setPasswordPurpose('DELETE_PHOTO'); setIsPasswordModalOpen(true); }} className="p-2 bg-[#C63D2F]/90 text-white rounded-lg shadow-sm backdrop-blur-sm border border-[#C63D2F]/20"><Trash2 size={14} /></button>
                      </div>
                    )}

                    <div className="aspect-square relative">
                      <img src={p.url} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === ViewMode.LIST && (
           <div className="space-y-6 animate-fadeIn pb-24">
              <div className="flex flex-col gap-4">
                <div className="bg-white p-4 rounded-[2rem] border-4 border-[#2B4C7E] flex items-center gap-3 shadow-[8px_8px_0px_#2B4C7E]">
                  <Search className="text-[#2B4C7E]" />
                  <input placeholder="PESQUISAR POR NOME OU BLOCO..." className="w-full outline-none font-bold text-[#2B4C7E] placeholder:opacity-30" onChange={e => setSearchTerm(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <select 
                      value={blocoFilter} 
                      onChange={e => setBlocoFilter(e.target.value)}
                      className="w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white appearance-none text-xs uppercase tracking-widest"
                    >
                      <option value="">TODOS OS BLOCOS</option>
                      {blocosDisponiveis.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"><Filter size={16} /></div>
                  </div>
                  <div className="relative">
                    <select 
                      value={cargoFilter} 
                      onChange={e => setCargoFilter(e.target.value)}
                      className="w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 focus:border-[#2B4C7E] outline-none font-bold text-[#2B4C7E] bg-white appearance-none text-xs uppercase tracking-widest"
                    >
                      <option value="">TODOS OS CARGOS</option>
                      {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"><ShieldCheck size={16} /></div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-white p-5 rounded-3xl border-2 border-[#2B4C7E]/30 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:border-[#F9B115] transition-colors group">
                    <div className="w-20 h-20 rounded-2xl border-2 border-[#2B4C7E] overflow-hidden shrink-0 shadow-md">
                      {m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : <User className="p-4 text-gray-200" />}
                    </div>
                    <div className="flex-grow text-center md:text-left space-y-1">
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <h4 className="font-arena text-2xl leading-none text-[#2B4C7E]">{m.nome}</h4>
                        <span className="text-[10px] font-black uppercase text-[#F9B115] bg-[#2B4C7E] px-2 py-0.5 rounded-lg w-fit mx-auto md:mx-0">{m.tipo}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#F9B115]"></div>
                          <span className="text-xs font-bold uppercase text-gray-500">{m.bloco}</span>
                        </div>
                        {m.apto && (
                          <div className="flex items-center gap-1.5">
                            <Home size={12} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-400">APTO: {m.apto}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={12} className="text-green-500" />
                          <span className="text-xs font-bold text-gray-400">{m.celular}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-[#2B4C7E]" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(m.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                       <a href={`https://wa.me/55${m.celular.replace(/\D/g,'')}`} target="_blank" className="flex-grow md:flex-none p-4 bg-[#25D366] text-white rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center"><MessageCircle size={20} /></a>
                       <button onClick={() => { setMemberIdToDelete(m.id); setPasswordPurpose('DELETE'); setIsPasswordModalOpen(true); }} className="flex-grow md:flex-none p-4 bg-[#C63D2F]/10 text-[#C63D2F] rounded-2xl hover:bg-[#C63D2F] hover:text-white transition-all flex items-center justify-center"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {view === ViewMode.STATISTICS && (
           <div className="space-y-10 animate-fadeIn pb-24">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-[#2B4C7E] p-3 rounded-2xl border-b-4 border-r-4 border-[#F9B115] shadow-lg"><BarChart3 className="text-white" size={32} /></div>
                  <div>
                    <h2 className="text-3xl font-arena text-[#2B4C7E]">DASHBOARD ARENA</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Painel de Monitoramento da Folia</p>
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-2xl border-2 border-[#2B4C7E]/10 flex items-center gap-3">
                  <TrendingUp className="text-green-500" size={20} />
                  <span className="text-xs font-bold text-[#2B4C7E] uppercase">Atualizado em Tempo Real</span>
                </div>
              </div>

              {/* Grid de KPIs Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div className="arena-card p-8 bg-white overflow-hidden group relative">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><Users size={120} /></div>
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-1 relative z-10">Total de Foliões</h3>
                  <p className="text-7xl font-arena text-[#2B4C7E] relative z-10">{stats.total}</p>
                  <div className="mt-4 flex items-center gap-2 text-green-500 font-black text-[10px] uppercase bg-green-50 w-fit px-2 py-1 rounded-lg">
                    <TrendingUp size={12} /> Crescendo
                  </div>
                </div>
                
                <div className="arena-card p-8 bg-white border-[#F9B115] shadow-[#F9B115] overflow-hidden group relative">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><ImageIcon size={120} /></div>
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-1 relative z-10">Fotos no Mural</h3>
                  <p className="text-7xl font-arena text-[#F9B115] relative z-10">{eventPhotos.length}</p>
                  <div className="mt-4 flex items-center gap-2 text-[#2B4C7E] font-black text-[10px] uppercase bg-[#F9B115]/10 w-fit px-2 py-1 rounded-lg">
                    <Sparkles size={12} /> Brilhando
                  </div>
                </div>

                <div className="arena-card p-8 bg-white border-[#C63D2F] shadow-[#C63D2F] overflow-hidden group relative md:col-span-1">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><Handshake size={120} /></div>
                  <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-1 relative z-10">Parceiros Ativos</h3>
                  <p className="text-7xl font-arena text-[#C63D2F] relative z-10">{sponsors.length}</p>
                  <div className="mt-4 flex items-center gap-2 text-[#C63D2F] font-black text-[10px] uppercase bg-[#C63D2F]/10 w-fit px-2 py-1 rounded-lg">
                    <ShieldCheck size={12} /> Verificados
                  </div>
                </div>
              </div>

              {/* Gráficos e Seção de Sincronização */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="arena-card p-8 bg-white">
                  <div className="flex items-center gap-3 mb-8 border-b-2 border-gray-100 pb-4">
                    <LayoutGrid size={24} className="text-[#2B4C7E]" />
                    <h4 className="font-arena text-2xl text-[#2B4C7E]">FOLIÕES POR BLOCO</h4>
                  </div>
                  
                  <div className="space-y-6">
                    {stats.byBloco.map(([bloco, count]) => (
                      <div key={bloco} className="space-y-1.5">
                        <div className="flex justify-between items-end px-1">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">{bloco}</span>
                          <span className="font-arena text-[#2B4C7E]">{count}</span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                          <div 
                            className="h-full bg-gradient-to-r from-[#2B4C7E] to-[#F9B115] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${(count / stats.maxBlocoCount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="arena-card p-8 bg-[#2B4C7E] text-white">
                  <div className="flex items-center gap-3 mb-6 border-b-2 border-white/10 pb-4">
                    <CloudDownload size={24} className="text-[#F9B115]" />
                    <h4 className="font-arena text-2xl">CENTRAL DE SINCRONIZAÇÃO</h4>
                  </div>
                  <p className="text-[10px] font-bold opacity-60 uppercase mb-8 leading-relaxed">
                    Use estas ferramentas para salvar seus dados localmente ou restaurá-los em outro dispositivo (Sincronização Manual).
                  </p>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setPasswordPurpose('EXPORT_BACKUP'); setIsPasswordModalOpen(true); }}
                      className="w-full py-4 bg-white/10 hover:bg-white/20 border-2 border-white/20 rounded-2xl flex items-center justify-center gap-3 transition-all font-arena text-xl uppercase"
                    >
                      <Download size={20} /> Exportar Backup
                    </button>
                    <button 
                      onClick={() => { setPasswordPurpose('IMPORT_BACKUP_REQUEST'); setIsPasswordModalOpen(true); }}
                      className="w-full py-4 bg-[#F9B115] hover:bg-[#f9b215e4] text-[#2B4C7E] rounded-2xl flex items-center justify-center gap-3 transition-all font-arena text-xl uppercase shadow-lg"
                    >
                      <CloudUpload size={20} /> Importar e Sincronizar
                    </button>
                    <input 
                      type="file" 
                      ref={importInputRef} 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImportFileChange} 
                    />
                  </div>
                  <div className="mt-8 p-4 bg-black/20 rounded-xl border border-white/10 flex items-start gap-3">
                    <AlertCircle size={20} className="text-[#F9B115] shrink-0" />
                    <p className="text-[9px] font-bold opacity-70 uppercase leading-tight">
                      A importação mesclará os dados novos com os já existentes. É necessária a senha de administrador.
                    </p>
                  </div>
                </div>
              </div>
           </div>
        )}
      </main>

      <footer className="mt-auto py-4 text-center">
        <p className="text-[9px] font-bold text-[#2B4C7E] uppercase tracking-widest opacity-60">
          Desenvolvido por <span className="text-[#C63D2F]">Maycon Dias</span> | v2.2
        </p>
      </footer>

      {/* MODAL DETALHES DO PARCEIRO */}
      {viewingSponsor && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewingSponsor(null)}>
           <div className="arena-card w-full max-w-lg bg-white overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
              <div className="bg-[#2B4C7E] p-6 text-center relative border-b-4 border-[#F9B115]">
                <button onClick={() => setViewingSponsor(null)} className="absolute top-4 right-4 text-white hover:rotate-90 transition-transform"><X size={28} /></button>
                <div className="w-32 h-32 mx-auto bg-white rounded-3xl p-4 shadow-xl -mb-16 border-4 border-[#F9B115] flex items-center justify-center">
                  <img src={viewingSponsor.logo} className="max-w-full max-h-full object-contain" style={{ mixBlendMode: 'multiply' }} />
                </div>
              </div>
              
              <div className="pt-20 p-8 text-center space-y-4">
                <div>
                  <h3 className="font-arena text-3xl text-[#2B4C7E] leading-tight">{viewingSponsor.nome}</h3>
                  <span className="text-[10px] font-black uppercase text-[#C63D2F] tracking-widest">{viewingSponsor.atuacao}</span>
                </div>
                
                {viewingSponsor.descricao && (
                  <p className="text-gray-600 font-bold text-sm leading-relaxed px-4 py-4 bg-gray-50 rounded-2xl italic">
                    "{viewingSponsor.descricao}"
                  </p>
                )}
                
                <div className="flex flex-col gap-3 pt-4">
                  {viewingSponsor.telefone && (
                    <a 
                      href={`https://wa.me/55${viewingSponsor.telefone.replace(/\D/g,'')}`} 
                      target="_blank" 
                      className="btn-arena w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-arena text-xl"
                    >
                      <MessageCircle size={24} /> CHAMAR NO WHATSAPP
                    </a>
                  )}
                  <button onClick={() => setViewingSponsor(null)} className="py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest hover:text-[#C63D2F] transition-colors">FECHAR</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col animate-fadeIn overflow-hidden">
           <div className="flex justify-between items-center p-4 md:p-6 text-white relative z-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Visualizando Foto ({filteredMuralPhotos.findIndex(p => p.id === viewingPhoto.id) + 1} de {filteredMuralPhotos.length})</span>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleDownloadPhoto(viewingPhoto.url, viewingPhoto.id)} className="p-2 bg-white/10 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all text-xs font-bold"><Download size={14} /> <span className="hidden md:inline">Baixar</span></button>
                  <button onClick={() => handleSharePhoto(viewingPhoto.url)} className="p-2 bg-white/10 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all text-xs font-bold"><Share2 size={14} /> <span className="hidden md:inline">Enviar</span></button>
                  <button onClick={() => { setPhotoIdToDelete(viewingPhoto.id); setPasswordPurpose('DELETE_PHOTO'); setIsPasswordModalOpen(true); }} className="p-2 bg-white/10 rounded-xl flex items-center gap-2 hover:bg-red-500 transition-all text-xs font-bold"><Trash2 size={14} /> <span className="hidden md:inline">Deletar</span></button>
                </div>
              </div>
              <button onClick={() => setViewingPhoto(null)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"><X size={32} /></button>
           </div>
           
           <div className="flex-grow flex items-center justify-between p-2 md:p-4 relative">
              <button onClick={(e) => { e.stopPropagation(); navigatePhoto('prev'); }} className="absolute left-2 md:left-4 z-50 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"><ChevronLeft size={32} /></button>
              <div className="w-full h-full flex items-center justify-center p-4">
                <img key={viewingPhoto.id} src={viewingPhoto.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-zoomIn" />
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigatePhoto('next'); }} className="absolute right-2 md:right-4 z-50 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"><ChevronRight size={32} /></button>
           </div>
        </div>
      )}

      {infoMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border-4 border-[#2B4C7E] rounded-[2rem] shadow-[12px_12px_0px_#C63D2F] w-full max-w-sm overflow-hidden flex flex-col items-center text-center p-8 animate-slideUp">
            <div className="bg-[#F9E7C7] p-4 rounded-full mb-6 border-4 border-[#F9B115]"><AlertCircle size={48} className="text-[#C63D2F]" /></div>
            <h3 className="font-arena text-2xl text-[#2B4C7E] mb-2 leading-tight uppercase">Atenção!</h3>
            <p className="font-bold text-gray-600 mb-8">{infoMessage}</p>
            <button onClick={() => setInfoMessage(null)} className="btn-arena w-full py-4 rounded-2xl font-arena text-xl uppercase">ENTENDI!</button>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="arena-card w-full max-sm bg-white p-8 animate-slideUp">
            <h3 className="font-arena text-2xl mb-4 text-center text-[#2B4C7E]">ACESSO RESTRITO</h3>
            <p className="text-[10px] font-bold text-gray-400 text-center mb-6 uppercase tracking-widest">Digite a senha de administrador</p>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={inputStyles} placeholder="SENHA" autoFocus onKeyDown={e => e.key === 'Enter' && handleConfirmPassword()} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setIsPasswordModalOpen(false); setMemberIdToDelete(null); setPhotoIdToDelete(null); setSponsorIdToDelete(null); setSponsorIdToEdit(null); }} className="flex-grow py-3 border-2 border-gray-200 rounded-xl font-bold uppercase text-[10px] tracking-widest text-[#000] bg-gray-50 hover:bg-gray-100 transition-colors">Sair</button>
              <button onClick={handleConfirmPassword} className="btn-arena flex-grow py-3 rounded-xl font-arena text-lg uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-[#2B4C7E] border-t-4 border-[#F9B115] p-4 sticky bottom-0 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-around text-white">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center transition-all ${view === ViewMode.HOME ? 'text-[#F9B115] scale-110' : 'opacity-50 hover:opacity-100'}`}><Home size={24} /><span className="text-[7px] font-black mt-1 uppercase">Início</span></button>
          <button onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }} className={`flex flex-col items-center transition-all ${view === ViewMode.REGISTER ? 'text-[#F9B115] scale-110' : 'opacity-50 hover:opacity-100'}`}><UserPlus size={24} /><span className="text-[7px] font-black mt-1 uppercase">Inscrição</span></button>
          <button onClick={() => setView(ViewMode.PHOTOS)} className={`flex flex-col items-center transition-all ${view === ViewMode.PHOTOS ? 'text-[#F9B115] scale-110' : 'opacity-50 hover:opacity-100'}`}><ImageIcon size={24} /><span className="text-[7px] font-black mt-1 uppercase">Mural</span></button>
          <button onClick={() => setView(ViewMode.SPONSORS)} className={`flex flex-col items-center transition-all ${view === ViewMode.SPONSORS ? 'text-[#F9B115] scale-110' : 'opacity-50 hover:opacity-100'}`}><Handshake size={24} /><span className="text-[7px] font-black mt-1 uppercase">Parceiros</span></button>
          <button onClick={() => setView(ViewMode.STATISTICS)} className={`flex flex-col items-center transition-all ${view === ViewMode.STATISTICS ? 'text-[#F9B115] scale-110' : 'opacity-50 hover:opacity-100'}`}><BarChart3 size={24} /><span className="text-[7px] font-black mt-1 uppercase">Dados</span></button>
          <button onClick={() => { setPasswordPurpose('VIEW_LIST'); setIsPasswordModalOpen(true); }} className={`flex flex-col items-center transition-all ${view === ViewMode.LIST ? 'text-[#F9B115] scale-110' : 'opacity-50 hover:opacity-100'}`}><Users size={24} /><span className="text-[7px] font-black mt-1 uppercase">Lista</span></button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-zoomIn { animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .btn-arena:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
        input[type=range].accent-[#C63D2F]::-webkit-slider-thumb {
          background: #C63D2F;
          border: 2px solid white;
          box-shadow: 2px 2px 0px #2B4C7E;
        }
      `}} />
    </div>
  );
};

export default App;
