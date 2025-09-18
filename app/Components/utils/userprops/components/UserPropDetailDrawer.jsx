import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Tabs, Typography, Space, Tag, Button, Tooltip, message, Table, Alert } from 'antd';
import { InfoCircleOutlined, FunctionOutlined, EyeOutlined, AlertOutlined, CodeOutlined, FileTextOutlined } from '@ant-design/icons';
import ExpressionEditor from './ExpressionEditor';
import ValidationEditor from './ValidationEditor';
import WatchersEditor from './WatchersEditor';
import { t } from '../userprops.messages';
import UserPropsTemplateLibrary from '../../../userprops/UserPropsTemplateLibrary';
import DependencyGraphViewer from './DependencyGraphViewer';

/**
 * UserPropDetailDrawer
 * Props:
 *  - open
 *  - path
 *  - onClose
 *  - hookApis: object containing required hook methods
 *  - nodeMeta
 *  - validationErrors (map)
 */
export default function UserPropDetailDrawer({ open, path, onClose, hookApis, nodeMeta, validationErrors, onDependencyClick, onRequestPathChange }) {
  const {
    getValueAtPath,
    setPrimitiveAtPath,
    setPrimitiveSmartAtPath,
    setExpression,
    clearExpression,
    updateValidation,
    clearValidation,
    addWatcher,
    removeWatcher,
    updateWatcher,
    listWatchers,
    listDependencies,
  getValidationErrors,
  getExpressionHistory,
  getJsValueAtPath,
  getWatcherLogs
  } = hookApis;
  const getPathDiff = hookApis.getPathDiff;

  const [activeTab, setActiveTab] = useState('value');
  const [localValue, setLocalValue] = useState('');
  const [dirtyValue, setDirtyValue] = useState(false);

  const errorsForPath = validationErrors[path] || [];
  const isBound = nodeMeta?.meta?.ref;
  const hasExpression = !!nodeMeta?.meta?.expression;

  useEffect(() => {
    if (open && path) {
      const v = getValueAtPath(path);
      if (v !== undefined) {
        setLocalValue(v);
        setDirtyValue(false);
      }
    }
  }, [open, path, getValueAtPath]);

  const onApplyValue = () => {
    if (isBound || hasExpression) {
      message.warning('Value is read-only');
      return;
    }
    setPrimitiveSmartAtPath(path, localValue);
    setDirtyValue(false);
    message.success('Value updated');
  };

  const headerTags = (
    <Space size={4} wrap>
      <Tag color="blue">{nodeMeta?.type}</Tag>
      {isBound && <Tag color="gold">Bound</Tag>}
      {hasExpression && <Tag color="geekblue">Expr</Tag>}
      {!!errorsForPath.length && <Tag color="error">{errorsForPath.length} errs</Tag>}
    </Space>
  );

  const tabItems = [
    {
      key: 'value',
  label: t('userprops.drawer.tabs.value'),
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Editing Values</span>}
            description={<span className="text-xs">Direct value edits are disabled when a prop is bound or has an expression. Use Unbind or clear the expression to edit directly.</span>}
          />
          {isBound && <Typography.Text type="secondary">Bound to component prop; editing disabled.</Typography.Text>}
          {hasExpression && !isBound && <Typography.Text type="secondary">Computed by expression; direct edits disabled.</Typography.Text>}
          <div className="flex items-center gap-2">
            <Typography.Text type="secondary">Namespace</Typography.Text>
            <input
              className="border rounded px-2 py-1 text-xs"
              style={{flex:1}}
              placeholder="optional grouping tag"
              defaultValue={nodeMeta?.meta?.namespace || ''}
              onBlur={(e)=>{ hookApis.updateNodeMeta(path,{ namespace: e.target.value || undefined }); }}
            />
          </div>
          <textarea
            className="w-full rounded border p-2 font-mono text-sm"
            disabled={isBound || hasExpression}
            rows={5}
            value={localValue}
            onChange={e => { setLocalValue(e.target.value); setDirtyValue(true); }}
          />
          <div className="flex items-center gap-2">
            <Button type="primary" disabled={!dirtyValue || isBound || hasExpression} onClick={onApplyValue}>Apply</Button>
            {dirtyValue && <Button onClick={() => { const v = getValueAtPath(path); setLocalValue(v ?? ''); setDirtyValue(false); }}>Revert</Button>}
          </div>
          {errorsForPath.length > 0 && (
            <div className="mt-2 space-y-1">
              {errorsForPath.map((er,i)=>(<Typography.Text key={i} type="danger">• {er}</Typography.Text>))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'expression',
  label: <span>{t('userprops.drawer.tabs.expression')} {hasExpression && <FunctionOutlined style={{marginLeft:4}}/>}</span>,
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Expressions</span>}
            description={<span className="text-xs">Write small JS snippets to compute values. Click dependencies in the graph or suggestions to navigate. Expressions are disabled if the prop is bound.</span>}
          />
          <ExpressionEditor path={path} disabled={isBound || nodeMeta?.type==='object' || nodeMeta?.type==='array'} nodeMeta={nodeMeta} setExpression={setExpression} clearExpression={clearExpression} listDependencies={listDependencies} getExpressionHistory={getExpressionHistory} onDependencyClick={onDependencyClick} />
        </div>
      )
    },
    {
      key: 'validation',
  label: <span>{t('userprops.drawer.tabs.validation')} {errorsForPath.length>0 && <AlertOutlined style={{marginLeft:4,color:'var(--ant-color-error)'}}/>}</span>,
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Validation</span>}
            description={<span className="text-xs">Add constraints like required, min/max, or regex. Errors will appear here and next to the field.</span>}
          />
          <ValidationEditor path={path} nodeMeta={nodeMeta} updateValidation={updateValidation} clearValidation={clearValidation} errors={errorsForPath} />
        </div>
      )
    },
    {
      key: 'watchers',
  label: <span>{t('userprops.drawer.tabs.watchers')} <EyeOutlined style={{marginLeft:4}}/></span>,
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Watchers</span>}
            description={<span className="text-xs">Run scripts when this value changes. Use for side-effects like syncing with external services. Check Logs for results.</span>}
          />
          <WatchersEditor path={path} listWatchers={listWatchers} addWatcher={addWatcher} removeWatcher={removeWatcher} updateWatcher={updateWatcher} />
        </div>
      )
    },
    {
      key: 'json',
  label: <span>{t('userprops.drawer.tabs.json')} <FileTextOutlined style={{marginLeft:4}}/></span>,
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>JSON Preview</span>}
            description={<span className="text-xs">View the raw value or structure. Containers show structural JSON.</span>}
          />
          <JsonPreview path={path} getValueAtPath={getValueAtPath} nodeMeta={nodeMeta} />
        </div>
      )
    },
    {
      key: 'diff',
  label: t('userprops.drawer.tabs.diff'),
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Change Diff</span>}
            description={<span className="text-xs">Compare the latest two snapshots of this path to inspect changes.</span>}
          />
          <DiffPreview path={path} getPathDiff={getPathDiff} />
        </div>
      )
    },
    {
      key: 'watcherLogs',
  label: t('userprops.drawer.tabs.logs'),
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Watcher Logs</span>}
            description={<span className="text-xs">Recent watcher runs for this path. Errors and durations are shown here.</span>}
          />
          <WatcherLogs logs={(getWatcherLogs && getWatcherLogs()) || []} filterPath={path} />
        </div>
      )
    },
    {
      key: 'graph',
      label: t('userprops.drawer.tabs.graph'),
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Dependency Graph</span>}
            description={<span className="text-xs">See which props depend on or feed into others. Click a node to jump to it.</span>}
          />
          <DependencyGraphViewer rootTree={(hookApis.getUserPropsTree && hookApis.getUserPropsTree()) || null} onSelectPath={(p)=>{ if(!p) return; if (onRequestPathChange) onRequestPathChange(p); setActiveTab('value'); }} />
        </div>
      )
    },
    {
      key: 'templates',
      label: t('userprops.drawer.tabs.templates'),
      children: (
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            showIcon
            message={<span style={{fontWeight:600}}>Templates</span>}
            description={<span className="text-xs">Start from common recipes for expressions and watchers. Applying a template will update this path.</span>}
          />
          <UserPropsTemplateLibrary
            onApplyExpression={(tpl)=>{ if(path){ hookApis.applyExpressionTemplate(path, tpl.key, {}); message.success(t('userprops.templates.applied')); }}}
            onApplyWatcher={(tpl)=>{ if(path){ hookApis.applyWatcherTemplate(path, tpl.key, {}); message.success(t('userprops.templates.applied')); }}}
          />
        </div>
      )
    }
  ];

  return (
    <Drawer
      width={480}
      title={<Space direction="vertical" size={4} className="w-full">
        <Typography.Text strong>{path || '(root)'}</Typography.Text>
        {headerTags}
      </Space>}
      placement="right"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Drawer>
  );
}

function JsonPreview({ path, getValueAtPath, nodeMeta, getJsValueAtPath }) {
  if (!nodeMeta) return null;
  let data;
  if (nodeMeta.type === 'object' || nodeMeta.type === 'array') {
    data = getJsValueAtPath ? getJsValueAtPath(path) : undefined;
  } else {
    data = getValueAtPath(path);
  }
  return <pre className="bg-[var(--ant-color-bg-container)] rounded p-2 text-xs overflow-auto max-h-64">{JSON.stringify(data, null, 2)}</pre>;
}

function WatcherLogs({ logs, filterPath }) {
  const filtered = (logs||[]).filter(l => l.path === filterPath).slice(-50).reverse();
  if (!filtered.length) return <Typography.Text type="secondary">No watcher logs for this path.</Typography.Text>;
  return (
    <Table
      size="small"
      pagination={false}
      dataSource={filtered.map((l,i)=>({ key:i, ...l }))}
      columns={[
        { title:'Time', dataIndex:'ts', render: t=> new Date(t).toLocaleTimeString() },
        { title:'Duration', dataIndex:'durationMs', width:90, render: d=> d+'ms' },
        { title:'Status', dataIndex:'error', render: e=> e? <Tag color="error">Err</Tag>: <Tag color="green">OK</Tag> },
        { title:'Error', dataIndex:'error', ellipsis:true }
      ]}
      scroll={{ y: 240 }}
    />
  );
}

function DiffPreview({ path, getPathDiff }) {
  if (!path || !getPathDiff) return <Typography.Text type="secondary">No diff</Typography.Text>;
  const diff = getPathDiff(path);
  if (!diff.length) return <Typography.Text type="secondary">No previous snapshot</Typography.Text>;
  return (
    <pre className="text-xs overflow-auto max-h-64 p-2 rounded border" style={{background:'#1e1e1e',color:'#ddd'}}>
      {diff.map((d,i)=>{
        const color = d.type==='added'? '#4caf50' : d.type==='removed'? '#f44336' : '#888';
        const prefix = d.type==='added'? '+ ' : d.type==='removed'? '- ' : '  ';
        return <div key={i} style={{color}}>{prefix}{d.line}</div>;
      })}
    </pre>
  );
}
