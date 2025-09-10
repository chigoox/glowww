import React, { useEffect, useState, useRef } from 'react';
import { Spin } from 'antd';
import { buildExpressionDependencyGraph } from '../userPropsEngine';
import { t } from '../userprops.messages';

/**
 * Simple SVG dependency graph renderer for expression nodes.
 * Props:
 *  - rootTree: user props tree
 *  - onSelectPath(path)
 */
export default function DependencyGraphViewer({ rootTree, onSelectPath }) {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoverEdge, setHoverEdge] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({x:0,y:0});
  const dragRef = useRef(null);
  const lastPos = useRef(null);
  const memoRef = useRef({ hash:null, graph:null });

  // crude hash of expression nodes
  function hashTreeExpressions(tree){
    const parts=[]; (function walk(n,p){ if(!n) return; if(n.meta && n.meta.expression) parts.push(p+'='+n.meta.expression); if(n.type==='object') Object.entries(n.children||{}).forEach(([k,c])=>walk(c,p? p+'.'+k:k)); else if(n.type==='array')(n.items||[]).forEach((c,i)=>walk(c,p? p+'.'+i:String(i))); })(tree,'');
    return parts.sort().join('|');
  }

  useEffect(()=>{
    if(!rootTree){ setGraph(null); return; }
    const h = hashTreeExpressions(rootTree);
    if (memoRef.current.hash === h && memoRef.current.graph){ setGraph(memoRef.current.graph); return; }
    setLoading(true);
    // async build
    requestIdleCallback?.(()=>{
      const g = buildExpressionDependencyGraph(rootTree);
      memoRef.current = { hash: h, graph: g };
      setGraph(g);
      setLoading(false);
    }) || setTimeout(()=>{
      const g = buildExpressionDependencyGraph(rootTree);
      memoRef.current = { hash: h, graph: g };
      setGraph(g); setLoading(false);
    },0);
  },[rootTree]);

  if (loading) return <div style={{padding:12,fontSize:12}}><Spin size="small"/> {t('userprops.graph.loading')}</div>;
  if(!graph || !graph.nodes.length) return <div style={{padding:12,fontSize:12}}>{t('userprops.graph.empty')}</div>;

  // Layout
  const levelGroups = {}; graph.nodes.forEach(n=>{ levelGroups[n.level] = levelGroups[n.level] || []; levelGroups[n.level].push(n); });
  Object.values(levelGroups).forEach(arr=> arr.sort((a,b)=> a.id.localeCompare(b.id)));
  const colWidth = 180; const rowHeight = 70; const padding = 24;
  const positions = {}; Object.entries(levelGroups).forEach(([lvl, nodes])=> {
    nodes.forEach((n,i)=> { positions[n.id] = { x: padding + colWidth * Number(lvl), y: padding + i * rowHeight }; });
  });
  const baseWidth = padding*2 + colWidth * (Math.max(...graph.nodes.map(n=>n.level)) + 1);
  const maxRows = Math.max(...Object.values(levelGroups).map(arr=>arr.length));
  const baseHeight = padding*2 + rowHeight * (maxRows);

  // Pan handlers
  const onMouseDown = (e)=> { if(e.target.getAttribute('data-node')) return; lastPos.current={x:e.clientX,y:e.clientY}; };
  const onMouseMove = (e)=> { if(!lastPos.current) return; const dx = (e.clientX - lastPos.current.x); const dy = (e.clientY - lastPos.current.y); lastPos.current={x:e.clientX,y:e.clientY}; setOffset(o=>({x:o.x+dx,y:o.y+dy})); };
  const endDrag = ()=> { lastPos.current=null; };
  const onWheel = (e)=> { e.preventDefault(); const delta = e.deltaY>0? -0.1:0.1; setScale(s=> Math.min(2, Math.max(0.4, +(s+delta).toFixed(2)))); };

  return (
    <div style={{border:'1px solid #eee', borderRadius:6, maxHeight:400, position:'relative'}}
         onWheel={onWheel}
         onMouseMove={onMouseMove}
         onMouseLeave={endDrag}
         onMouseUp={endDrag}
         onMouseDown={onMouseDown}
         aria-label="Expression dependency graph"
    >
      <div style={{position:'absolute', top:4, left:8, fontSize:10, opacity:0.7}}>{t('userprops.graph.instructions')}</div>
      <svg ref={dragRef} width={baseWidth * scale} height={baseHeight * scale} style={{minWidth:'100%', minHeight: baseHeight * scale, background:'var(--ant-color-bg-container)', cursor: lastPos.current? 'grabbing':'grab', transform:`translate(${offset.x}px,${offset.y}px)`}}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#888" />
          </marker>
        </defs>
        {graph.edges.map((e,i)=>{
          const from = positions[e.from]; const to = positions[e.to]; if(!from || !to) return null;
            const midX = (from.x + to.x)/2;
            const active = hoverEdge && hoverEdge.from===e.from && hoverEdge.to===e.to;
            return (
              <g key={i} onMouseEnter={()=>setHoverEdge(e)} onMouseLeave={()=>setHoverEdge(null)}>
                <path d={`M${(from.x+120)*scale},${(from.y+20)*scale} C${midX*scale},${(from.y+20)*scale} ${midX*scale},${(to.y+20)*scale} ${to.x*scale},${(to.y+20)*scale}`} stroke={active? '#1677ff':'#888'} fill="none" markerEnd="url(#arrow)" strokeWidth={active?2:1.3} opacity={active?1:0.85} />
              </g>
            );
        })}
        {graph.nodes.map(n=>{
          const pos = positions[n.id]; const w=120*scale; const h=40*scale; const x = pos.x*scale; const y = pos.y*scale;
          const color = n.hasError? '#fff1f0' : '#f5f5f5';
          const stroke = n.hasError? '#ff4d4f' : '#d9d9d9';
          return (
            <g key={n.id} style={{cursor:'pointer'}} data-node onClick={()=> onSelectPath && onSelectPath(n.id)}>
              <rect x={x} y={y} rx={6*scale} ry={6*scale} width={w} height={h} fill={color} stroke={stroke} strokeWidth={1.2*scale} />
              <text x={x+8*scale} y={y+22*scale} style={{fontSize:12*scale, fontFamily:'monospace'}}>{n.id.length>18? n.id.slice(0,17)+'…': n.id}</text>
            </g>
          );
        })}
      </svg>
      {graph.hasCycle && <div style={{position:'absolute', bottom:4, left:8, background:'#fff1f0', color:'#d4380d', padding:'2px 6px', borderRadius:4, fontSize:11}}>{t('userprops.graph.cycle')}</div>}
    </div>
  );
}
