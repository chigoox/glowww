"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Drawer, Table, Tag, Space, Select, Input, Button, Tooltip, Typography, Modal, Form, Switch, message, Tabs, Divider, Popconfirm, Alert, Badge } from 'antd';
import { ReloadOutlined, FilterOutlined, BulbOutlined, SendOutlined, RedoOutlined, EditOutlined, DeleteOutlined, SaveOutlined, MailOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const { Text } = Typography;

/**
 * SiteEmailManager
 * Drawer listing emails for a specific site (by siteId).
 * Props:
 *  - site: site object { id, name }
 *  - open: boolean
 *  - onClose: fn
 */
export default function SiteEmailManager({ site, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState();
  const [template, setTemplate] = useState();
  const [recipient, setRecipient] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [composeForm] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);
  const [aiTarget, setAiTarget] = useState('subject');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [suppressions, setSuppressions] = useState([]);
  const [suppLoading, setSuppLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const [inbound, setInbound] = useState([]);
  const [inboundLoading, setInboundLoading] = useState(false);
  const [addSuppOpen, setAddSuppOpen] = useState(false);
  const [suppForm] = Form.useForm();
  const [suppScope, setSuppScope] = useState();
  const [recipientSuppressed, setRecipientSuppressed] = useState(false);
  const editorRef = useRef(null);
  const [warmup, setWarmup] = useState(null);
  const [warmupLoading, setWarmupLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const { user } = useAuth();
  const testEmail = user?.email;
  const [testSending, setTestSending] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // Working lightweight bundled editor (no API key) with extended toolbar
  const RichEditor = React.useMemo(() => dynamic(() => import('./RichEditor'), { ssr:false, loading: () => <div style={{ padding:8, fontSize:12 }}>Loading editor...</div> }), []);

  const reset = () => {
    setMessages([]); setNextCursor(null);
  };

  const buildQuery = (cursorOverride) => {
    const params = new URLSearchParams();
    params.set('siteId', site.id);
    if (status) params.set('status', status);
    if (template) params.set('template', template);
    if (recipient) params.set('to', recipient.trim());
    if (cursorOverride) params.set('cursor', cursorOverride);
    params.set('limit', '25');
    return `/api/email/messages?${params.toString()}`;
  };

  const load = useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    try {
      const res = await fetch(buildQuery());
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      setMessages(data.messages || []);
      setNextCursor(data.nextCursor || null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Email messages load error', e);
    } finally { setLoading(false); }
  }, [site?.id, status, template, recipient]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setFetchingMore(true);
    try {
      const res = await fetch(buildQuery(nextCursor));
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      setMessages(m => [...m, ...(data.messages || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (e) { console.error(e); } // silent
    finally { setFetchingMore(false); }
  };

  // Reload on filter change or when opened
  useEffect(()=>{ if (open) { reset(); load(); fetchTemplates(); fetchDrafts(); loadSuppressions(); fetchInbound(); fetchQuotaStatus(); } }, [open, load]);

  async function fetchQuotaStatus() {
    if (!user?.uid) return;
    setQuotaLoading(true);
    try {
      const res = await fetch(`/api/email/quota?userId=${encodeURIComponent(user.uid)}`);
      const json = await res.json();
      if (json.ok) setQuotaStatus(json);
    } catch { /* silent */ }
    finally { setQuotaLoading(false); }
  }

  async function fetchInbound() {
    setInboundLoading(true);
    try {
      const res = await fetch('/api/email/inbound?limit=50');
      const json = await res.json();
      if (json.ok) setInbound(json.items || []);
    } catch { /* silent */ }
    finally { setInboundLoading(false); }
  }

  // Watch compose recipient for suppression status (simple client check against loaded suppressions list)
  useEffect(()=>{
    const toVal = composeForm.getFieldValue('to');
    if (!toVal) { setRecipientSuppressed(false); return; }
    const low = toVal.toLowerCase();
    const scopesToCheck = new Set();
    if (site?.id) scopesToCheck.add(`site:${site.id}`);
    scopesToCheck.add('platform-mkt');
    const hit = suppressions.some(s=> s.email === low && scopesToCheck.has(s.scope));
    setRecipientSuppressed(hit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeForm.getFieldValue('to'), suppressions, site?.id]);

  async function loadSuppressions() {
    if (!site?.id) return;
    setSuppLoading(true);
    try {
      const res = await fetch(`/api/email/suppressions?siteId=${site.id}`);
      const json = await res.json();
      if (json.ok) setSuppressions(json.suppressions || []);
    } catch (e) { /* silent */ }
    finally { setSuppLoading(false); }
  }

  async function addSuppression(values) {
    try {
      const scope = values.scope || (values.siteScope ? `site:${site.id}` : 'platform-mkt');
      const body = { email: values.email, reason: values.reason || 'manual', scope };
      const res = await fetch('/api/email/suppressions', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Add failed');
      message.success('Suppressed');
      setAddSuppOpen(false);
      suppForm.resetFields();
      loadSuppressions();
    } catch (e) { message.error(e.message); }
  }

  async function removeSuppression(row) {
    try {
      const res = await fetch('/api/email/suppressions', { method:'DELETE', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id: row.id }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Delete failed');
      message.success('Removed');
      loadSuppressions();
    } catch (e) { message.error(e.message); }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/email/templates');
      const json = await res.json();
      if (json.ok) setTemplates(json.templates || []);
    } catch (e) { /* silent */ }
  }

  async function fetchDrafts() {
    if (!site?.id) return;
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/email/drafts?siteId=${site.id}`);
      const json = await res.json();
      if (json.ok) setDrafts(json.drafts || []);
    } catch (e) { console.error(e); }
    finally { setDraftLoading(false); }
  }

  const columns = [
    { title: 'Sent', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: v => v?.toDate ? new Date(v.toDate()).toLocaleString() : (v?.seconds ? new Date(v.seconds * 1000).toLocaleString() : '—') },
    { title: 'To', dataIndex: 'to', key: 'to', ellipsis: true },
    { title: 'Template', dataIndex: 'templateKey', key: 'templateKey', ellipsis: true },
    { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: s => <Tag color={statusColor(s)}>{s}</Tag> },
    { title: 'Actions', key: 'actions', width: 140, render: (_, r) => (
      <Space size="small">
        <Button size="small" onClick={()=>openDetail(r.id)}>View</Button>
        {['bounced','complaint','queued'].includes(r.status) ? <Button size="small" icon={<RedoOutlined />} onClick={()=>handleResend(r)} /> : null}
      </Space>
    ) }
  ];

  async function fetchWarmup() {
    if (!site?.id) return;
    setWarmupLoading(true);
    try {
      const res = await fetch(`/api/email/warmup/stats?siteId=${site.id}`);
      const json = await res.json();
      if (json.ok) setWarmup({ count: json.count, cap: json.cap, domain: json.domain });
    } catch { /* silent */ }
    finally { setWarmupLoading(false); }
  }

  useEffect(()=>{ if (open) fetchWarmup(); }, [open]);

  async function openDetail(id) {
    setDetailOpen(true); setDetailLoading(true); setDetail(null);
    try {
      const res = await fetch(`/api/email/messages/${id}`);
      const json = await res.json();
      if (json.ok) setDetail(json);
      else message.error(json.error || 'Failed to load detail');
    } catch (e) { message.error(e.message); }
    finally { setDetailLoading(false); }
  }

  async function handleResend(row) {
    try {
      const res = await fetch('/api/email/resend', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ messageId: row.id }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Resend failed');
      message.success('Resent');
      load();
    } catch (e) { message.error(e.message); }
  }

  const openAiFor = (target) => { setAiTarget(target); setAiPrompt(''); setAiVisible(true); };

  const runAi = async () => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/email/ai/generate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ prompt: aiPrompt, kind: aiTarget }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'AI failed');
      if (aiTarget === 'subject') composeForm.setFieldsValue({ subject: json.text });
      else composeForm.setFieldsValue({ body: json.text });
      setAiVisible(false);
    } catch (e) { message.error(e.message); }
    finally { setAiLoading(false); }
  };

  const submitCompose = async () => {
    try {
      const values = await composeForm.validateFields();
      setSending(true);
      let endpoint; let payload;
      if (values.mode === 'template') {
        endpoint = '/api/email/send';
        payload = { to: values.to, templateKey: values.templateKey, data: {}, siteId: site.id, overrideSubject: values.subject };
      } else {
        endpoint = '/api/email/custom-send';
        payload = { to: values.to, subject: values.subject, html: values.body || editorRef.current?.getContent?.() || '<p>(No content)</p>', siteId: site.id, marketing };
      }
      const res = await fetch(endpoint, { method:'POST', headers:{ 'Content-Type':'application/json', 'x-internal-email-key': process.env.NEXT_PUBLIC_DUMMY || '' }, body: JSON.stringify({...payload, userId: user?.uid}) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Send failed');
      message.success('Email sent');
      load();
      fetchQuotaStatus(); // Refresh quota after send
      composeForm.resetFields();
      setComposeOpen(false);
    } catch (e) { message.error(e.message); }
    finally { setSending(false); }
  };

  const saveDraft = async () => {
    try {
      const values = await composeForm.validateFields();
      const payload = { id: editingDraftId || undefined, siteId: site.id, to: values.to, subject: values.subject, body: values.body || editorRef.current?.getContent?.() || '', mode: values.mode, templateKey: values.templateKey, marketing };
      const res = await fetch('/api/email/drafts', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Save failed');
      message.success('Draft saved');
      setEditingDraftId(json.id);
      fetchDrafts();
    } catch (e) { message.error(e.message); }
  };

  const editDraft = (d) => {
    composeForm.setFieldsValue({ mode: d.mode, to: d.to, subject: d.subject, templateKey: d.templateKey || undefined, body: d.body });
    setMarketing(!!d.marketing);
    setEditingDraftId(d.id);
    setComposeOpen(true);
  };

  const deleteDraft = async (d) => {
    try {
      const res = await fetch('/api/email/drafts', { method:'DELETE', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id: d.id }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Delete failed');
      fetchDrafts();
      if (editingDraftId === d.id) { composeForm.resetFields(); setEditingDraftId(null); }
    } catch (e) { message.error(e.message); }
  };

  const sendDraft = async (d) => {
    try {
      const res = await fetch('/api/email/drafts/send', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id: d.id }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Send failed');
      message.success('Draft sent');
      fetchDrafts();
      load();
    } catch (e) { message.error(e.message); }
  };

  const doTestSend = async () => {
    try {
      if (!testEmail) { message.warning('No signed-in user email for test'); return; }
      const values = await composeForm.validateFields(['mode','templateKey','subject','body','to']);
      setTestSending(true);
      const mode = values.mode || 'template';
      const payload = mode === 'template' ? { mode:'template', templateKey: values.templateKey, siteId: site.id, data:{}, subjectOverride: values.subject } : { mode:'custom', siteId: site.id, subject: values.subject, html: values.body || editorRef.current?.getContent?.() || '<p>(No content)</p>' };
      const res = await fetch('/api/email/test-send', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-test-recipient': testEmail }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Test send failed');
      message.success('Test email sent to you');
    } catch (e) { if (e?.errorFields) { /* validation */ } else message.error(e.message); }
    finally { setTestSending(false); }
  };

  return (
    <Drawer
      title={<span>Email for <Text code>{site?.name}</Text></span>}
      width={900}
      open={open}
      onClose={onClose}
  destroyOnHidden
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 } }}
    >
      <Space style={{ justifyContent:'space-between', width:'100%' }} wrap>
        <Space>
          <Tooltip title="Compose new email"><Button size="small" type="primary" icon={<EditOutlined />} onClick={()=>{ composeForm.resetFields(); composeForm.setFieldsValue({ mode:'template' }); setEditingDraftId(null); setMarketing(false); setComposeOpen(true); }} /></Tooltip>
          <Tooltip title="Reload messages"><Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading} /></Tooltip>
          <Tooltip title="Reload suppressions"><Button icon={<ReloadOutlined />} size="small" onClick={loadSuppressions} loading={suppLoading} /></Tooltip>
          <Tooltip title="Export CSV"><Button size="small" onClick={()=> { if (!site?.id) return; const params = new URLSearchParams({ siteId: site.id }); if (status) params.set('status', status); if (template) params.set('template', template); if (recipient) params.set('to', recipient.trim()); window.open(`/api/email/messages/export?${params.toString()}`,'_blank'); }}>Export</Button></Tooltip>
        </Space>
        <Space>
          {warmup && (
            <Tooltip title={`Warm-up usage for ${warmup.domain}`}>
              <Badge status={warmup.count > warmup.cap ? 'error':'processing'} text={<span style={{ fontSize:12 }}>Warm-up {warmup.count}/{warmup.cap}</span>} />
            </Tooltip>
          )}
          {quotaStatus && quotaStatus.limit > 0 && (
            <Tooltip title={`Daily send quota (resets ${new Date(quotaStatus.resetTime).toLocaleTimeString()})`}>
              <Badge 
                status={quotaStatus.usage >= quotaStatus.limit ? 'error' : quotaStatus.usage/quotaStatus.limit > 0.8 ? 'warning' : 'processing'} 
                text={<span style={{ fontSize:12 }}>{quotaStatus.tier.toUpperCase()} {quotaStatus.usage}/{quotaStatus.limit}</span>} 
              />
            </Tooltip>
          )}
          {quotaStatus && quotaStatus.limit === -1 && (
            <Tooltip title="Unlimited sending (admin tier)">
              <Badge status="success" text={<span style={{ fontSize:12 }}>ADMIN ∞</span>} />
            </Tooltip>
          )}
          <Tooltip title="Refresh warm-up stats"><Button size="small" onClick={fetchWarmup} loading={warmupLoading}>WU</Button></Tooltip>
          <Tooltip title="Refresh quota"><Button size="small" onClick={fetchQuotaStatus} loading={quotaLoading}>Q</Button></Tooltip>
          <Select
            allowClear
            placeholder="Status"
            size="small"
            style={{ width: 140 }}
            value={status}
            onChange={v => setStatus(v)}
            options={[ 'queued','sent','delivered','opened','clicked','bounced','complaint' ].map(v=>({ value: v, label: v }))}
          />
          <Input
            size="small"
            placeholder="Template key"
            style={{ width: 180 }}
            value={template}
            onChange={e=> setTemplate(e.target.value || undefined)}
          />
          <Input
            size="small"
            placeholder="Recipient"
            style={{ width: 200 }}
            value={recipient}
            onChange={e=> setRecipient(e.target.value)}
          />
          <Tooltip title="Apply / Refresh">
            <Button icon={<FilterOutlined />} size="small" onClick={load} disabled={loading} />
          </Tooltip>
          <Tooltip title="Clear filters">
            <Button size="small" onClick={()=>{ setStatus(undefined); setTemplate(undefined); setRecipient(''); }} />
          </Tooltip>
        </Space>
      </Space>
      <Tabs size="small" activeKey={activeTab} onChange={setActiveTab} items={[
        { key:'messages', label:'Messages' },
        { key:'drafts', label:'Drafts' },
  { key:'suppressions', label: <span>Suppressions{suppLoading? '': ` (${suppressions.length})`}</span> },
  { key:'inbound', label:'Inbound' }
      ]} />
      {activeTab === 'drafts' && <>
      <Divider plain style={{ margin:'4px 0' }}>Drafts</Divider>
      <Table
        size="small"
        rowKey="id"
        dataSource={drafts}
        loading={draftLoading}
        pagination={false}
        columns={[
          { title:'Updated', dataIndex:'updatedAt', width:140, render:v=>v?.toDate? new Date(v.toDate()).toLocaleString() : (v?.seconds? new Date(v.seconds*1000).toLocaleString():'—') },
          { title:'To', dataIndex:'to', ellipsis:true },
          { title:'Subject', dataIndex:'subject', ellipsis:true },
          { title:'Mode', dataIndex:'mode', width:80 },
          { title:'Template', dataIndex:'templateKey', ellipsis:true, render:v=>v||'—' },
          { title:'Mkt', dataIndex:'marketing', width:60, render:v=> v? <Tag color="gold">Yes</Tag>: <Tag>—</Tag> },
          { title:'Actions', key:'actions', width:130, render:(_,r)=>(<Space size="small"><Tooltip title="Edit"><Button icon={<EditOutlined />} size="small" onClick={()=>editDraft(r)} /></Tooltip><Tooltip title="Send"><Button icon={<SendOutlined />} size="small" type="primary" onClick={()=>sendDraft(r)} /></Tooltip><Popconfirm title="Delete draft?" onConfirm={()=>deleteDraft(r)}><Button icon={<DeleteOutlined />} size="small" danger /></Popconfirm></Space>) }
        ]}
        locale={{ emptyText: draftLoading? 'Loading...' : 'No drafts' }}
        style={{ marginBottom:12 }}
      />
      </>}
      {activeTab === 'messages' && <>
        <Divider plain style={{ margin:'4px 0' }}>Messages</Divider>
        <Space wrap size="small">
          <Tooltip title="Reload">
            <Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading} />
          </Tooltip>
        </Space>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Table
            size="small"
            rowKey="id"
            dataSource={messages}
            columns={columns}
            pagination={false}
            sticky
            scroll={{ y: 420 }}
            style={{ flex: 1 }}
            locale={{ emptyText: loading ? 'Loading...' : 'No emails' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <Text type="secondary" style={{ fontSize:12 }}>
              {messages.length} message{messages.length !== 1 && 's'}{nextCursor && ' (more available)'}
            </Text>
            {nextCursor && <Button size="small" onClick={loadMore} loading={fetchingMore}>Load more</Button>}
          </div>
        </div>
      </>}
      {activeTab === 'suppressions' && <>
        <Divider plain style={{ margin:'4px 0' }}>Suppressions</Divider>
        <div style={{ marginBottom:8, display:'flex', justifyContent:'space-between' }}>
          <Space>
            <Button size="small" onClick={()=> setAddSuppOpen(true)} type="primary">Add</Button>
            <Button size="small" onClick={loadSuppressions} loading={suppLoading} icon={<ReloadOutlined />}>Refresh</Button>
            <Select size="small" allowClear placeholder="Scope filter" style={{ width:180 }} value={suppScope} onChange={v=> setSuppScope(v)} options={[{ value:`site:${site.id}`, label:`site:${site.id}` }, { value:'platform-mkt', label:'platform-mkt' }]} />
          </Space>
        </div>
        <Table
          size="small"
          rowKey="id"
          dataSource={suppressions.filter(s=> !suppScope || s.scope===suppScope)}
          loading={suppLoading}
          pagination={false}
          columns={[
            { title:'Email', dataIndex:'email', ellipsis:true },
            { title:'Scope', dataIndex:'scope', width:160 },
            { title:'Reason', dataIndex:'reason', width:120 },
            { title:'Added', dataIndex:'createdAt', width:140, render:v=> v?.toDate? new Date(v.toDate()).toLocaleString() : (v?.seconds? new Date(v.seconds*1000).toLocaleString(): '—') },
            { title:'Source', dataIndex:'automated', width:80, render:v=> v ? <Tag color="blue" size="small">Auto</Tag> : <Tag size="small">Manual</Tag> },
            { title:'Actions', key:'actions', width:90, render:(_,r)=> <Popconfirm title="Remove suppression?" onConfirm={()=>removeSuppression(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }
          ]}
          locale={{ emptyText: suppLoading? 'Loading...' : 'No suppressions' }}
          scroll={{ y: 420 }}
        />
      </>}
      {activeTab === 'inbound' && <>
        <Divider plain style={{ margin:'4px 0' }}>Inbound Email</Divider>
        <div style={{ marginBottom:8 }}>
          <Space>
            <Button size="small" onClick={fetchInbound} loading={inboundLoading} icon={<ReloadOutlined />}>Refresh</Button>
          </Space>
        </div>
        <Table
          size="small"
          rowKey="id"
          dataSource={inbound}
          loading={inboundLoading}
          pagination={false}
          columns={[
            { title:'Received', dataIndex:'receivedAt', width:150, render:v=> v?.toDate ? new Date(v.toDate()).toLocaleString() : (v?.seconds ? new Date(v.seconds*1000).toLocaleString(): '—') },
            { title:'From', dataIndex:'from', ellipsis:true },
            { title:'To', dataIndex:'to', ellipsis:true },
            { title:'Subject', dataIndex:'subject', ellipsis:true },
            { title:'Actions', key:'a', width:90, render:(_,r)=> <Button size="small" onClick={()=> Modal.info({ title:r.subject||'Inbound Email', width:720, content:<div style={{ maxHeight:400, overflow:'auto' }} dangerouslySetInnerHTML={{ __html: r.html || `<pre>${(r.text||'').replace(/</g,'&lt;')}</pre>` }} /> })}>View</Button> }
          ]}
          scroll={{ y:420 }}
          locale={{ emptyText: inboundLoading? 'Loading...' : 'No inbound email' }}
        />
      </>}
  <Modal title={`AI Assist (${aiTarget})`} open={aiVisible} onCancel={()=>setAiVisible(false)} onOk={runAi} okButtonProps={{ loading: aiLoading }} okText="Generate" destroyOnHidden>
        <Input.TextArea rows={4} value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder={aiTarget==='subject'?'Describe the email subject goal':'Describe the email body you want'} />
        <div style={{ marginTop:8 }}>
          <Text type="secondary" style={{ fontSize:12 }}>Model: {process.env.OPENAI_MODEL || 'gpt-4o-mini'} • Keep prompts factual. Review output before sending.</Text>
        </div>
      </Modal>
      <Modal
        title={editingDraftId ? 'Edit Draft' : 'Compose Email'}
        open={composeOpen}
        onCancel={()=>{ setComposeOpen(false); setEditingDraftId(null); composeForm.resetFields(); }}
        width={820}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" form={composeForm} initialValues={{ mode:'template' }} onFinish={submitCompose}>
          {recipientSuppressed && (
            <Alert type="warning" showIcon style={{ marginBottom:8 }} message="Recipient is suppressed" description="This email address is in a suppression list (unsubscribe). Remove suppression to send marketing email." />
          )}
          <Space style={{ width:'100%', justifyContent:'space-between' }} wrap>
            <Space>
              <Form.Item name="mode" noStyle>
                <Select size="small" style={{ width:120 }} options={[{ value:'template', label:'Template'},{ value:'custom', label:'Custom'}]} onChange={()=>{ /* re-render */ }} />
              </Form.Item>
              <Form.Item name="to" rules={[{ required:true, message:'Recipient required'}]} style={{ marginBottom:0 }}>
                <Input size="small" placeholder="Recipient email" style={{ width:220 }} />
              </Form.Item>
              {composeForm.getFieldValue('mode') === 'template' && (
                <Form.Item name="templateKey" rules={[{ required:true, message:'Template'}]} style={{ marginBottom:0 }}>
                  <Select
                    showSearch
                    size="small"
                    placeholder="Select template"
                    optionFilterProp="label"
                    style={{ width:260 }}
                    options={templates.map(t=>({ value:t.key, label:t.key, description:t.description }))}
                    popupRender={menu=> <div style={{ maxWidth:360 }}>{menu}</div> }
                  />
                </Form.Item>
              )}
            </Space>
            <Space size="small">
              <Switch size="small" checked={marketing} onChange={setMarketing} />
              <Text type="secondary" style={{ fontSize:12 }}>Marketing</Text>
            </Space>
          </Space>
          <Form.Item name="subject" rules={[{ required:true, message:'Subject required'}]} style={{ marginTop:8, marginBottom:8 }}>
            <Input size="small" placeholder="Subject" suffix={<BulbOutlined onClick={()=>openAiFor('subject')} style={{ cursor:'pointer', color:'#faad14' }} />} />
          </Form.Item>
          {composeForm.getFieldValue('mode') === 'template' && (
            <Button size="small" style={{ marginBottom:8 }} onClick={async ()=>{
              try {
                const key = composeForm.getFieldValue('templateKey');
                if (!key) { message.warning('Select template first'); return; }
                const res = await fetch('/api/email/templates/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ templateKey: key, siteId: site.id, data:{} }) });
                const json = await res.json();
                if (!json.ok) throw new Error(json.error || 'Preview failed');
                Modal.info({ title:`Preview: ${json.subject}`, width:720, content: <div style={{ maxHeight:400, overflow:'auto' }} dangerouslySetInnerHTML={{ __html: json.html }} /> });
              } catch (e) { message.error(e.message); }
            }}>Preview Template</Button>
          )}
          {composeForm.getFieldValue('mode') === 'custom' && (
            <div style={{ marginBottom:12 }}>
              <RichEditor
                value={composeForm.getFieldValue('body') || ''}
                onChange={(v)=> composeForm.setFieldsValue({ body: v }) }
                height={320}
              />
              <Button size="small" type="dashed" icon={<BulbOutlined />} onClick={()=>openAiFor('body')} style={{ marginTop:8 }}>AI body</Button>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <Space>
              <Button size="small" icon={<SaveOutlined />} onClick={saveDraft}>Save Draft</Button>
              {editingDraftId && <Button size="small" onClick={()=>{ setEditingDraftId(null); composeForm.resetFields(); }}>New</Button>}
            </Space>
            <Space>
              {testEmail && <Tooltip title={`Send only to you (${testEmail})`}><Button size="small" icon={<ExperimentOutlined />} onClick={doTestSend} loading={testSending}>Test Send</Button></Tooltip>}
              <Button size="small" onClick={()=>composeForm.resetFields()}>Reset</Button>
              <Button size="small" type="primary" icon={<SendOutlined />} loading={sending} onClick={submitCompose}>Send</Button>
            </Space>
          </div>
        </Form>
      </Modal>
      <Modal
        title="Add Suppression"
        open={addSuppOpen}
        onCancel={()=>{ setAddSuppOpen(false); suppForm.resetFields(); }}
        onOk={()=> suppForm.submit()}
        okText="Add"
        destroyOnHidden
      >
        <Form form={suppForm} layout="vertical" onFinish={addSuppression} initialValues={{ siteScope:true }}>
          <Form.Item name="email" label="Email" rules={[{ required:true, message:'Email required' }]}>
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input placeholder="unsubscribe / complaint / bounce / manual" />
          </Form.Item>
          <Form.Item name="siteScope" label="Scope" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ fontSize:12, marginTop:-8 }}>
            {`If ON uses site:${site?.id}; otherwise platform-mkt.`}
          </Typography.Paragraph>
        </Form>
      </Modal>
      <Drawer
        title={detail?.message ? `Message ${detail.message.id}` : 'Message detail'}
        open={detailOpen}
        width={720}
        onClose={()=>{ setDetailOpen(false); setDetail(null); }}
        destroyOnClose
      >
        {detailLoading && <div style={{ padding:16 }}>Loading...</div>}
        {!detailLoading && detail && detail.message && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <Typography.Title level={5} style={{ marginBottom:4 }}>{detail.message.subject}</Typography.Title>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                <Tag>{detail.message.status}</Tag>
                {detail.message.templateKey && <Tag color="blue">Template: {detail.message.templateKey}</Tag>}
                {detail.rendered?.error && <Tag color="red">Render error</Tag>}
              </div>
            </div>
            <div style={{ fontSize:12, color:'#666' }}>
              <div><strong>To:</strong> {detail.message.to}</div>
              <div><strong>From:</strong> {detail.message.from}</div>
              {detail.message.siteId && <div><strong>Site:</strong> {detail.message.siteId}</div>}
              <div><strong>Created:</strong> {detail.message.createdAt?.toDate ? new Date(detail.message.createdAt.toDate()).toLocaleString() : (detail.message.createdAt?.seconds ? new Date(detail.message.createdAt.seconds*1000).toLocaleString(): '—')}</div>
            </div>
            {detail.rendered && !detail.rendered.error && (
              <div style={{ border:'1px solid #ddd', borderRadius:6, padding:12, maxHeight:300, overflow:'auto', background:'#fff' }} dangerouslySetInnerHTML={{ __html: detail.rendered.html }} />
            )}
            {detail.rendered?.error && <Alert type="error" message="Template render failed" description={detail.rendered.error} showIcon />}
            <Divider orientation="left" plain style={{ margin:'8px 0' }}>Raw JSON</Divider>
            <pre style={{ background:'#111', color:'#eee', padding:12, borderRadius:6, maxHeight:240, overflow:'auto', fontSize:11 }}>{JSON.stringify(detail.message, null, 2)}</pre>
          </div>
        )}
      </Drawer>
    </Drawer>
  );
}

function statusColor(s) {
  switch (s) {
    case 'sent': return 'blue';
    case 'delivered': return 'green';
    case 'opened': return 'gold';
    case 'clicked': return 'purple';
    case 'bounced': return 'red';
    case 'complaint': return 'magenta';
    default: return 'default';
  }
}
