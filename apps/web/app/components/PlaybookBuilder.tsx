'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  NodeProps,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import 'react-quill/dist/quill.snow.css';

import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { Input } from '../../../../@ai-ecom/api/components/ui/input';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../@ai-ecom/api/components/ui/dialog';
import {
  BookOpen,
  Calendar,
  Mail,
  Plus,
  Save,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

type TriggerType = 'shopify_event' | 'email_intent' | 'scheduled';
type ActionType =
  | 'send_email'
  | 'auto_refund'
  | 'auto_exchange'
  | 'create_discount'
  | 'add_tag'
  | 'send_notification'
  | 'restock_product';

interface TriggerConfig {
  event?: string;
  intent?: string;
  frequency?: string;
  time?: string;
}

interface PlaybookTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

interface PlaybookCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface PlaybookAction {
  id: string;
  type: ActionType;
  config: Record<string, any>;
}

interface PlaybookStructure {
  trigger: PlaybookTrigger;
  conditions: PlaybookCondition[];
  actions: PlaybookAction[];
}

interface PlaybookBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (playbook: any) => void;
  initialData?: any;
  toast?: {
    success?: (message: string) => void;
    error?: (message: string) => void;
    warning?: (message: string) => void;
    info?: (message: string) => void;
  };
}

interface FlowNodeData {
  title: string;
  description: string;
  emoji: string;
  isSelected?: boolean;
}

const CATEGORIES = [
  { value: 'REFUND_RETURN', label: 'Refund / Return', icon: '🧾', color: 'from-red-500 to-orange-500' },
  { value: 'MARKETING', label: 'Marketing & Promotions', icon: '📈', color: 'from-purple-500 to-pink-500' },
  { value: 'FULFILLMENT', label: 'Fulfillment & Orders', icon: '📦', color: 'from-blue-500 to-cyan-500' },
  { value: 'SUPPORT', label: 'Customer Support', icon: '💬', color: 'from-green-500 to-emerald-500' },
  { value: 'INVENTORY', label: 'Inventory Management', icon: '🏪', color: 'from-amber-500 to-yellow-500' },
  { value: 'CUSTOM', label: 'Custom Playbook', icon: '⚙️', color: 'from-slate-500 to-gray-500' },
];

const CONDITION_FIELDS = [
  { value: 'days_delayed', label: 'Days Delayed' },
  { value: 'order_total', label: 'Order Total' },
  { value: 'refund_amount', label: 'Refund Amount' },
  { value: 'customer_sentiment', label: 'Customer Sentiment Score' },
  { value: 'customer_lifetime_value', label: 'Customer LTV' },
  { value: 'items_in_order', label: 'Items in Order' },
];

const CONDITION_OPERATORS = [
  { value: '>', label: 'greater than (>)' },
  { value: '<', label: 'less than (<)' },
  { value: '==', label: 'equals (==)' },
  { value: '!=', label: 'not equals (!=)' },
  { value: 'contains', label: 'contains' },
];

const SHOPIFY_EVENTS = [
  { value: 'order_created', label: 'Order Created' },
  { value: 'order_delayed', label: 'Order Delayed' },
  { value: 'order_refunded', label: 'Order Refunded' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'cart_abandoned', label: 'Cart Abandoned' },
  { value: 'product_out_of_stock', label: 'Product Out Of Stock' },
];

const EMAIL_INTENTS = [
  { value: 'refund_request', label: 'Refund Request Email' },
  { value: 'exchange_request', label: 'Exchange Request Email' },
  { value: 'shipping_inquiry', label: 'Shipping Delay Email' },
  { value: 'negative_review', label: 'Negative Review Detected' },
  { value: 'discount_request', label: 'Discount Inquiry' },
];

const ACTION_OPTIONS: { value: ActionType; label: string; emoji: string; description: string }[] = [
  { value: 'send_email', label: 'Send Email', emoji: '✉️', description: 'Send customers an AI-crafted email response.' },
  { value: 'auto_refund', label: 'Auto Refund', emoji: '💸', description: 'Automatically issue a refund for qualifying orders.' },
  { value: 'auto_exchange', label: 'Auto Exchange', emoji: '🔄', description: 'Process an exchange and notify the fulfillment team.' },
  { value: 'create_discount', label: 'Create Discount', emoji: '🎟️', description: 'Generate a discount code as part of the workflow.' },
  { value: 'add_tag', label: 'Add Customer Tag', emoji: '🏷️', description: 'Tag the customer in Shopify for segmented follow-ups.' },
  { value: 'send_notification', label: 'Send Notification', emoji: '🔔', description: 'Alert your team via Slack or email.' },
  { value: 'restock_product', label: 'Restock Alert', emoji: '📦', description: 'Notify inventory managers about low stock.' },
];

const DEFAULT_STRUCTURE: PlaybookStructure = {
  trigger: {
    type: 'shopify_event',
    config: { event: 'order_created', time: '09:00' },
  },
  conditions: [],
  actions: [
    {
      id: 'action-0',
      type: 'send_email',
      config: {
        email_subject: 'We are on it!',
        email_body: 'Hi {{customer_name}}, we are processing your request.',
        discount_code: '',
        send_delay: 'immediate',
      },
    },
  ],
};

function createId(prefix: string, index: number) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${index}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStructure(raw?: any): PlaybookStructure {
  const structure: PlaybookStructure = {
    trigger: {
      type: raw?.trigger?.type ?? 'shopify_event',
      config: raw?.trigger?.config ?? { event: 'order_created', time: '09:00' },
    },
    conditions: (raw?.conditions ?? []).map((condition: any, index: number) => ({
      id: condition.id ?? createId('condition', index),
      field: condition.field ?? 'order_total',
      operator: condition.operator ?? '>',
      value: condition.value ?? '0',
    })),
    actions: (raw?.actions ?? []).map((action: any, index: number) => ({
      id: action.id ?? createId('action', index),
      type: action.type ?? 'send_email',
      config: {
        email_subject: action.config?.email_subject ?? action.config?.subject ?? 'Follow up with your customer',
        email_body: action.config?.email_body ?? action.config?.body ?? 'Hi {{customer_name}}, thanks for your patience.',
        discount_code: action.config?.discount_code ?? action.config?.discountCode ?? '',
        send_delay: action.config?.send_delay ?? 'immediate',
        ...action.config,
      },
    })),
  };

  if (structure.actions.length === 0) {
    structure.actions.push({
      id: createId('action', 0),
      type: 'send_email',
      config: {
        email_subject: 'We are on it!',
        email_body: 'Hi {{customer_name}}, we are processing your request.',
        discount_code: '',
        send_delay: 'immediate',
      },
    });
  }

  return structure;
}

function describeTrigger(trigger: PlaybookTrigger) {
  switch (trigger.type) {
    case 'shopify_event':
      return `Shopify event: ${trigger.config.event ?? 'order_created'}`.replace(/_/g, ' ');
    case 'email_intent':
      return `Email intent: ${trigger.config.intent ?? 'refund_request'}`.replace(/_/g, ' ');
    case 'scheduled':
      return `Scheduled ${trigger.config.frequency ?? 'daily'} @ ${trigger.config.time ?? '09:00'}`;
    default:
      return 'Trigger';
  }
}

function describeCondition(condition: PlaybookCondition) {
  const fieldLabel = CONDITION_FIELDS.find((field) => field.value === condition.field)?.label ?? condition.field;
  const operatorLabel = CONDITION_OPERATORS.find((op) => op.value === condition.operator)?.label ?? condition.operator;
  return `${fieldLabel} ${operatorLabel} ${condition.value}`;
}

function describeAction(action: PlaybookAction) {
  const option = ACTION_OPTIONS.find((opt) => opt.value === action.type);
  if (action.type === 'send_email') {
    return `${option?.label ?? 'Send Email'} – ${action.config?.email_subject ?? 'Custom email'}`;
  }
  if (action.type === 'create_discount') {
    return `${option?.label ?? 'Create Discount'} – ${action.config?.amount ?? 'Automatic code'}`;
  }
  return option?.label ?? 'Action';
}

function buildFlow(structure: PlaybookStructure, selectedId?: string) {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: 'trigger',
    type: 'playbookNode',
    position: { x: 0, y: 0 },
    data: {
      emoji: '⚡',
      title: 'Trigger',
      description: describeTrigger(structure.trigger),
      isSelected: selectedId === 'trigger',
    },
  });

  let currentY = 200;
  let previousNodeId = 'trigger';

  structure.conditions.forEach((condition, index) => {
    nodes.push({
      id: condition.id,
      type: 'playbookNode',
      position: { x: 0, y: currentY },
      data: {
        emoji: '🔍',
        title: `Condition ${index + 1}`,
        description: describeCondition(condition),
        isSelected: selectedId === condition.id,
      },
    });

    edges.push({
      id: `${previousNodeId}-${condition.id}`,
      source: previousNodeId,
      target: condition.id,
      type: 'smoothstep',
    });

    previousNodeId = condition.id;
    currentY += 200;
  });

  structure.actions.forEach((action, index) => {
    nodes.push({
      id: action.id,
      type: 'playbookNode',
      position: { x: 0, y: currentY },
      data: {
        emoji: ACTION_OPTIONS.find((opt) => opt.value === action.type)?.emoji ?? '🧩',
        title: `Action ${index + 1}`,
        description: describeAction(action),
        isSelected: selectedId === action.id,
      },
    });

    edges.push({
      id: `${previousNodeId}-${action.id}`,
      source: previousNodeId,
      target: action.id,
      type: 'smoothstep',
    });

    previousNodeId = action.id;
    currentY += 200;
  });

  return { nodes, edges };
}

function PlaybookNodeComponent({ data }: NodeProps<FlowNodeData>) {
  return (
    <div
      className={`rounded-2xl border backdrop-blur bg-white/70 px-4 py-3 shadow-lg transition-all ${
        data.isSelected ? 'border-purple-500 ring-4 ring-purple-200' : 'border-slate-200 hover:border-purple-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{data.emoji}</span>
        <div>
          <p className="text-sm font-bold text-slate-900">{data.title}</p>
          <p className="text-xs text-slate-600">{data.description}</p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { playbookNode: PlaybookNodeComponent };

export default function PlaybookBuilder({ isOpen, onClose, onSave, initialData, toast }: PlaybookBuilderProps) {
  const notify = useMemo(
    () => ({
      success: (message: string) =>
        toast?.success?.(message) ?? console.log('[PlaybookBuilder] success:', message),
      error: (message: string) =>
        toast?.error?.(message) ?? console.error('[PlaybookBuilder] error:', message),
      warning: (message: string) =>
        toast?.warning?.(message) ?? console.warn('[PlaybookBuilder] warning:', message),
      info: (message: string) =>
        toast?.info?.(message) ?? console.info('[PlaybookBuilder] info:', message),
    }),
    [toast]
  );
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('trigger');

  const [metadata, setMetadata] = useState({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    category: initialData?.category ?? 'CUSTOM',
    confidenceThreshold: Math.round((initialData?.confidenceThreshold ?? 0.8) * 100),
    requiresApproval: initialData?.requiresApproval ?? false,
    enabled: initialData?.enabled ?? false,
  });

  const [structure, setStructure] = useState<PlaybookStructure>(
    normalizeStructure(initialData)
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setStructure(normalizeStructure(initialData));
    setMetadata({
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      category: initialData?.category ?? 'CUSTOM',
      confidenceThreshold: Math.round((initialData?.confidenceThreshold ?? 0.8) * 100),
      requiresApproval: initialData?.requiresApproval ?? false,
      enabled: initialData?.enabled ?? false,
    });
  }, [initialData, isOpen]);

  useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = buildFlow(structure, selectedNodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [structure, selectedNodeId, setNodes, setEdges]);

  const handleGenerateFromPrompt = useCallback(async () => {
    if (!prompt.trim()) {
      notify.warning('Please describe the automation you want to build.');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch('/api/playbooks/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error ?? 'Failed to parse automation intent');
      }

      const parsed = await response.json();
      setStructure(normalizeStructure(parsed.structure ?? parsed));
      setMetadata((prev) => ({
        ...prev,
        name: parsed.name ?? prev.name,
        description: parsed.description ?? parsed.summary ?? prev.description,
        category: parsed.category ?? prev.category,
      }));

      notify.success('Automation mapped into the builder. Click nodes to edit details.');
    } catch (error: any) {
      notify.error(error.message ?? 'Something went wrong while generating the playbook.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, notify]);

  const handleAddCondition = () => {
    const newConditionId = createId('condition', structure.conditions.length);
    setStructure((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: newConditionId,
          field: 'days_delayed',
          operator: '>',
          value: '5',
        },
      ],
    }));
    setSelectedNodeId(newConditionId);
  };

  const handleAddAction = () => {
    const newActionId = createId('action', structure.actions.length);
    setStructure((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          id: newActionId,
          type: 'send_email',
          config: {
            email_subject: 'Quick update from the team',
            email_body: 'Hi {{customer_name}}, thank you for your patience while we sort this out.',
            discount_code: '',
            send_delay: 'immediate',
          },
        },
      ],
    }));
    setSelectedNodeId(newActionId);
  };

  const selectedNode = useMemo(() => {
    if (selectedNodeId === 'trigger') {
      return { type: 'trigger', data: structure.trigger };
    }
    const condition = structure.conditions.find((condition) => condition.id === selectedNodeId);
    if (condition) return { type: 'condition', data: condition };
    const action = structure.actions.find((action) => action.id === selectedNodeId);
    if (action) return { type: 'action', data: action };
    return { type: 'trigger', data: structure.trigger };
  }, [selectedNodeId, structure]);

  const updateTrigger = (updates: Partial<PlaybookTrigger>) => {
    setStructure((prev) => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        ...updates,
        config: { ...prev.trigger.config, ...(updates.config ?? {}) },
      },
    }));
  };

  const updateCondition = (id: string, updates: Partial<PlaybookCondition>) => {
    setStructure((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...updates } : condition
      ),
    }));
  };

  const updateAction = (id: string, updates: Partial<PlaybookAction>) => {
    setStructure((prev) => ({
      ...prev,
      actions: prev.actions.map((action) =>
        action.id === id
          ? {
              ...action,
              ...updates,
              config: { ...action.config, ...(updates.config ?? {}) },
            }
          : action
      ),
    }));
  };

  const handleSavePlaybook = () => {
    if (!metadata.name.trim()) {
      toast.error('Please give your playbook a name before saving.');
      return;
    }

    onSave({
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      trigger: structure.trigger,
      conditions: structure.conditions,
      actions: structure.actions,
      confidenceThreshold: metadata.confidenceThreshold / 100,
      requiresApproval: metadata.requiresApproval,
      enabled: metadata.enabled,
    });
    onClose();
  };

  const previewData = useMemo(() => {
    const sample = {
      customer_name: 'Alex Rivera',
      order_id: '#ZYYP-4582',
      product_name: 'Aurora Hoodie',
    };

    const emailPreviews = structure.actions
      .filter((action) => action.type === 'send_email')
      .map((action) => {
        const body =
          action.config?.email_body
            ?.replace(/{{customer_name}}/gi, sample.customer_name)
            ?.replace(/{{order_id}}/gi, sample.order_id)
            ?.replace(/{{product_name}}/gi, sample.product_name) ?? '';

        const subject =
          action.config?.email_subject
            ?.replace(/{{customer_name}}/gi, sample.customer_name)
            ?.replace(/{{order_id}}/gi, sample.order_id)
            ?.replace(/{{product_name}}/gi, sample.product_name) ?? '';

        return { subject, body, discount: action.config?.discount_code ?? '' };
      });

    return { emailPreviews };
  }, [structure.actions]);

  const nodeEditor = () => {
    if (selectedNode.type === 'trigger') {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase text-slate-500">Trigger Type</label>
            <select
              value={structure.trigger.type}
              onChange={(e) => updateTrigger({ type: e.target.value as TriggerType })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="shopify_event">Shopify event</option>
              <option value="email_intent">Email intent</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {structure.trigger.type === 'shopify_event' && (
            <div>
              <label className="text-xs uppercase text-slate-500">Event</label>
              <select
                value={structure.trigger.config.event ?? ''}
                onChange={(e) =>
                  updateTrigger({ config: { ...structure.trigger.config, event: e.target.value } })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {SHOPIFY_EVENTS.map((event) => (
                  <option key={event.value} value={event.value}>
                    {event.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {structure.trigger.type === 'email_intent' && (
            <div>
              <label className="text-xs uppercase text-slate-500">Intent</label>
              <select
                value={structure.trigger.config.intent ?? ''}
                onChange={(e) =>
                  updateTrigger({ config: { ...structure.trigger.config, intent: e.target.value } })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {EMAIL_INTENTS.map((intent) => (
                  <option key={intent.value} value={intent.value}>
                    {intent.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {structure.trigger.type === 'scheduled' && (
            <>
              <div>
                <label className="text-xs uppercase text-slate-500">Frequency</label>
                <select
                  value={structure.trigger.config.frequency ?? 'daily'}
                  onChange={(e) =>
                    updateTrigger({ config: { ...structure.trigger.config, frequency: e.target.value } })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">Time</label>
                <Input
                  type="time"
                  value={structure.trigger.config.time ?? '09:00'}
                  onChange={(e) =>
                    updateTrigger({ config: { ...structure.trigger.config, time: e.target.value } })
                  }
                />
              </div>
            </>
          )}
        </div>
      );
    }

    if (selectedNode.type === 'condition') {
      const condition = selectedNode.data as PlaybookCondition;
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase text-slate-500">Field</label>
            <select
              value={condition.field}
              onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CONDITION_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Operator</label>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CONDITION_OPERATORS.map((operator) => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Value</label>
            <Input
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            />
          </div>
        </div>
      );
    }

    const action = selectedNode.data as PlaybookAction;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase text-slate-500">Action Type</label>
          <select
            value={action.type}
            onChange={(e) =>
              updateAction(action.id, { type: e.target.value as ActionType })
            }
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
        </div>

        {action.type === 'send_email' && (
          <>
            <div>
              <label className="text-xs uppercase text-slate-500">Email Subject</label>
              <Input
                value={action.config?.email_subject ?? ''}
                onChange={(e) =>
                  updateAction(action.id, { config: { ...action.config, email_subject: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">Email Body</label>
              <div className="mt-1 rounded-xl border border-slate-200 bg-white">
                <ReactQuill
                  theme="snow"
                  value={action.config?.email_body ?? ''}
                  onChange={(value) =>
                    updateAction(action.id, { config: { ...action.config, email_body: value } })
                  }
                  className="min-h-[160px]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">Discount Code (Optional)</label>
              <Input
                placeholder="THANKYOU10"
                value={action.config?.discount_code ?? ''}
                onChange={(e) =>
                  updateAction(action.id, { config: { ...action.config, discount_code: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">Send Delay</label>
              <select
                value={action.config?.send_delay ?? 'immediate'}
                onChange={(e) =>
                  updateAction(action.id, { config: { ...action.config, send_delay: e.target.value } })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="immediate">Send immediately</option>
                <option value="after_1_hour">Send after 1 hour</option>
                <option value="after_2_hours">Send after 2 hours</option>
                <option value="after_24_hours">Send after 24 hours</option>
              </select>
            </div>
          </>
        )}

        {action.type !== 'send_email' && (
          <p className="text-xs text-slate-500">
            Additional configuration for this action will be available soon. For now, the workflow will record this action with default settings.
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideDefaultWrapper
        className="max-h-[95vh] max-w-[min(100vw,96rem)] overflow-hidden border-0 bg-transparent p-0 sm:p-0"
        closeButtonClassName="right-6 top-6 rounded-full bg-white/20 text-slate-900 shadow-lg backdrop-blur transition hover:bg-white/40 focus:outline-none"
      >
        <div className="pointer-events-auto flex h-[95vh] w-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center justify-between text-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wide">AI + Visual Builder</span>
                  <p className="text-slate-900 font-bold">Design your playbook flow</p>
                </div>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Sparkles className="h-4 w-4 mr-1" />
                Speak, visualize & refine
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(95vh-80px)] flex-col overflow-hidden border-t border-white/10">
          <div className="grid flex-1 grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-[320px_minmax(0,1fr)_300px]">
            {/* Prompt + Meta */}
            <div className="space-y-4 overflow-y-auto pr-2">
              <Card className="border border-purple-100 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Describe automation</p>
                    <h3 className="text-base font-semibold text-slate-900">
                      What should this playbook do?
                    </h3>
                  </div>
                  <Wand2 className="h-5 w-5 text-purple-500" />
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="If an order is delayed more than 5 days, send an apology email with 10% discount."
                  className="mt-3 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm shadow-inner focus:border-purple-400 focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between">
                  <Button
                    size="sm"
                    onClick={handleGenerateFromPrompt}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:from-indigo-600 hover:to-purple-700"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Flow'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStructure(DEFAULT_STRUCTURE);
                      notify.info('Reset to base template. Describe an automation to generate a flow.');
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </Card>

              <Card className="border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
                <div>
                  <label className="text-xs uppercase text-slate-500">Playbook Name</label>
                  <Input
                    value={metadata.name}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Delayed Order Apology + Discount"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Category</label>
                  <select
                    value={metadata.category}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Description</label>
                  <textarea
                    value={metadata.description}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Explain the purpose of this playbook..."
                    className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </Card>

              <Card className="border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs uppercase text-slate-500">AI confidence</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {metadata.confidenceThreshold}% Threshold
                    </p>
                  </div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={metadata.confidenceThreshold}
                  onChange={(e) =>
                    setMetadata((prev) => ({
                      ...prev,
                      confidenceThreshold: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-purple-500"
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={metadata.requiresApproval}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, requiresApproval: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-purple-500 focus:ring-purple-400"
                  />
                  Require manual approval before execution
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={metadata.enabled}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-purple-500 focus:ring-purple-400"
                  />
                  Enable immediately after saving
                </label>
              </Card>

              <Card className="border border-dashed border-slate-300 bg-white/70 p-4 shadow-inner space-y-3">
                <p className="text-sm font-semibold text-slate-900">Add more nodes</p>
                <Button
                  onClick={handleAddCondition}
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-200"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Condition
                </Button>
                <Button
                  onClick={handleAddAction}
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-200"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Action
                </Button>
              </Card>
            </div>

            {/* Flow Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-purple-50/40 to-indigo-50/40 shadow-inner">
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                  fitView
                  proOptions={{ hideAttribution: true }}
                  nodesDraggable={false}
                  panOnScroll
                >
                  <Background color="#d4d4d8" gap={24} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </ReactFlowProvider>
              <div className="pointer-events-none absolute inset-x-12 top-4 rounded-3xl border border-purple-200/50 bg-white/60 px-4 py-2 text-center text-xs font-semibold uppercase text-purple-500">
                Click any node to edit its details
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4 overflow-y-auto pl-2">
              <Card className="border border-purple-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Node editor</p>
                    <h3 className="text-base font-semibold text-slate-900">
                      {selectedNode.type === 'trigger'
                        ? '⚡ Trigger'
                        : selectedNode.type === 'condition'
                        ? '🔍 Condition'
                        : '✉️ Action'}
                    </h3>
                  </div>
                  <BookOpen className="h-5 w-5 text-purple-500" />
                </div>
                <div className="mt-4 space-y-5">{nodeEditor()}</div>
              </Card>

              <Card className="border border-slate-200 bg-white/70 p-4 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-slate-900">Quick Tips</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>• Use <code className="rounded bg-slate-100 px-1">{"{{customer_name}}"}</code> to personalise emails.</li>
                  <li>• Configure delays to pace communications after a trigger.</li>
                  <li>• Add multiple actions to build multi-step automations.</li>
                </ul>
              </Card>
            </div>
          </div>

          {/* Preview */}
          <div className="border-t border-slate-200 bg-white/90 px-6 py-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Preview your automation before saving.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowPreview((prev) => !prev)}>
                  {showPreview ? 'Hide Preview' : 'Preview Playbook'}
                </Button>
                <Button
                  onClick={handleSavePlaybook}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-600 hover:to-teal-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Playbook
                </Button>
              </div>
            </div>
            {showPreview && (
              <div className="mt-4 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Flow Summary</h4>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    <li>⚡ Trigger: {describeTrigger(structure.trigger)}</li>
                    {structure.conditions.map((condition, index) => (
                      <li key={condition.id}>
                        🔍 Condition {index + 1}: {describeCondition(condition)}
                      </li>
                    ))}
                    {structure.actions.map((action, index) => (
                      <li key={action.id}>
                        {ACTION_OPTIONS.find((opt) => opt.value === action.type)?.emoji ?? '🧩'} Action {index + 1}:{' '}
                        {describeAction(action)}
                      </li>
                    ))}
                  </ul>
                </div>
                {previewData.emailPreviews.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Email Preview</h4>
                    {previewData.emailPreviews.map((email, index) => (
                      <Card key={index} className="mt-2 border border-purple-200 bg-white/80 p-3 text-sm text-slate-700">
                        <p className="font-semibold text-purple-700">{email.subject}</p>
                        {email.discount && (
                          <p className="mt-1 text-xs font-medium text-emerald-600">
                            Discount code: {email.discount}
                          </p>
                        )}
                        <div
                          className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600"
                          dangerouslySetInnerHTML={{ __html: email.body }}
                        />
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

