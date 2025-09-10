# User Props System - Phase 1 Completion

## Scope Delivered
- Hierarchical tree data model (primitive + container nodes) with meta (expression, validation, watchers, refs, namespace, expressionError)
- Legacy flat map migration + mirror maintenance
- Expressions with dependency extraction + topological evaluation (async ready)
- Validation layer (required / min / max / pattern / custom code) + presets
- Watchers with snapshot diff trigger + timing & error logs
- Unified evaluation pipeline (expressions -> validation -> watchers) with metrics (time, counts)
- Binding to live component props (one-way) + sync traversal
- Undo / redo stacks (20 depth) + line diff viewer per path
- Virtualized tree rendering for large sets
- Namespace tagging + filtering
- Expression history (last 5 per path)
- Watcher logs tab & metrics bar
- Expression error aggregation panel
- Smart primitive setting with type inference/coercion
- Basic sandbox hardening (forbidden tokens + async timeout guard)
- i18n scaffolding (message catalog)
- Accessibility improvements groundwork (labels & roles to be expanded Phase 2)

## Safety / Sandbox
- Forbidden tokens list rejects obvious escape vectors (require, import, eval, infinite loops patterns)
- Async safeEval wrapper with configurable USER_PROPS_EXECUTION_LIMIT_MS (default 40ms)
- NOTE: Does not prevent CPU-bound infinite loops (future: Web Worker / vm2 / instrumentation)

## Testing (Initial)
Added targeted tests (timeouts, undo/redo, diff correctness, validation presets). Broader coverage planned Phase 2.

## Key Extension Points
- evaluatePipeline async: future insertion of throttling, batching, or worker offload
- meta.watchers: can add condition, debounce, or async result collection later
- meta.validation.custom: upgrade to safe DSL or sandbox function builder
- Namespace: group-level operations & graph visualization upcoming

## Known Gaps (Deferred to Phase 2)
- Graph visualization of dependencies
- Collaboration & version conflict resolution
- Schema version migrators for persisted exports
- Full i18n extraction (currently only User Props UI strings moved)
- Stronger resource sandbox (timeouts for CPU loops, memory limits)
- Telemetry & analytics (opt-in)
- Accessibility audit & automated checks

## Configuration
Set USER_PROPS_EXECUTION_LIMIT_MS env var to adjust per-script timeout.

## Maintenance Notes
- Keep forbidden token list tight; treat as deny + upcoming allowlist strategy
- When expanding expression feature set, update extractExpressionDeps accordingly
- Undo snapshot uses full tree JSON; optimize with structural sharing if memory cost grows

## Next Steps (Recommended Order)
1. Harden sandbox (worker isolation)
2. Dependency graph UI + cycle visualization
3. Expanded test coverage + coverage reporting
4. Collaboration & versioned export/import
5. i18n full extraction & accessibility audit

-- End of Phase 1 --
