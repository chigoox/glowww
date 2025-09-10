# User Props Expression Dependency Graph

Provides a visual map of expression-based user prop dependencies.

## Data Model
- nodes: expression paths having `meta.expression`.
- edges: path A -> path B if B's expression calls `get('A')`.
- level: topological layer (distance from sources). Cycles get last layer.
- hasError: true if `meta.expressionError` is present.

## Rendering
`DependencyGraphViewer` performs a simple column layout by level and cubic Bezier edges.

## Cycles
If a cycle is detected (topological sort incomplete), evaluation order falls back to partial topo + appended remaining nodes. The UI shows a cycle warning banner.

## Extending
- Replace layout with force-directed or hierarchical library when scale increases.
- Add click-to-focus integration with tree (already prepared via `onSelectPath`).
- Add edge highlighting on hover.

## Performance
Current implementation recomputes graph only when the tree object identity changes in the detail drawer. For large graphs, memoize by a hash of expression nodes.

