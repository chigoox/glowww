import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Tag, message, Dropdown, Popover } from 'antd';
import { FunctionOutlined, WarningOutlined, HistoryOutlined, ClearOutlined, AppstoreOutlined, StarOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import * as userPropTemplates from '../userPropTemplates';

export default function ExpressionEditor({ path, disabled, nodeMeta, setExpression, clearExpression, listDependencies, getExpressionHistory, onDependencyClick }) {
  const existing = nodeMeta?.meta?.expression || '';
  const allTemplates = userPropTemplates.listExpressionTemplates();
  const [recent, setRecent] = useState(()=> (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('userprops.expr.recents')||'[]') : []));
  const [code, setCode] = useState(existing);
  const history = getExpressionHistory ? getExpressionHistory(path) : [];
  const [preview, setPreview] = useState({ status: 'idle', value: null, error: null, deps: [] });

  useEffect(()=>{ setCode(existing); }, [existing, path]);

  useEffect(()=>{
    if (!code) { setPreview({ status: 'idle', value: null, error: null, deps: [] }); return; }
    const handle = setTimeout(()=>{
      try {
        const deps = listDependencies(code);
        // We don't actually evaluate here (engine will) to avoid security; simple syntax check
        new Function('get', 'path', 'root', `return (function(){ ${code.startsWith('return')? code : 'return '+code}; })();`);
        setPreview({ status: 'ok', value: null, error: null, deps });
      } catch(e){
        setPreview({ status: 'error', value: null, error: e.message, deps: [] });
      }
    }, 300);
    return ()=>clearTimeout(handle);
  }, [code, listDependencies]);

  const canApply = !disabled && code && (code !== existing) && preview.status === 'ok';

  const apply = () => {
    setExpression(path, code);
    try {
      if (code) {
        setRecent(prev => {
          const next = [code, ...prev.filter(c => c!==code)].slice(0,5);
          if (typeof window !== 'undefined') localStorage.setItem('userprops.expr.recents', JSON.stringify(next));
          return next;
        });
      }
    } catch {/* ignore */}
    message.success('Expression applied');
  };
  const insertTemplate = (tpl) => {
    if (!tpl) return;
    const snippet = tpl.example || tpl.body || tpl.code || tpl.template || tpl.name;
    setCode(snippet);
  };
  const templateMenu = {
    items: allTemplates.map(tpl => ({ key: tpl.key || tpl.name, label: <span style={{display:'flex',alignItems:'center',gap:6}}><AppstoreOutlined/> {tpl.name}</span>, onClick: ()=> insertTemplate(tpl) }))
  };
  const clear = () => { clearExpression(path); setCode(''); message.info('Expression cleared'); };

  return (
    <div className="flex flex-col gap-3">
      {disabled && <Typography.Text type="secondary">Expression disabled for this node (bound or container).</Typography.Text>}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
        <Typography.Text type="secondary" style={{fontSize:12, display:'flex', alignItems:'center', gap:4}}>Expression
          <Popover
            overlayStyle={{maxWidth:420}}
            content={<div style={{maxHeight:300, overflow:'auto'}}>
              <Typography.Paragraph style={{marginBottom:8}}><strong>Expression Basics</strong><br/>Single-line snippets auto-return their value: <code>get('aaa') + 10</code> becomes <code>12</code> if <code>aaa=2</code>. Multi-line code must explicitly <code>return</code>.</Typography.Paragraph>
              <Typography.Paragraph style={{marginBottom:8}}>
                <strong>Available helpers</strong><br/>
                <code>get(path)</code>: fetch another prop (primitive or container).<br/>
                <code>path</code>: current prop path (string).<br/>
                <code>root</code>: full tree (object).<br/>
              </Typography.Paragraph>
              <Typography.Paragraph style={{marginBottom:8}}>
                <strong>Examples</strong><br/>
                <code>get('price') * 1.2</code><br/>
                <code>get('firstName') + ' ' + get('lastName')</code><br/>
                <pre style={{background:'#111',color:'#eee',padding:8,borderRadius:4,fontSize:11,whiteSpace:'pre-wrap'}}>{`// Multi-line must return
const a = get('aaa') ?? 0;
const b = get('test') ?? 0;
return a + b + 5;`}</pre>
              </Typography.Paragraph>
              <Typography.Paragraph style={{marginBottom:8}}>
                <strong>Type rules</strong><br/>Numbers & booleans preserve type; everything else becomes a string.
              </Typography.Paragraph>
              <Typography.Paragraph style={{marginBottom:8}}>
                <strong>Errors</strong><br/>Syntax/runtime errors appear inline; fix & re-apply. Infinite loops/timeouts are auto-aborted.
              </Typography.Paragraph>
              <Typography.Paragraph style={{marginBottom:0}}>
                <strong>Limits & Safety</strong><br/>Loop step & time limits; certain tokens (fetch, process, require, eval) blocked.
              </Typography.Paragraph>
            </div>}
            title={<span>Expression Help</span>}
            trigger="click"
          >
            <QuestionCircleOutlined style={{cursor:'pointer'}} aria-label="Expression help" />
          </Popover>
        </Typography.Text>
        <Space size={4} wrap>
          <Dropdown menu={templateMenu} trigger={['click']} disabled={disabled}>
            <Button size="small" icon={<AppstoreOutlined/>} disabled={disabled}>Templates</Button>
          </Dropdown>
          {recent.length>0 && (
            <Dropdown
              trigger={['click']}
              menu={{ items: recent.map(r=>({ key:r, label:<span style={{display:'flex',alignItems:'center',gap:4}}><StarOutlined/> {r.slice(0,40)}</span>, onClick:()=>setCode(r) })) }}
            >
              <Button size="small" icon={<StarOutlined/>}>Recent</Button>
            </Dropdown>
          )}
        </Space>
      </div>
      <textarea
        disabled={disabled}
        value={code}
        onChange={e=>setCode(e.target.value)}
        rows={6}
        className="w-full rounded border p-2 font-mono text-xs"
        placeholder={`Examples:\nget('aaa') + 10\nconst a = get('aaa') ?? 0; const b = get('test') ?? 0; return a + b + 5;`}
      />
      <Space size={6} wrap>
        {preview.deps.map(d=> <Tag key={d} color="blue" style={{cursor:'pointer'}} onClick={()=> onDependencyClick && onDependencyClick(d)}>{d}</Tag>)}
      </Space>
      {preview.status === 'error' && <Typography.Text type="danger"><WarningOutlined/> {preview.error}</Typography.Text>}
      <Space>
        <Button type="primary" disabled={!canApply} onClick={apply} icon={<FunctionOutlined/>}>Apply</Button>
        <Button disabled={!existing} onClick={clear} icon={<ClearOutlined/>}>Clear</Button>
      </Space>
  {history && history.length>0 && (
        <div className="mt-2">
          <Typography.Text type="secondary"><HistoryOutlined/> Recent:</Typography.Text>
          <div className="flex flex-col gap-1 mt-1">
    {history.map((h,i)=>(<Button key={i} size="small" onClick={()=>setCode(h)}>{h.slice(0,60)}</Button>))}
          </div>
        </div>
      )}
      {recent && recent.length>0 && (
        <div className="mt-2">
          <Typography.Text type="secondary" style={{fontSize:11}}>Local Recents (persistent)</Typography.Text>
          <div className="flex flex-wrap gap-2 mt-1">
            {recent.map((r,i)=>(<Button key={i} size="small" onClick={()=>setCode(r)}>{r.slice(0,24)}</Button>))}
          </div>
        </div>
      )}
    </div>
  );
}
