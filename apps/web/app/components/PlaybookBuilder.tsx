'use client';

import { useState } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
  Zap,
  Calendar,
  Mail,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';

interface PlaybookBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (playbook: any) => void;
  initialData?: any;
}

const CATEGORIES = [
  { value: 'REFUND_RETURN', label: 'Refund / Return', icon: '🧾', color: 'from-red-500 to-orange-500' },
  { value: 'MARKETING', label: 'Marketing & Promotions', icon: '📈', color: 'from-purple-500 to-pink-500' },
  { value: 'FULFILLMENT', label: 'Fulfillment & Orders', icon: '📦', color: 'from-blue-500 to-cyan-500' },
  { value: 'SUPPORT', label: 'Customer Support', icon: '💬', color: 'from-green-500 to-emerald-500' },
  { value: 'INVENTORY', label: 'Inventory Management', icon: '🏪', color: 'from-amber-500 to-yellow-500' },
  { value: 'CUSTOM', label: 'Custom Playbook', icon: '⚙️', color: 'from-slate-500 to-gray-500' },
];

const TRIGGER_TYPES = [
  { value: 'shopify_event', label: 'Shopify Event', icon: ShoppingCart, description: 'Trigger when orders are created, refunded, or updated' },
  { value: 'email_intent', label: 'Email Intent', icon: Mail, description: 'Trigger when customer emails match specific patterns' },
  { value: 'scheduled', label: 'Time-Based', icon: Calendar, description: 'Run on a schedule (daily, weekly, etc.)' },
];

const SHOPIFY_EVENTS = [
  'order_created',
  'order_updated',
  'order_refunded',
  'order_cancelled',
  'cart_abandoned',
  'product_out_of_stock',
];

const EMAIL_INTENTS = [
  'refund_request',
  'exchange_request',
  'shipping_inquiry',
  'product_complaint',
  'discount_inquiry',
  'general_question',
];

const CONDITION_OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
];

const ACTION_TYPES = [
  { value: 'auto_refund', label: 'Auto Refund', icon: '💰', description: 'Automatically process refund via Shopify' },
  { value: 'auto_exchange', label: 'Auto Exchange', icon: '🔄', description: 'Create exchange order' },
  { value: 'send_email', label: 'Send AI Email', icon: '✉️', description: 'Generate and send AI-powered email' },
  { value: 'create_discount', label: 'Create Discount', icon: '🎟️', description: 'Generate unique discount code' },
  { value: 'add_tag', label: 'Add Customer Tag', icon: '🏷️', description: 'Tag customer in Shopify' },
  { value: 'send_notification', label: 'Send Notification', icon: '🔔', description: 'Notify team via Slack/Email' },
  { value: 'restock_product', label: 'Restock Alert', icon: '📦', description: 'Alert for restocking' },
];

export default function PlaybookBuilder({ isOpen, onClose, onSave, initialData }: PlaybookBuilderProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    triggerType: initialData?.trigger?.type || '',
    triggerConfig: initialData?.trigger?.config || {},
    conditions: initialData?.conditions || [],
    actions: initialData?.actions || [],
    confidenceThreshold: initialData?.confidenceThreshold || 80,
    requiresApproval: initialData?.requiresApproval || false,
    enabled: initialData?.enabled || false,
  });

  const [currentCondition, setCurrentCondition] = useState({ field: '', operator: '==', value: '' });
  const [currentAction, setCurrentAction] = useState({ type: '', config: {} });

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = () => {
    const playbook = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      trigger: {
        type: formData.triggerType,
        config: formData.triggerConfig,
      },
      conditions: formData.conditions,
      actions: formData.actions,
      confidenceThreshold: formData.confidenceThreshold / 100,
      requiresApproval: formData.requiresApproval,
      enabled: formData.enabled,
    };
    
    onSave(playbook);
    onClose();
  };

  const addCondition = () => {
    if (currentCondition.field && currentCondition.value) {
      setFormData({
        ...formData,
        conditions: [...formData.conditions, { ...currentCondition }],
      });
      setCurrentCondition({ field: '', operator: '==', value: '' });
    }
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_: any, i: number) => i !== index),
    });
  };

  const addAction = () => {
    if (currentAction.type) {
      setFormData({
        ...formData,
        actions: [...formData.actions, { ...currentAction }],
      });
      setCurrentAction({ type: '', config: {} });
    }
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_: any, i: number) => i !== index),
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.category !== '';
      case 2: return formData.triggerType !== '';
      case 3: return true; // Conditions are optional
      case 4: return formData.actions.length > 0;
      case 5: return true;
      case 6: return formData.name !== '';
      default: return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Create New Playbook
          </DialogTitle>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 pt-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 6 && (
                  <div
                    className={`h-1 w-12 ${s < step ? 'bg-green-500' : 'bg-slate-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* Step 1: Category */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Select Category</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Choose the type of automation you want to create
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => (
                  <Card
                    key={cat.value}
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`cursor-pointer p-6 transition-all hover:scale-105 ${
                      formData.category === cat.value
                        ? `bg-gradient-to-br ${cat.color} text-white border-2 border-white shadow-xl`
                        : 'border-2 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <h4 className={`font-bold ${formData.category === cat.value ? 'text-white' : 'text-slate-900'}`}>
                      {cat.label}
                    </h4>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Trigger */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Define Trigger</h3>
                <p className="text-sm text-slate-600 mb-4">
                  What should start this automation?
                </p>
              </div>
              <div className="space-y-3">
                {TRIGGER_TYPES.map((trigger) => {
                  const Icon = trigger.icon;
                  return (
                    <Card
                      key={trigger.value}
                      onClick={() => setFormData({ ...formData, triggerType: trigger.value })}
                      className={`cursor-pointer p-4 flex items-start gap-4 transition-all hover:scale-[1.02] ${
                        formData.triggerType === trigger.value
                          ? 'border-2 border-indigo-600 bg-indigo-50'
                          : 'border-2 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        formData.triggerType === trigger.value
                          ? 'bg-indigo-600'
                          : 'bg-slate-200'
                      }`}>
                        <Icon className={`h-5 w-5 ${formData.triggerType === trigger.value ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{trigger.label}</h4>
                        <p className="text-sm text-slate-600">{trigger.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Trigger Configuration */}
              {formData.triggerType === 'shopify_event' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Event
                  </label>
                  <select
                    value={formData.triggerConfig.event || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, event: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
                  >
                    <option value="">Choose an event...</option>
                    {SHOPIFY_EVENTS.map((event) => (
                      <option key={event} value={event}>
                        {event.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.triggerType === 'email_intent' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Intent
                  </label>
                  <select
                    value={formData.triggerConfig.intent || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, intent: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
                  >
                    <option value="">Choose intent...</option>
                    {EMAIL_INTENTS.map((intent) => (
                      <option key={intent} value={intent}>
                        {intent.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.triggerType === 'scheduled' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Schedule Type
                    </label>
                    <select
                      value={formData.triggerConfig.frequency || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          triggerConfig: { ...formData.triggerConfig, frequency: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
                    >
                      <option value="">Choose frequency...</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Time
                    </label>
                    <Input
                      type="time"
                      value={formData.triggerConfig.time || '10:00'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          triggerConfig: { ...formData.triggerConfig, time: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Conditions */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Add Conditions (Optional)</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Define rules for when this automation should run
                </p>
              </div>

              {/* Existing Conditions */}
              {formData.conditions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.conditions.map((condition: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <Badge className="bg-indigo-100 text-indigo-700 font-mono text-xs">
                        {condition.field}
                      </Badge>
                      <span className="text-sm text-slate-600">{condition.operator}</span>
                      <Badge className="bg-green-100 text-green-700 font-mono text-xs">
                        {condition.value}
                      </Badge>
                      <button
                        onClick={() => removeCondition(index)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Condition */}
              <Card className="p-4 bg-white border-2 border-dashed border-slate-300">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Field</label>
                    <Input
                      placeholder="e.g., order_total"
                      value={currentCondition.field}
                      onChange={(e) =>
                        setCurrentCondition({ ...currentCondition, field: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Operator</label>
                    <select
                      value={currentCondition.operator}
                      onChange={(e) =>
                        setCurrentCondition({ ...currentCondition, operator: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Value</label>
                    <Input
                      placeholder="e.g., 100"
                      value={currentCondition.value}
                      onChange={(e) =>
                        setCurrentCondition({ ...currentCondition, value: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button
                  onClick={addCondition}
                  disabled={!currentCondition.field || !currentCondition.value}
                  className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </Card>
            </div>
          )}

          {/* Step 4: Actions */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Define Actions</h3>
                <p className="text-sm text-slate-600 mb-4">
                  What should happen when this playbook triggers?
                </p>
              </div>

              {/* Existing Actions */}
              {formData.actions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.actions.map((action: any, index: number) => {
                    const actionType = ACTION_TYPES.find((a) => a.value === action.type);
                    return (
                      <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-2xl">{actionType?.icon}</span>
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-900">{actionType?.label}</h5>
                          <p className="text-xs text-slate-600">{actionType?.description}</p>
                        </div>
                        <button
                          onClick={() => removeAction(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Action */}
              <div className="grid grid-cols-2 gap-3">
                {ACTION_TYPES.map((action) => (
                  <Card
                    key={action.value}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        actions: [...formData.actions, { type: action.value, config: {} }],
                      });
                    }}
                    className="cursor-pointer p-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                  >
                    <div className="text-2xl mb-2">{action.icon}</div>
                    <h5 className="font-bold text-sm text-slate-900">{action.label}</h5>
                    <p className="text-xs text-slate-600 mt-1">{action.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Confidence & Approval */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Set Confidence & Approval</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Configure AI confidence threshold and approval settings
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  AI Confidence Threshold: {formData.confidenceThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={formData.confidenceThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, confidenceThreshold: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>50% (Low)</span>
                  <span>75% (Medium)</span>
                  <span>100% (High)</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Playbook will only auto-execute if AI confidence is above this threshold
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="requiresApproval"
                  checked={formData.requiresApproval}
                  onChange={(e) =>
                    setFormData({ ...formData, requiresApproval: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <label htmlFor="requiresApproval" className="font-medium text-slate-900 cursor-pointer">
                    Always require human approval
                  </label>
                  <p className="text-xs text-slate-600 mt-1">
                    If enabled, all executions will wait for manual approval, regardless of confidence level
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Name & Enable */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Name & Enable</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Give your playbook a name and choose whether to enable it now
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Playbook Name *
                </label>
                <Input
                  placeholder="e.g., Auto-Refund Damaged Products Under $100"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Describe what this playbook does..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm min-h-[80px]"
                />
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <label htmlFor="enabled" className="font-medium text-green-900 cursor-pointer flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Enable playbook immediately
                  </label>
                  <p className="text-xs text-green-700 mt-1">
                    Start running this automation right away. You can disable it later.
                  </p>
                </div>
              </div>

              {/* Summary */}
              <Card className="p-4 bg-indigo-50 border border-indigo-200">
                <h4 className="font-bold text-indigo-900 mb-3">Playbook Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Category:</span>
                    <span className="font-semibold text-slate-900">
                      {CATEGORIES.find((c) => c.value === formData.category)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Trigger:</span>
                    <span className="font-semibold text-slate-900">
                      {TRIGGER_TYPES.find((t) => t.value === formData.triggerType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conditions:</span>
                    <span className="font-semibold text-slate-900">{formData.conditions.length} rules</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Actions:</span>
                    <span className="font-semibold text-slate-900">{formData.actions.length} steps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">AI Threshold:</span>
                    <span className="font-semibold text-slate-900">{formData.confidenceThreshold}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Approval:</span>
                    <span className="font-semibold text-slate-900">
                      {formData.requiresApproval ? 'Required' : 'Auto-run'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button onClick={handlePrevious} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="bg-indigo-600 hover:bg-indigo-700">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!canProceed()} className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-1" />
                Save Playbook
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

