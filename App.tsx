
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
  FileJson,
  MousePointerClick
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
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  
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
          clicks: originalSponsor?.clicks || 0,
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
          clicks: 0,
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

  const handleSponsorClick = async (sponsor: Sponsor) => {
    // Atualiza a UI otimisticamente
    setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, clicks: (s.clicks || 0) + 1 } : s));
    setViewingSponsor(sponsor);
    
    // Atualiza no backend sem bloquear a UI
    try {
      await databaseService.incrementSponsorClicks(sponsor.id);
    } catch (error) {
      console.error("Falha ao contabilizar clique:", error);
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
      <header className="bg-[#2B4C7E] text-white py-4 md:py-6 shadow-xl border-b-4 border-[#F9B115] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-center">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95" 
            onClick={() => setView(ViewMode.HOME)}
          >
            <img 
              src="https://github.com/mdiasonline/CADASTRO-DEIXA-O-ARENA-ME-LEVAR/blob/main/ICONE_TITULO.png?raw=true" 
              className="w-16 h-16 md:w-24 md:h-24 object-contain drop-shadow-md"
              alt="Logo Arena"
            />
            <div className="flex flex-col text-left">
              <h1 className="text-2xl md:text-5xl font-arena tracking-tighter leading-tight">
                DEIXA O <span className="text-[#F9B115]">ARENA ME LEVAR</span>
              </h1>
              <div className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] opacity-80 -mt-1 ml-1">
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
                    onClick={() => handleSponsorClick(s)}
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
                     
                     {/* Contador de Visualizações */}
                     <div className="absolute top-2 left-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-[9px] font-black text-gray-500 border border-gray-200">
                       <MousePointerClick size={10} />
                       {s.clicks || 0}
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
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-3xl font-arena text-[#F9B115] uppercase flex items-center gap-2">
                <ImageIcon size={32} /> Mural da Folia
              </h2>
              <div className="flex flex-wrap justify-center gap-2">
                 <button onClick={() => muralUploadRef.current?.click()} className="btn-arena px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                   <Upload size={16} /> POSTAR FOTO
                 </button>
                 <input type="file" ref={muralUploadRef} multiple accept="image/*" className="hidden" onChange={handleMuralUpload} />
                 
                 <button onClick={() => faceSearchInputRef.current?.click()} className="btn-arena px-4 py-2 rounded-xl text-sm flex items-center gap-2 bg-[#2B4C7E]">
                   <ScanFace size={16} /> ACHAR MEU ROSTO
                 </button>
                 <input type="file" ref={faceSearchInputRef} accept="image/*" className="hidden" onChange={handleFaceSearchUpload} />

                 <button onClick={() => { setPasswordPurpose('DELETE_PHOTOS_BATCH'); setIsSelectionMode(!isSelectionMode); }} className={`btn-arena px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${isSelectionMode ? 'bg-red-500' : 'bg-gray-500'}`}>
                   {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />} {isSelectionMode ? 'CANCELAR' : 'SELECIONAR'}
                 </button>
              </div>
            </div>

            {matchedPhotoIds && (
               <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r flex justify-between items-center animate-slideUp">
                  <div className="flex items-center gap-3">
                     <ScanFace className="text-green-600" size={24} />
                     <div>
                       <h3 className="font-bold text-green-800">Busca Facial Concluída</h3>
                       <p className="text-sm text-green-700">Encontramos {matchedPhotoIds.length} fotos suas!</p>
                     </div>
                  </div>
                  <button onClick={clearFaceFilter} className="p-2 hover:bg-green-100 rounded-full text-green-700"><X size={20} /></button>
               </div>
            )}
            
            {isSelectionMode && selectedPhotoIds.length > 0 && (
              <div className="sticky top-24 z-30 bg-[#2B4C7E] text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-slideUp">
                <span className="font-bold">{selectedPhotoIds.length} selecionadas</span>
                <div className="flex gap-2">
                   <button onClick={handleDownloadSelected} className="p-2 bg-white/20 rounded-lg hover:bg-white/30"><Download size={20} /></button>
                   <button onClick={() => setIsPasswordModalOpen(true)} className="p-2 bg-red-500 rounded-lg hover:bg-red-600"><Trash2 size={20} /></button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {filteredMuralPhotos.map(photo => (
                 <div key={photo.id} className={`aspect-square relative group rounded-xl overflow-hidden cursor-pointer ${selectedPhotoIds.includes(photo.id) ? 'ring-4 ring-[#F9B115]' : ''}`} onClick={() => isSelectionMode ? togglePhotoSelection(photo.id) : setViewingPhoto(photo)}>
                   <img src={photo.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
                   {isSelectionMode && (
                     <div className="absolute top-2 right-2">
                       {selectedPhotoIds.includes(photo.id) ? <CheckCheck className="text-[#F9B115] fill-white" size={24} /> : <Square className="text-white drop-shadow-md" size={24} />}
                     </div>
                   )}
                   {!isSelectionMode && (
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="text-white" size={32} />
                     </div>
                   )}
                 </div>
               ))}
            </div>
            {filteredMuralPhotos.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ImageIcon size={64} className="mx-auto mb-4" />
                <p className="font-arena text-2xl">Nenhuma foto no mural...</p>
              </div>
            )}
          </div>
        )}

        {view === ViewMode.STATISTICS && (
           <div className="space-y-6 animate-fadeIn">
              <h2 className="text-3xl font-arena text-[#2B4C7E] uppercase flex items-center gap-2 mb-6">
                <BarChart3 size={32} /> Estatísticas da Folia
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="arena-card bg-white p-6 flex flex-col items-center justify-center">
                    <Users size={40} className="text-[#2B4C7E] mb-2" />
                    <h3 className="text-4xl font-black text-[#2B4C7E]">{stats.total}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total de Foliões</p>
                 </div>
                 <div className="arena-card bg-white p-6 flex flex-col items-center justify-center">
                    <LayoutGrid size={40} className="text-[#F9B115] mb-2" />
                    <h3 className="text-4xl font-black text-[#F9B115]">{stats.byBloco.length}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Blocos Ativos</p>
                 </div>
                 <div className="arena-card bg-white p-6 flex flex-col items-center justify-center">
                    <Trophy size={40} className="text-[#C63D2F] mb-2" />
                    <h3 className="text-2xl font-black text-[#C63D2F] text-center">{stats.byBloco[0]?.[0] || '-'}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Maior Bloco</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="arena-card bg-white p-6">
                    <h3 className="font-arena text-xl text-[#2B4C7E] mb-4 flex items-center gap-2"><PieChart size={20}/> Foliões por Bloco</h3>
                    <div className="space-y-3">
                       {stats.byBloco.map(([bloco, count]) => (
                         <div key={bloco}>
                            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                               <span>{bloco}</span>
                               <span>{count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                               <div className="bg-[#2B4C7E] h-2.5 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }}></div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="arena-card bg-white p-6">
                    <h3 className="font-arena text-xl text-[#C63D2F] mb-4 flex items-center gap-2"><TrendingUp size={20}/> Distribuição por Cargo</h3>
                    <div className="space-y-3">
                       {stats.byCargo.map(([cargo, count]) => (
                         <div key={cargo}>
                            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                               <span>{cargo}</span>
                               <span>{count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                               <div className="bg-[#C63D2F] h-2.5 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }}></div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}

        {view === ViewMode.LIST && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-3xl font-arena text-[#2B4C7E] uppercase">Lista de Inscritos</h2>
              <div className="flex gap-2">
                 <button onClick={() => { setPasswordPurpose('IMPORT_BACKUP_REQUEST'); setIsPasswordModalOpen(true); }} className="btn-arena px-4 py-2 rounded-xl text-sm flex items-center gap-2 bg-green-600">
                    <CloudUpload size={16} /> IMPORTAR
                 </button>
                 <input type="file" ref={importInputRef} accept=".json" className="hidden" onChange={handleImportFileChange} />
                 
                 <button onClick={() => { setPasswordPurpose('EXPORT_BACKUP'); setIsPasswordModalOpen(true); }} className="btn-arena px-4 py-2 rounded-xl text-sm flex items-center gap-2 bg-blue-600">
                    <CloudDownload size={16} /> EXPORTAR
                 </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
               <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou bloco..." className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-[#2B4C7E]/20" />
               </div>
               <select value={blocoFilter} onChange={e => setBlocoFilter(e.target.value)} className="px-4 py-2 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-[#2B4C7E]/20">
                  <option value="">Todos os Blocos</option>
                  {blocosDisponiveis.map(b => <option key={b} value={b}>{b}</option>)}
               </select>
               <select value={cargoFilter} onChange={e => setCargoFilter(e.target.value)} className="px-4 py-2 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-[#2B4C7E]/20">
                  <option value="">Todos os Cargos</option>
                  {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                     <tr>
                       <th className="p-4">Folião</th>
                       <th className="p-4">Bloco</th>
                       <th className="p-4">Contato</th>
                       <th className="p-4 text-right">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {filteredMembers.map(member => (
                       <tr key={member.id} className="hover:bg-gray-50">
                         <td className="p-4 flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                             {member.photo ? <img src={member.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-400" />}
                           </div>
                           <div>
                             <div className="font-bold text-[#2B4C7E]">{member.nome}</div>
                             <div className="text-[10px] text-gray-400 uppercase">{member.tipo} {member.apto && `• ${member.apto}`}</div>
                           </div>
                         </td>
                         <td className="p-4 font-medium text-gray-600">{member.bloco}</td>
                         <td className="p-4 font-mono text-gray-500">{member.celular}</td>
                         <td className="p-4 text-right">
                           <button onClick={() => { setMemberIdToDelete(member.id); setPasswordPurpose('DELETE'); setIsPasswordModalOpen(true); }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {filteredMembers.length === 0 && <div className="p-10 text-center text-gray-400 font-arena">Nenhum folião encontrado.</div>}
            </div>
          </div>
        )}

      </main>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-scaleIn">
            <div className="text-center mb-6">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-500">
                 <ShieldCheck size={32} className="text-red-600" />
               </div>
               <h3 className="text-2xl font-arena text-[#2B4C7E]">ACESSO RESTRITO</h3>
               <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mt-1">Digite a senha da administração</p>
            </div>
            <input 
              type="password" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              className="w-full px-5 py-3 rounded-xl border-2 border-[#2B4C7E]/20 text-center font-black text-2xl tracking-widest text-[#2B4C7E] mb-6 focus:border-[#2B4C7E] outline-none"
              placeholder="••••••••"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase hover:bg-gray-300">Cancelar</button>
              <button onClick={handleConfirmPassword} className="flex-1 py-3 bg-[#2B4C7E] text-white rounded-xl font-bold uppercase hover:bg-[#1a365d]">Acessar</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col justify-center items-center animate-fadeIn">
           <button onClick={() => setViewingPhoto(null)} className="absolute top-4 right-4 text-white/50 hover:text-white p-2"><X size={32} /></button>
           <button onClick={() => navigatePhoto('prev')} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 hidden md:block"><ChevronLeft size={48} /></button>
           <button onClick={() => navigatePhoto('next')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 hidden md:block"><ChevronRight size={48} /></button>
           
           <img src={viewingPhoto.url} className="max-w-full max-h-[80vh] object-contain shadow-2xl" />
           
           <div className="absolute bottom-8 flex gap-6">
              <button onClick={() => handleDownloadPhoto(viewingPhoto.url, viewingPhoto.id)} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Download size={24} /><span className="text-[10px] uppercase font-bold">Baixar</span></button>
              <button onClick={() => handleSharePhoto(viewingPhoto.url)} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Share2 size={24} /><span className="text-[10px] uppercase font-bold">Compartilhar</span></button>
              <button onClick={() => { setPhotoIdToDelete(viewingPhoto.id); setPasswordPurpose('DELETE_PHOTO'); setIsPasswordModalOpen(true); }} className="flex flex-col items-center gap-1 text-red-400 hover:text-red-500"><Trash2 size={24} /><span className="text-[10px] uppercase font-bold">Excluir</span></button>
           </div>
        </div>
      )}

      {/* Sponsor Viewer */}
      {viewingSponsor && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewingSponsor(null)}>
           <div className="bg-white rounded-3xl p-8 max-w-md w-full relative animate-scaleIn text-center" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingSponsor(null)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"><X size={24} /></button>
              <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center">
                 <img src={viewingSponsor.logo} className="max-w-full max-h-full object-contain" style={{ mixBlendMode: 'multiply' }} />
              </div>
              <h2 className="font-arena text-3xl text-[#2B4C7E] mb-2">{viewingSponsor.nome}</h2>
              <p className="text-[#C63D2F] font-black uppercase tracking-widest text-xs mb-6">{viewingSponsor.atuacao}</p>
              
              {viewingSponsor.descricao && (
                <div className="bg-gray-50 p-4 rounded-xl text-gray-600 text-sm mb-6 leading-relaxed">
                   {viewingSponsor.descricao}
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                 <a href={`https://wa.me/55${viewingSponsor.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn-arena px-6 py-3 rounded-xl flex items-center gap-2 bg-[#25D366] text-white">
                    <MessageCircle size={20} /> WHATSAPP
                 </a>
              </div>
           </div>
        </div>
      )}

      {/* Notifications */}
      {infoMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2B4C7E] text-white px-6 py-3 rounded-full shadow-2xl z-[80] flex items-center gap-3 animate-slideUp" onAnimationEnd={() => setTimeout(() => setInfoMessage(null), 3000)}>
           <Info size={20} className="text-[#F9B115]" />
           <span className="font-bold text-sm">{infoMessage}</span>
        </div>
      )}

    </div>
  );
};

export default App;
