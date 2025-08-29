export function Button({ href, children, color = '#111111' }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        background: color,
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 600,
        padding: '12px 20px',
        borderRadius: 6,
        textDecoration: 'none',
        lineHeight: '14px'
      }}
    >
      {children}
    </a>
  );
}
