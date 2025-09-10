// Templates for expressions & watchers (Phase 2)
// Each template: { name, type: 'expression'|'watcher', code, description, params? }

const expressionTemplates = [
  {
    name: 'Sum Two Props',
    key: 'sumTwo',
    type: 'expression',
    description: 'Adds two other numeric props by path.',
    params: ['pathA','pathB'],
    build: ({ pathA='a', pathB='b' }={}) => `return (Number(get("${pathA}"))||0) + (Number(get("${pathB}"))||0)`
  },
  {
    name: 'Concatenate Strings',
    key: 'concatTwo',
    type: 'expression',
    description: 'Concatenates two string props.',
    params: ['pathA','pathB'],
    build: ({ pathA='first', pathB='second' }={}) => `return String(get("${pathA}")||'') + String(get("${pathB}")||'')`
  },
  {
    name: 'Conditional (Ternary)',
    key: 'conditional',
    type: 'expression',
    description: 'Basic ternary selection between two values based on another path truthiness.',
    params: ['conditionPath','truePath','falsePath'],
    build: ({ conditionPath='flag', truePath='valueA', falsePath='valueB' }={}) => `return get("${conditionPath}") ? get("${truePath}") : get("${falsePath}")`
  },
  {
    name: 'Length of Array',
    key: 'arrayLength',
    type: 'expression',
    description: 'Returns length of array prop or 0.',
    params: ['arrayPath'],
    build: ({ arrayPath='items' }={}) => `const v=get("${arrayPath}"); return Array.isArray(v)? v.length : 0;`
  }
];

const watcherTemplates = [
  {
    name: 'Log Change',
    key: 'logChange',
    type: 'watcher',
    description: 'Logs when the value changes.',
    code: `console.log('UserProp changed', path, 'prev=', previous, 'next=', value);`
  },
  {
    name: 'Clamp Number',
    key: 'clampNumber',
    type: 'watcher',
    description: 'Clamps numeric value into [min,max] (defaults 0..100).',
    params: ['min','max'],
    build: ({ min=0, max=100 }={}) => `if(typeof value==='number'){ if(value<${min}){ value=${min}; } if(value>${max}){ value=${max}; } }`
  },
  {
    name: 'Trigger When Equals',
    key: 'triggerEquals',
    type: 'watcher',
    description: 'Runs body only when value === target.',
    params: ['target','body'],
    build: ({ target=1, body="console.log('Reached target', value);" }={}) => `if(value===${JSON.stringify(target)}){ ${body} }`
  }
];

function listExpressionTemplates(){ return expressionTemplates.map(t=>({ ...t, code: t.code || (t.build? t.build(): '') })); }
function listWatcherTemplates(){ return watcherTemplates.map(t=>({ ...t, code: t.code || (t.build? t.build(): '') })); }
function buildExpressionTemplate(key, params){ const t=expressionTemplates.find(x=>x.key===key); if(!t) return null; return t.build? t.build(params||{}): t.code; }
function buildWatcherTemplate(key, params){ const t=watcherTemplates.find(x=>x.key===key); if(!t) return null; return t.build? t.build(params||{}): t.code; }

module.exports = {
  listExpressionTemplates,
  listWatcherTemplates,
  buildExpressionTemplate,
  buildWatcherTemplate
};
