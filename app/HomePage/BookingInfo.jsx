'use client'
import React from 'react';

export function CollapsibleSectionMain({ title, children }) {
  return (
    <div>
      <h3 style={{ fontWeight: 700 }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function CollapsibleSection({ title, children }) {
  return (
    <details>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{title}</summary>
      <div style={{ marginTop: 8 }}>{children}</div>
    </details>
  );
}
