export default function Badge({ children, variant = 'default', size = 'md', dot = false, className = '' }) {
  const cls = [
    'badge',
    `badge-${variant}`,
    size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={cls}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
