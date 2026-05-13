'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Server, Play, Square, RotateCcw, Trash2, Terminal,
  FileText, Upload, Cpu, HardDrive, Activity, ArrowLeft,
  Loader2, Send, FolderOpen, File, Pencil, X, ChevronRight,
  RefreshCw, Rocket,
} from 'lucide-react';
import { serversApi } from '@/lib/api';
import toast from 'react-hot-toast';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ServerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'console' | 'logs' | 'files'>('overview');

  // Console state
  const [command, setCommand] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>(['Connecté au serveur...', 'Tapez une commande pour commencer.']);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Deploy state
  const [deployedFile, setDeployedFile] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  // File manager state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // File editor state
  const [editFile, setEditFile] = useState<{ name: string; path: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const getToken = () => (session?.user as any)?.accessToken || localStorage.getItem('auth_token') || '';

  // Fetch server
  const { data, isLoading } = useQuery({
    queryKey: ['server', id],
    queryFn: () => serversApi.getOne(id as string),
    refetchInterval: 5000,
  });

  const rawBody = (data as any)?.data;
  const server = rawBody?.data || rawBody;

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['server-stats', id],
    queryFn: () =>
      fetch(`/api/servers/${id}/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
    refetchInterval: 3000,
  });
  const stats = (statsData as any)?.data;

  // Load initial logs
  useEffect(() => {
    fetch(`/api/servers/${id}/logs`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d?.data?.logs) setLogs(d.data.logs); });
  }, [id]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleOutput]);

  // Load files when tab opens or path changes
  const loadFilesForPath = async (p: string) => {
    setFilesLoading(true);
    try {
      const url = p
        ? `/api/servers/${id}/files?path=${encodeURIComponent(p)}`
        : `/api/servers/${id}/files`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      setFiles(d?.data?.files || []);
    } catch {
      setFiles([]);
    }
    setFilesLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'files') loadFilesForPath(currentPath);
  }, [activeTab]);

  // Mutations
  const startMutation = useMutation({
    mutationFn: () => serversApi.start(id as string),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['server', id] }); toast.success('Serveur démarré !'); },
  });

  const stopMutation = useMutation({
    mutationFn: () => serversApi.stop(id as string),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['server', id] }); toast.success('Serveur arrêté !'); },
  });

  const restartMutation = useMutation({
    mutationFn: () => serversApi.restart(id as string),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['server', id] }); toast.success('Serveur redémarré !'); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => serversApi.delete(id as string),
    onSuccess: () => { router.push('/dashboard/servers'); toast.success('Serveur supprimé !'); },
  });

  // Console command
  const sendCommand = async () => {
    if (!command.trim()) return;
    const cmd = command.trim();
    setConsoleOutput(prev => [...prev, `$ ${cmd}`]);
    setCommand('');
    try {
      const res = await fetch(`/api/servers/${id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ command: cmd }),
      });
      const d = await res.json();
      if (d?.data?.output) {
        setConsoleOutput(prev => [...prev, ...d.data.output.split('\n').filter(Boolean)]);
      } else {
        setConsoleOutput(prev => [...prev, d?.message || 'Commande exécutée']);
      }
    } catch {
      setConsoleOutput(prev => [...prev, 'Erreur lors de l\'exécution']);
    }
  };

  // Deploy uploaded files
  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch(`/api/servers/${id}/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (d.success) {
        toast.success('Déploiement lancé !');
        setConsoleOutput(prev => [
          ...prev,
          `[✓] Déploiement lancé — ${deployedFile}`,
          '[INFO] Fichiers copiés vers /app/ dans le container',
          '[INFO] Consultez les Logs pour suivre l\'exécution',
        ]);
      } else {
        toast.error(d.message || 'Erreur déploiement');
        setConsoleOutput(prev => [...prev, `[✗] ${d.message || 'Erreur de déploiement'}`]);
      }
    } catch {
      toast.error('Erreur déploiement');
      setConsoleOutput(prev => [...prev, '[✗] Erreur de connexion']);
    }
    setDeploying(false);
  };

  // Stop deployed app
  const handleStopApp = async () => {
    try {
      const res = await fetch(`/api/servers/${id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ command: "pkill -f 'node /app' 2>/dev/null; pkill -f 'python3 /app' 2>/dev/null; echo 'Stopped'" }),
      });
      const d = await res.json();
      toast.success('Application arrêtée');
      setConsoleOutput(prev => [...prev, '[✓] Application arrêtée']);
      setDeployedFile(null);
    } catch {
      toast.error('Erreur');
    }
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/servers/${id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const d = await res.json();
      if (d.success || res.ok) {
        toast.success(`${file.name} uploadé !`);
        setDeployedFile(file.name);
        setConsoleOutput(prev => [
          ...prev,
          `[✓] Fichier chargé: ${file.name}`,
          '[INFO] Allez dans Console → cliquez Démarrer pour déployer',
        ]);
        if (activeTab === 'files') loadFilesForPath(currentPath);
      } else {
        toast.error(d.message || 'Erreur upload');
      }
    } catch {
      toast.error('Erreur upload');
    }
    setUploadingFile(false);
  };

  // Open file editor
  const openEditor = async (file: any) => {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    try {
      const res = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (d.success) {
        setEditFile({ name: file.name, path: filePath });
        setEditContent(d.data?.content || '');
        setEditName(file.name);
      } else {
        toast.error('Impossible de lire le fichier');
      }
    } catch {
      toast.error('Erreur lecture fichier');
    }
  };

  // Save file
  const saveFileContent = async () => {
    if (!editFile) return;
    setEditSaving(true);
    try {
      const renamed = editName !== editFile.name;
      const res = await fetch(`/api/servers/${id}/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          path: editFile.path,
          content: editContent,
          ...(renamed ? { newName: editName } : {}),
        }),
      });
      const d = await res.json();
      if (d.success || res.ok) {
        toast.success('Fichier sauvegardé !');
        setEditFile(null);
        loadFilesForPath(currentPath);
      } else {
        toast.error(d.message || 'Erreur sauvegarde');
      }
    } catch {
      toast.error('Erreur');
    }
    setEditSaving(false);
  };

  // Delete file or folder
  const deleteFileEntry = async (file: any) => {
    if (!confirm(`Supprimer "${file.name}" ?`)) return;
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    try {
      const res = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (d.success || res.ok) {
        toast.success('Supprimé !');
        loadFilesForPath(currentPath);
      } else {
        toast.error(d.message || 'Erreur suppression');
      }
    } catch {
      toast.error('Erreur');
    }
  };

  // Navigate into folder
  const navigateTo = (p: string) => {
    setCurrentPath(p);
    loadFilesForPath(p);
  };

  // Breadcrumb parts
  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  if (!server || !server.id) return (
    <div className="text-center py-16">
      <p className="text-gray-400">Serveur non trouvé</p>
      <button onClick={() => router.push('/dashboard/servers')} className="btn-primary mt-4">Retour</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push('/dashboard/servers')}
          className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors mt-0.5 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{server.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
              server.status === 'ONLINE' ? 'bg-green-500/20 text-green-400' :
              server.status === 'OFFLINE' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>{server.status}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex-shrink-0">{server.plan}</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{server.domain}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {server.status !== 'ONLINE' ? (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20"
              title="Démarrer"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20"
              title="Arrêter"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10"
            title="Redémarrer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (confirm('Supprimer ce serveur ?')) deleteMutation.mutate(); }}
            className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-red-500/10 hover:text-red-400"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto scrollbar-hide">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: Activity },
          { key: 'console', label: 'Console', icon: Terminal },
          { key: 'logs', label: 'Logs', icon: FileText },
          { key: 'files', label: 'Fichiers', icon: FolderOpen },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.key ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: 'CPU', value: `${stats?.cpuUsage?.toFixed(1) || server.cpuUsage?.toFixed(1) || 0}%`, icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10', bar: stats?.cpuUsage || 0 },
            { label: 'RAM', value: `${stats?.ramUsage?.toFixed(1) || server.ramUsage?.toFixed(1) || 0}%`, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', bar: stats?.ramUsage || 0 },
            { label: 'Stockage', value: `${server.storageUsed || 0}/${server.storageTotal || 10} GB`, icon: HardDrive, color: 'text-green-400', bg: 'bg-green-500/10', bar: ((server.storageUsed || 0) / (server.storageTotal || 10)) * 100 },
            { label: 'Plan', value: server.plan, icon: Server, color: 'text-orange-400', bg: 'bg-orange-500/10', bar: 0 },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111118] border border-white/5 rounded-xl p-3 sm:p-4">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2 sm:mb-3`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
              {stat.bar > 0 && (
                <div className="w-full h-1 bg-white/10 rounded-full mt-2">
                  <div className={`h-full rounded-full ${stat.color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(stat.bar, 100)}%` }} />
                </div>
              )}
            </div>
          ))}
          <div className="col-span-2 bg-[#111118] border border-white/5 rounded-xl p-3 sm:p-4">
            <h3 className="text-sm font-medium text-white mb-3">Informations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div><span className="text-gray-400">ID : </span><span className="text-white font-mono text-xs">{server.id}</span></div>
              <div><span className="text-gray-400">Domaine : </span><span className="text-white break-all">{server.domain || '—'}</span></div>
              <div><span className="text-gray-400">Localisation : </span><span className="text-white">{server.location || '—'}</span></div>
              <div><span className="text-gray-400">Coût : </span><span className="text-white">{server.coinsPerDay} Coins/jour</span></div>
              <div><span className="text-gray-400">Créé le : </span><span className="text-white">{new Date(server.createdAt).toLocaleDateString()}</span></div>
              <div><span className="text-gray-400">Docker ID : </span><span className="text-white font-mono text-xs">{server.dockerId?.substring(0, 12) || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Console */}
      {activeTab === 'console' && (
        <div className="space-y-3">
          {/* Deploy controls */}
          <div className="bg-[#111118] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${deployedFile ? 'bg-green-400' : 'bg-gray-600'}`} />
              <span className="text-xs text-gray-400 truncate">
                {deployedFile ? `Chargé: ${deployedFile}` : 'Aucun fichier chargé — uploadez via Fichiers'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDeploy}
                disabled={!deployedFile || deploying || server.status !== 'ONLINE'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                Démarrer
              </button>
              <button
                onClick={handleStopApp}
                disabled={!deployedFile || server.status !== 'ONLINE'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                <Square className="w-3 h-3" />
                Arrêter
              </button>
            </div>
          </div>

          {/* Terminal */}
          <div className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#111118]">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400 ml-2 truncate">Console — {server.name}</span>
            </div>
            <div ref={consoleRef} className="h-72 sm:h-96 overflow-y-auto p-3 sm:p-4 font-mono text-xs sm:text-sm">
              {consoleOutput.map((line, i) => (
                <div key={i} className={`mb-1 break-all ${
                  line.startsWith('$') ? 'text-green-400' :
                  line.includes('[✓]') ? 'text-green-300' :
                  line.includes('[✗]') || line.toLowerCase().includes('error') ? 'text-red-400' :
                  line.includes('[INFO]') ? 'text-blue-300' :
                  'text-gray-300'
                }`}>
                  {line}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 sm:p-3 border-t border-white/10 bg-[#111118]">
              <span className="text-green-400 font-mono text-sm flex-shrink-0">$</span>
              <input
                className="flex-1 bg-transparent text-white font-mono text-xs sm:text-sm outline-none"
                placeholder="Tapez une commande..."
                value={command}
                onChange={e => setCommand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendCommand()}
              />
              <button onClick={sendCommand} className="p-1.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 flex-shrink-0">
                <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#111118]">
            <span className="text-xs text-gray-400 truncate">Logs — {server.name}</span>
            <button
              onClick={() => {
                fetch(`/api/servers/${id}/logs`, { headers: { Authorization: `Bearer ${getToken()}` } })
                  .then(r => r.json()).then(d => { if (d?.data?.logs) setLogs(d.data.logs); });
              }}
              className="text-xs text-purple-400 hover:text-purple-300 flex-shrink-0 ml-2"
            >
              Actualiser
            </button>
          </div>
          <div className="h-72 sm:h-96 overflow-y-auto p-3 sm:p-4 font-mono text-xs sm:text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Aucun log disponible</p>
            ) : logs.map((log, i) => (
              <div key={i} className={`mb-1 break-all ${
                log.toLowerCase().includes('error') ? 'text-red-400' :
                log.toLowerCase().includes('warn') ? 'text-yellow-400' :
                'text-gray-300'
              }`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {activeTab === 'files' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-white/10 gap-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs sm:text-sm min-w-0 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigateTo('')}
                className="text-purple-400 hover:text-purple-300 flex-shrink-0 font-medium"
              >
                /
              </button>
              {breadcrumbParts.map((part, i) => (
                <span key={i} className="flex items-center gap-1 flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                  <button
                    onClick={() => navigateTo(breadcrumbParts.slice(0, i + 1).join('/'))}
                    className="text-gray-400 hover:text-white"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => loadFilesForPath(currentPath)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                title="Actualiser"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-xs disabled:opacity-60"
              >
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {/* File list */}
          <div className="p-2 min-h-[200px]">
            {filesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-10">
                <FolderOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun fichier</p>
                <p className="text-gray-600 text-xs mt-1">Uploadez des fichiers ou un archive .zip</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {/* Parent directory */}
                {currentPath && (
                  <button
                    onClick={() => {
                      const parts = currentPath.split('/').filter(Boolean);
                      parts.pop();
                      navigateTo(parts.join('/'));
                    }}
                    className="flex items-center gap-3 p-2 w-full hover:bg-white/5 rounded-lg text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-400">..</span>
                  </button>
                )}
                {files.map(file => (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group"
                  >
                    {file.isDir
                      ? <FolderOpen className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      : <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => {
                        if (file.isDir) {
                          navigateTo(currentPath ? `${currentPath}/${file.name}` : file.name);
                        } else {
                          openEditor(file);
                        }
                      }}
                    >
                      <span className="text-sm text-gray-200">{file.name}</span>
                      {!file.isDir && (
                        <span className="text-xs text-gray-600 ml-2">{formatFileSize(file.size)}</span>
                      )}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!file.isDir && (
                        <button
                          onClick={() => openEditor(file)}
                          className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteFileEntry(file)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File editor modal */}
      {editFile && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111118] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Editor header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  className="bg-transparent text-white text-sm font-medium outline-none border-b border-transparent focus:border-purple-500 transition-colors min-w-0 flex-1"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="nom-du-fichier"
                  spellCheck={false}
                />
                {editName !== editFile.name && (
                  <span className="text-xs text-yellow-400 flex-shrink-0">Renommer</span>
                )}
              </div>
              <button
                onClick={() => setEditFile(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editor body */}
            <textarea
              className="flex-1 bg-[#0a0a0f] text-gray-200 font-mono text-xs sm:text-sm p-4 outline-none resize-none"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{ minHeight: '300px', maxHeight: '60vh' }}
              spellCheck={false}
              autoComplete="off"
            />

            {/* Editor footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 flex-shrink-0">
              <span className="text-xs text-gray-500">{editContent.split('\n').length} lignes · {editContent.length} caractères</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditFile(null)} className="btn-secondary text-xs px-3 py-1.5">
                  Annuler
                </button>
                <button onClick={saveFileContent} disabled={editSaving} className="btn-primary text-xs px-3 py-1.5">
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
