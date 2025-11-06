'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import PlaybookBuilder from '../components/PlaybookBuilder';
import PlaybookCard from '../components/PlaybookCard';
import { useToast, ToastContainer } from '../../components/Toast';
import {
  Plus,
  Sparkles,
  Workflow,
  TrendingUp,
  Zap,
  BookOpen,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Playbooks', icon: '📚', color: 'from-slate-500 to-gray-500' },
  { value: 'REFUND_RETURN', label: 'Refund / Return', icon: '🧾', color: 'from-red-500 to-orange-500' },
  { value: 'MARKETING', label: 'Marketing', icon: '📈', color: 'from-purple-500 to-pink-500' },
  { value: 'FULFILLMENT', label: 'Fulfillment', icon: '📦', color: 'from-blue-500 to-cyan-500' },
  { value: 'SUPPORT', label: 'Support', icon: '💬', color: 'from-green-500 to-emerald-500' },
  { value: 'INVENTORY', label: 'Inventory', icon: '🏪', color: 'from-amber-500 to-yellow-500' },
  { value: 'CUSTOM', label: 'Custom', icon: '⚙️', color: 'from-slate-500 to-gray-500' },
];

export default function PlaybooksPage() {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.getPlaybooks.useQuery(
    selectedCategory !== 'all' 
      ? { category: selectedCategory, seedDefaults: true } 
      : { seedDefaults: true }
  );

  const createMutation = trpc.createPlaybook.useMutation({
    onSuccess: () => {
      toast.success('Playbook created successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create playbook');
    },
  });

  const updateMutation = trpc.updatePlaybook.useMutation({
    onSuccess: () => {
      toast.success('Playbook updated!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update playbook');
    },
  });

  const deleteMutation = trpc.deletePlaybook.useMutation({
    onSuccess: () => {
      toast.success('Playbook deleted');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete playbook');
    },
  });

  const cloneMutation = trpc.clonePlaybook.useMutation({
    onSuccess: () => {
      toast.success('Playbook cloned!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to clone playbook');
    },
  });

  const handleToggle = (id: string, enabled: boolean) => {
    updateMutation.mutate({ id, enabled });
  };

  const handleEdit = (playbook: any) => {
    setEditingPlaybook(playbook);
    setIsBuilderOpen(true);
  };

  const handleClone = (id: string) => {
    cloneMutation.mutate({ id });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this playbook?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSave = (playbookData: any) => {
    if (editingPlaybook) {
      updateMutation.mutate({ id: editingPlaybook.id, ...playbookData });
    } else {
      createMutation.mutate(playbookData);
    }
    setEditingPlaybook(null);
  };

  const playbooks = data?.playbooks || [];
  const enabledCount = playbooks.filter((p: any) => p.enabled).length;
  const totalExecutions = playbooks.reduce((sum: number, p: any) => sum + (p.executionCount || 0), 0);

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 p-6 pt-20">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl">
                <Workflow className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-5xl font-black text-transparent">
                  Automation Playbooks
                </h1>
                <p className="mt-2 text-lg text-slate-600">
                  Create intelligent workflows to automate your Shopify store — from refunds to marketing
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingPlaybook(null);
                setIsBuilderOpen(true);
              }}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 py-6 shadow-lg transition-all hover:scale-105"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Playbook
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none bg-gradient-to-br from-indigo-500 to-blue-600 p-6 shadow-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-100">Total Playbooks</p>
                  <p className="mt-2 text-4xl font-black">{playbooks.length}</p>
                </div>
                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                  <BookOpen className="h-8 w-8" />
                </div>
              </div>
            </Card>

            <Card className="border-none bg-gradient-to-br from-green-500 to-emerald-600 p-6 shadow-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-100">Active Playbooks</p>
                  <p className="mt-2 text-4xl font-black">{enabledCount}</p>
                </div>
                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                  <Zap className="h-8 w-8" />
                </div>
              </div>
            </Card>

            <Card className="border-none bg-gradient-to-br from-purple-500 to-pink-600 p-6 shadow-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-100">Total Executions</p>
                  <p className="mt-2 text-4xl font-black">{totalExecutions}</p>
                </div>
                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                  <TrendingUp className="h-8 w-8" />
                </div>
              </div>
            </Card>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Playbooks Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 rounded-2xl bg-white/50 animate-pulse border-2 border-slate-200" />
              ))}
            </div>
          ) : playbooks.length === 0 ? (
            <Card className="p-16 text-center border-2 border-dashed border-slate-300">
              <div className="mx-auto w-fit rounded-full bg-slate-100 p-8 mb-4">
                <Workflow className="h-16 w-16 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No playbooks yet</h3>
              <p className="text-slate-600 mb-6">
                {selectedCategory === 'all' 
                  ? 'Create your first automation playbook to get started'
                  : `No playbooks in the ${CATEGORIES.find(c => c.value === selectedCategory)?.label} category`
                }
              </p>
              <Button
                onClick={() => {
                  setEditingPlaybook(null);
                  setIsBuilderOpen(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Playbook
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {playbooks.map((playbook: any) => (
                <PlaybookCard
                  key={playbook.id}
                  playbook={playbook}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onClone={handleClone}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Playbook Builder Modal */}
      <PlaybookBuilder
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingPlaybook(null);
        }}
        onSave={handleSave}
        initialData={editingPlaybook}
      />
    </>
  );
}

