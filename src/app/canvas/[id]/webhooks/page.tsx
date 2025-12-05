'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { WebhookConfig, WebhookEvent, StitchFlow } from '@/types/stitch';
import { Webhook, Copy, Plus, Activity, ArrowLeft, Check, X } from 'lucide-react';

export default function WebhooksPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params.id as string;

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [workflows, setWorkflows] = useState<StitchFlow[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [recentEvents, setRecentEvents] = useState<WebhookEvent[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    source: 'custom',
    workflow_id: '',
    entry_edge_id: '',
    entity_mapping: {
      name: '$.body.name',
      email: '$.body.email',
      entity_type: 'lead',
      metadata: {}
    }
  });

  const [availableEdges, setAvailableEdges] = useState<Array<{ id: string; label: string }>>([]);

  const fetchWebhooks = async () => {
    const { data } = await supabase
      .from('stitch_webhook_configs')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('created_at', { ascending: false });
    
    if (data) setWebhooks(data);
  };

  const fetchWorkflows = async () => {
    const { data } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'workflow')
      .eq('parent_id', canvasId);
    
    if (data) setWorkflows(data);
  };

  const fetchRecentEvents = async (webhookId: string) => {
    const { data } = await supabase
      .from('stitch_webhook_events')
      .select('*')
      .eq('webhook_config_id', webhookId)
      .order('received_at', { ascending: false })
      .limit(10);
    
    if (data) setRecentEvents(data);
  };

  const loadWorkflowEdges = async (workflowId: string) => {
    const { data } = await supabase
      .from('stitch_flows')
      .select('graph')
      .eq('id', workflowId)
      .single();
    
    if (data?.graph?.edges) {
      const edges = data.graph.edges.map((edge: any) => ({
        id: edge.id,
        label: `${edge.source} → ${edge.target}`
      }));
      setAvailableEdges(edges);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const endpoint_slug = `${formData.source}-${Date.now()}`;
    
    const { error } = await supabase
      .from('stitch_webhook_configs')
      .insert({
        canvas_id: canvasId,
        name: formData.name,
        source: formData.source,
        endpoint_slug,
        workflow_id: formData.workflow_id,
        entry_edge_id: formData.entry_edge_id,
        entity_mapping: formData.entity_mapping,
        is_active: true
      });

    if (!error) {
      fetchWebhooks();
      setShowCreateForm(false);
      resetForm();
    }
  };

  const toggleWebhookStatus = async (webhook: WebhookConfig) => {
    await supabase
      .from('stitch_webhook_configs')
      .update({ is_active: !webhook.is_active })
      .eq('id', webhook.id);
    
    fetchWebhooks();
  };

  const copyWebhookUrl = (slug: string, id: string) => {
    const url = `${window.location.origin}/api/webhooks/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      source: 'custom',
      workflow_id: '',
      entry_edge_id: '',
      entity_mapping: {
        name: '$.body.name',
        email: '$.body.email',
        entity_type: 'lead',
        metadata: {}
      }
    });
    setAvailableEdges([]);
  };

  useEffect(() => {
    fetchWebhooks();
    fetchWorkflows();
  }, [canvasId]);

  useEffect(() => {
    if (selectedWebhook) {
      fetchRecentEvents(selectedWebhook.id);
    }
  }, [selectedWebhook]);

  useEffect(() => {
    if (formData.workflow_id) {
      loadWorkflowEdges(formData.workflow_id);
    }
  }, [formData.workflow_id]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/canvas/${canvasId}`)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Webhook className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-semibold">Webhook Configuration</h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Webhook
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Webhook List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Existing Webhooks</h2>
            {webhooks.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No webhooks configured yet</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  onClick={() => setSelectedWebhook(webhook)}
                  className={`bg-gray-900 border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedWebhook?.id === webhook.id
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{webhook.name}</h3>
                      <p className="text-sm text-gray-400 capitalize">{webhook.source}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWebhookStatus(webhook);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        webhook.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-950 rounded px-3 py-2 text-sm font-mono">
                    <span className="text-gray-400 truncate flex-1">
                      /api/webhooks/{webhook.endpoint_slug}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyWebhookUrl(webhook.endpoint_slug, webhook.id);
                      }}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                      {copiedId === webhook.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Details or Create Form */}
          <div>
            {showCreateForm ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Create New Webhook</h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateWebhook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="linkedin">LinkedIn</option>
                      <option value="stripe">Stripe</option>
                      <option value="typeform">Typeform</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Linked Workflow</label>
                    <select
                      value={formData.workflow_id}
                      onChange={(e) => setFormData({ ...formData, workflow_id: e.target.value, entry_edge_id: '' })}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a workflow...</option>
                      {workflows.map((wf) => (
                        <option key={wf.id} value={wf.id}>
                          {wf.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {availableEdges.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Entry Edge</label>
                      <select
                        value={formData.entry_edge_id}
                        onChange={(e) => setFormData({ ...formData, entry_edge_id: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select entry point...</option>
                        {availableEdges.map((edge) => (
                          <option key={edge.id} value={edge.id}>
                            {edge.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="border-t border-gray-800 pt-4 mt-4">
                    <h3 className="text-sm font-semibold mb-3">Entity Mapping</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Name (JSONPath)</label>
                        <input
                          type="text"
                          value={formData.entity_mapping.name}
                          onChange={(e) => setFormData({
                            ...formData,
                            entity_mapping: { ...formData.entity_mapping, name: e.target.value }
                          })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="$.body.name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Email (JSONPath)</label>
                        <input
                          type="text"
                          value={formData.entity_mapping.email}
                          onChange={(e) => setFormData({
                            ...formData,
                            entity_mapping: { ...formData.entity_mapping, email: e.target.value }
                          })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="$.body.email"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Entity Type</label>
                        <input
                          type="text"
                          value={formData.entity_mapping.entity_type}
                          onChange={(e) => setFormData({
                            ...formData,
                            entity_mapping: { ...formData.entity_mapping, entity_type: e.target.value }
                          })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="lead"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    Create Webhook
                  </button>
                </form>
              </div>
            ) : selectedWebhook ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold">Recent Events</h2>
                </div>

                {recentEvents.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No events yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-gray-950 border border-gray-800 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              event.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : event.status === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {event.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.received_at).toLocaleString()}
                          </span>
                        </div>
                        {event.error && (
                          <p className="text-xs text-red-400 mt-2">{event.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">Select a webhook to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
