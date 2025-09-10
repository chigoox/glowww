// Basic message catalog for User Props Phase 1 (scaffolding for future i18n)
// Usage: import { t } from './userprops.messages'; t('key')

const MESSAGES = {
  'userprops.title': 'User Props Manager',
  'userprops.filter.search.placeholder': 'Search props...',
  'userprops.filter.type': 'Type',
  'userprops.filter.namespace': 'Namespace',
  'userprops.bulk.actions': 'Bulk Actions',
  'userprops.bulk.confirm.clearExpressions': 'Clear expressions for selected props?',
  'userprops.bulk.confirm.clearValidation': 'Clear validation rules for selected props?',
  'userprops.bulk.confirm.setGlobal': 'Set selected props global?',
  'userprops.bulk.confirm.unsetGlobal': 'Unset global on selected props?',
  'userprops.evaluate': 'Re-evaluate',
  'userprops.sync': 'Sync Bound',
  'userprops.undo': 'Undo',
  'userprops.redo': 'Redo',
  'userprops.virtualization.enable': 'Enable Virtualization',
  'userprops.virtualization.disable': 'Disable Virtualization',
  'userprops.expressions.errors.heading': 'Expression Errors',
  'userprops.drawer.tabs.value': 'Value',
  'userprops.drawer.tabs.expression': 'Expression',
  'userprops.drawer.tabs.validation': 'Validation',
  'userprops.drawer.tabs.watchers': 'Watchers',
  'userprops.drawer.tabs.json': 'JSON',
  'userprops.drawer.tabs.diff': 'Diff',
  'userprops.drawer.tabs.logs': 'Watcher Logs',
  'userprops.namespace.label': 'Namespace',
  'userprops.validation.presets': 'Validation Presets',
  'userprops.expression.history': 'History',
  'userprops.watcher.add': 'Add Watcher',
  'userprops.metrics.time': 'Time (ms)',
  'userprops.metrics.expressions': 'Expressions Changed',
  'userprops.metrics.watchers': 'Watchers Triggered'
  , 'userprops.graph.empty': 'No expression nodes.'
  , 'userprops.graph.cycle': 'Cycle detected in expression dependencies.'
  , 'userprops.drawer.tabs.graph': 'Graph'
  , 'userprops.graph.loading': 'Building graph...'
  , 'userprops.graph.instructions': 'Scroll to zoom, drag background to pan, click node to open.'
  , 'userprops.tab.tree': 'Tree'
  , 'userprops.tab.templates': 'Templates'
  , 'userprops.tab.telemetry': 'Telemetry'
  , 'userprops.tree.heading': 'Nested User Props Tree'
  , 'userprops.templates.search': 'Search templates'
  , 'userprops.templates.expressions': 'Expression Templates'
  , 'userprops.templates.watchers': 'Watcher Templates'
  , 'userprops.templates.apply': 'Apply'
  , 'userprops.templates.addWatcher': 'Add'
  , 'userprops.templates.applied': 'Template applied'
  , 'userprops.templates.helper': 'Select nodes (checkbox) to bulk apply or open a node detail then apply a template.'
  , 'userprops.watchers.count': 'watcher(s)'
  , 'userprops.reorder.up': 'Move Up'
  , 'userprops.reorder.down': 'Move Down'
  , 'userprops.metrics.none': 'No metrics yet'
  , 'userprops.metrics.expressions.short': 'Expr Δ'
  , 'userprops.metrics.watchers.short': 'Watchers'
  , 'userprops.bulk.setGlobal': 'Set Global'
  , 'userprops.bulk.unsetGlobal': 'Unset Global'
  , 'userprops.bulk.clearExpressions': 'Clear Expressions'
  , 'userprops.bulk.clearValidation': 'Clear Validation'
  , 'userprops.bulk.clearSelection': 'Clear Selection'
  , 'userprops.drawer.tabs.templates': 'Templates'
  , 'userprops.telemetry.pipelines': 'Pipelines'
  , 'userprops.telemetry.exprEval': 'Expr Eval'
  , 'userprops.telemetry.exprErrors': 'Expr Errors'
  , 'userprops.telemetry.watchers': 'Watchers'
  , 'userprops.telemetry.watcherErrors': 'Watcher Errors'
  , 'userprops.telemetry.totalMs': 'Total ms'
  , 'userprops.telemetry.recent': 'Recent Pipelines'
  , 'userprops.telemetry.none': 'No pipelines yet'
};

export function t(key){ return MESSAGES[key] || key; }
export { MESSAGES };
