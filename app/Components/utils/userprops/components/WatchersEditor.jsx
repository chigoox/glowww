import React, { useState } from 'react';
import { Typography, Button, Space, Input, message, Popconfirm, Dropdown } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, PlayCircleOutlined, AppstoreOutlined, StarOutlined } from '@ant-design/icons';
import * as userPropTemplates from '../userPropTemplates';

export default function WatchersEditor({ path, listWatchers, addWatcher, removeWatcher, updateWatcher }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempScript, setTempScript] = useState('');
  const [newScript, setNewScript] = useState("if(previous !== value){\n  // side-effect\n  console.log('Changed', previous, '=>', value);\n}");
  const [dryRunResult, setDryRunResult] = useState(null);
  const watcherTemplates = userPropTemplates.listWatcherTemplates();
  const [recentWatcher, setRecentWatcher] = useState(()=> (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('userprops.watch.recents')||'[]') : []));

  const watchers = listWatchers(path);

  const startEdit = (i) => { setEditingIndex(i); setTempScript(watchers[i].script); };
  const cancelEdit = () => { setEditingIndex(null); setTempScript(''); };
  const saveEdit = (i) => { updateWatcher(path, i, tempScript); setEditingIndex(null); message.success('Watcher updated'); };
  const addNew = () => {
    addWatcher(path, newScript);
    try {
      if (newScript) {
        setRecentWatcher(prev => {
          const next = [newScript, ...prev.filter(c=>c!==newScript)].slice(0,5);
          if (typeof window !== 'undefined') localStorage.setItem('userprops.watch.recents', JSON.stringify(next));
          return next;
        });
      }
    } catch {/*ignore*/}
    message.success('Watcher added');
  };
  const insertTemplate = (tpl) => {
    if (!tpl) return;
    const code = tpl.code || tpl.body || tpl.template || tpl.name;
    setNewScript(code);
  };
  const tplMenu = { items: watcherTemplates.map(tpl => ({ key: tpl.key || tpl.name, label: <span style={{display:'flex',alignItems:'center',gap:6}}><AppstoreOutlined/> {tpl.name}</span>, onClick: ()=> insertTemplate(tpl) })) };
  const recentMenu = { items: recentWatcher.map(r => ({ key:r, label: <span style={{display:'flex',alignItems:'center',gap:6}}><StarOutlined/> {r.slice(0,42)}</span>, onClick: ()=> setNewScript(r) })) };

  const dryRun = (script) => {
    try {
      const fn = new Function('value','path','root','previous', script);
      const prev = undefined; // simulate first diff
      const res = fn('demo', path, {}, prev);
      setDryRunResult(String(res));
    } catch(e){ setDryRunResult('Error: '+e.message); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <Typography.Text strong>Add Watcher</Typography.Text>
          <Space size={4}>
            <Dropdown menu={tplMenu} trigger={['click']}>
              <Button size="small" icon={<AppstoreOutlined/>}>Templates</Button>
            </Dropdown>
            {recentWatcher.length>0 && (
              <Dropdown menu={recentMenu} trigger={['click']}>
                <Button size="small" icon={<StarOutlined/>}>Recent</Button>
              </Dropdown>
            )}
          </Space>
        </div>
        <Input.TextArea rows={5} value={newScript} onChange={e=>setNewScript(e.target.value)} className="mt-1 font-mono text-xs" />
        <Space className="mt-2">
          <Button type="primary" icon={<PlusOutlined/>} onClick={addNew}>Add</Button>
          <Button icon={<PlayCircleOutlined/>} onClick={()=>dryRun(newScript)}>Dry Run</Button>
          {dryRunResult && <Typography.Text type={dryRunResult.startsWith('Error')?'danger':'secondary'}>{dryRunResult}</Typography.Text>}
        </Space>
        {recentWatcher.length>0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {recentWatcher.map((r,i)=>(<Button key={i} size="small" onClick={()=>setNewScript(r)}>{r.slice(0,28)}</Button>))}
          </div>
        )}
      </div>
      <div>
        <Typography.Text strong>Existing Watchers</Typography.Text>
        {watchers.length===0 && <Typography.Text type="secondary" className="block">None</Typography.Text>}
        <div className="mt-2 flex flex-col gap-2">
          {watchers.map((w,i)=>(
            <div key={i} className="border rounded p-2 bg-[var(--ant-color-bg-container)]">
              {editingIndex===i ? (
                <>
                  <Input.TextArea rows={5} value={tempScript} onChange={e=>setTempScript(e.target.value)} className="font-mono text-xs" />
                  <Space className="mt-2">
                    <Button type="primary" icon={<SaveOutlined/>} onClick={()=>saveEdit(i)}>Save</Button>
                    <Button onClick={cancelEdit}>Cancel</Button>
                  </Space>
                </>
              ) : (
                <>
                  <pre className="text-xs whitespace-pre-wrap font-mono max-h-40 overflow-auto">{w.script}</pre>
                  <Space className="mt-2">
                    <Button size="small" icon={<EditOutlined/>} onClick={()=>startEdit(i)}>Edit</Button>
                    <Popconfirm title="Delete watcher?" okText="Yes" onConfirm={()=>{ removeWatcher(path,i); message.info('Watcher removed'); }}>
                      <Button size="small" danger icon={<DeleteOutlined/>}>Delete</Button>
                    </Popconfirm>
                    <Button size="small" icon={<PlayCircleOutlined/>} onClick={()=>dryRun(w.script)}>Dry Run</Button>
                  </Space>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
