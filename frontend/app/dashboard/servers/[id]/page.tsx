'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Server, Play, Square, RotateCcw, Trash2, Terminal,
  FileText, Upload, Cpu, HardDrive, Activity, ArrowLeft,
  Loader2, Send, FolderOpen, File,
} from 'lucide-react';
import { serversApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ServerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'console' | 'logs' | 'files'>('overview');
  const [command, setCommand] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>(['Connecté au serveur...', 'Tapez une commande pour commencer.']);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['server', id],
    queryFn: () => serversApi.getOne ? serversApi.getOne(id as string) : fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${(session?.user as any)?.accessToken}` } }).then(r => r.json()),
    refetchInterval: 5000,
  });

  const server = (data as any)?.data || (data as any);

  const { data: statsData } = useQuery({
    queryKey: ['server-stats', id],
    queryFn: () => fetch(`/api/servers/${id}/stats`, { headers: { Authorization: `Bearer ${(session?.user as any)?.accessToken || localStorage.getItem('auth_token')}` } }).then(r => r.json()),
    refetchInterval: 3000,
  });

  const stats = (statsData as any)?.data;

  useEffect(() => {
    fetch(`/api/servers/${id}/logs`, {
      headers: { Authorization: `Bearer ${(session?.user as any)?.accessToken || localStorage.getItem('auth_token')}` }
    }).then(r => r.json()).then(d => {
      if (d?.data?.logs) setLogs(d.data.logs);
    });
  }, [id]);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleOutput]);

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

  const sendCommand = async () => {
    if (!command.trim()) return;
    const cmd = command.trim();
    setConsoleOutput(prev => [...prev, `$ ${cmd}`]);
    setCommand('');
    try {
      const token = (session?.user as any)?.accessToken || localStorage.getItem('auth_token');
      const res = await fetch(`/api/servers/${id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (data?.data?.output) {
        setConsoleOutput(prev => [...prev, ...data.data.output.split('\n').filter(Boolean)]);
      } else {
        setConsoleOutput(prev => [...prev, data?.message || 'Commande exécutée']);
      }
    } catch {
      setConsoleOutput(prev => [...prev, 'Erreur lors de l\'exécution de la commande']);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const token = (session?.user as any)?.accessToken || localStorage.getItem('auth_token');
    try {
      await fetch(`/api/servers/${id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      toast.success(`${file.name} uploadé !`);
    } catch {
      toast.error('Erreur lors de l\'upload');
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  if (!server) return (
    <div className="text-center py-16">
      <p className="text-gray-400">Serveur non trouvé</p>
      <button onClick={() => router.push('/dashboard/servers')} className="btn-primary mt-4">Retour</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/servers')} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{server.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${
              server.status === 'ONLINE' ? 'bg-green-500/20 text-green-400' :
              server.status === 'OFFLINE' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>{server.status}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">{server.plan}</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{server.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          {server.status !== 'ONLINE' ? (
            <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20">
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20">
              <Square className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => restartMutation.mutate()} disabled={restartMutation.isPending} className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => { if (confirm('Supprimer ce serveur ?')) deleteMutation.mutate(); }} className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-red-500/10 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: Activity },
          { key: 'console', label: 'Console', icon: Terminal },
          { key: 'logs', label: 'Logs', icon: FileText },
          { key: 'files', label: 'Fichiers', icon: FolderOpen },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'CPU', value: `${stats?.cpuUsage?.toFixed(1) || server.cpuUsage?.toFixed(1) || 0}%`, icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10', bar: stats?.cpuUsage || 0 },
            { label: 'RAM', value: `${stats?.ramUsage?.toFixed(1) || server.ramUsage?.toFixed(1) || 0}%`, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', bar: stats?.ramUsage || 0 },
            { label: 'Stockage', value: `${server.storageUsed || 0}/${server.storageTotal || 10} GB`, icon: HardDrive, color: 'text-green-400', bg: 'bg-green-500/10', bar: ((server.storageUsed || 0) / (server.storageTotal || 10)) * 100 },
            { label: 'Plan', value: server.plan, icon: Server, color: 'text-orange-400', bg: 'bg-orange-500/10', bar: 0 },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
              {stat.bar > 0 && (
                <div className="w-full h-1 bg-white/10 rounded-full mt-2">
                  <div className={`h-full rounded-full ${stat.color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(stat.bar, 100)}%` }} />
                </div>
              )}
            </div>
          ))}
          <div className="col-span-2 lg:col-span-4 bg-[#111118] border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Informations</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">ID :</span> <span className="text-white font-mono text-xs">{server.id}</span></div>
              <div><span className="text-gray-400">Domaine :</span> <span className="text-white">{server.domain || '-'}</span></div>
              <div><span className="text-gray-400">Localisation :</span> <span className="text-white">{server.location}</span></div>
              <div><span className="text-gray-400">Coût :</span> <span className="text-white">{server.coinsPerDay} Coins/jour</span></div>
              <div><span className="text-gray-400">Créé le :</span> <span className="text-white">{new Date(server.createdAt).toLocaleDateString()}</span></div>
              <div><span className="text-gray-400">Docker ID :</span> <span className="text-white font-mono text-xs">{server.dockerId?.substring(0, 12) || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Console */}
      {activeTab === 'console' && (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#111118]">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-400 ml-2">Console — {server.name}</span>
          </div>
          <div ref={consoleRef} className="h-96 overflow-y-auto p-4 font-mono text-sm">
            {consoleOutput.map((line, i) => (
              <div key={i} className={`mb-1 ${line.startsWith('$') ? 'text-green-400' : line.toLowerCase().includes('error') ? 'text-red-400' : 'text-gray-300'}`}>
                {line}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 border-t border-white/10 bg-[#111118]">
            <span className="text-green-400 font-mono text-sm">$</span>
            <input
              className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
              placeholder="Tapez une commande..."
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendCommand()}
            />
            <button onClick={sendCommand} className="p-1.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#111118]">
            <span className="text-xs text-gray-400">Logs — {server.name}</span>
            <button onClick={() => {
              fetch(`/api/servers/${id}/logs`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } })
                .then(r => r.json()).then(d => { if (d?.data?.logs) setLogs(d.data.logs); });
            }} className="text-xs text-purple-400 hover:text-purple-300">Actualiser</button>
          </div>
          <div className="h-96 overflow-y-auto p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Aucun log disponible</p>
            ) : logs.map((log, i) => (
              <div key={i} className={`mb-1 ${log.toLowerCase().includes('error') ? 'text-red-400' : log.toLowerCase().includes('warn') ? 'text-yellow-400' : 'text-gray-300'}`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {activeTab === 'files' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-medium text-white">Gestionnaire de fichiers</span>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-xs">
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="p-4">
            {server.status !== 'ONLINE' ? (
              <p className="text-gray-500 text-sm text-center py-8">Le serveur doit être en ligne pour accéder aux fichiers</p>
            ) : (
              <div className="space-y-1">
                {['index.js', 'package.json', '.env', 'node_modules/'].map(file => (
                  <div key={file} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                    {file.endsWith('/') ? <FolderOpen className="w-4 h-4 text-yellow-400" /> : <File className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm text-gray-300">{file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}