'use client';

import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import {
  Power,
  Edit2,
  Copy,
  Trash2,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface PlaybookCardProps {
  playbook: any;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (playbook: any) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  REFUND_RETURN: { icon: '🧾', color: 'from-red-500 to-orange-500' },
  MARKETING: { icon: '📈', color: 'from-purple-500 to-pink-500' },
  FULFILLMENT: { icon: '📦', color: 'from-blue-500 to-cyan-500' },
  SUPPORT: { icon: '💬', color: 'from-green-500 to-emerald-500' },
  INVENTORY: { icon: '🏪', color: 'from-amber-500 to-yellow-500' },
  CUSTOM: { icon: '⚙️', color: 'from-slate-500 to-gray-500' },
};

export default function PlaybookCard({
  playbook,
  onToggle,
  onEdit,
  onClone,
  onDelete,
}: PlaybookCardProps) {
  const config = CATEGORY_CONFIG[playbook.category] || CATEGORY_CONFIG.CUSTOM;
  const triggerType = playbook.trigger?.type || 'unknown';
  const conditionCount = Array.isArray(playbook.conditions) ? playbook.conditions.length : 0;
  const actionCount = Array.isArray(playbook.actions) ? playbook.actions.length : 0;

  return (
    <Card
      className={`group relative overflow-hidden border-2 p-6 transition-all hover:scale-[1.02] ${
        playbook.enabled
          ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl'
          : 'border-slate-200 bg-white hover:border-indigo-300'
      }`}
    >
      {/* Background Gradient */}
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${config.color} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-3xl">{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-black text-slate-900 text-lg leading-tight">{playbook.name}</h4>
              {playbook.isDefault && (
                <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                  Default
                </Badge>
              )}
            </div>
            {playbook.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{playbook.description}</p>
            )}
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <button
          onClick={() => onToggle(playbook.id, !playbook.enabled)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
            playbook.enabled
              ? 'bg-green-500 text-white shadow-lg hover:bg-green-600'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
          title={playbook.enabled ? 'Disable playbook' : 'Enable playbook'}
        >
          <Power className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-white/80 p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
            <Zap className="h-3.5 w-3.5" />
            Trigger
          </div>
          <p className="font-bold text-slate-900 text-sm">
            {triggerType.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="rounded-lg bg-white/80 p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Conditions
          </div>
          <p className="font-bold text-slate-900 text-sm">{conditionCount} rules</p>
        </div>
        <div className="rounded-lg bg-white/80 p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Actions
          </div>
          <p className="font-bold text-slate-900 text-sm">{actionCount} steps</p>
        </div>
      </div>

      {/* Confidence & Execution Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Confidence:</span>
          <Badge className="bg-indigo-100 text-indigo-700 font-bold">
            {Math.round((playbook.confidenceThreshold || 0.8) * 100)}%
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Approval:</span>
          <Badge className={playbook.requiresApproval ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
            {playbook.requiresApproval ? 'Required' : 'Auto-run'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Runs:</span>
          <span className="font-bold text-slate-900">{playbook.executionCount || 0}</span>
        </div>
      </div>

      {/* Last Executed */}
      {playbook.lastExecutedAt && (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Clock className="h-3.5 w-3.5" />
          Last run: {new Date(playbook.lastExecutedAt).toLocaleString()}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!playbook.isDefault && (
          <Button
            onClick={() => onEdit(playbook)}
            size="sm"
            variant="outline"
            className="flex-1 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        )}
        <Button
          onClick={() => onClone(playbook.id)}
          size="sm"
          variant="outline"
          className={`${playbook.isDefault ? 'flex-1' : ''} hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300`}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Clone
        </Button>
        {!playbook.isDefault && (
          <Button
            onClick={() => onDelete(playbook.id)}
            size="sm"
            variant="outline"
            className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}

