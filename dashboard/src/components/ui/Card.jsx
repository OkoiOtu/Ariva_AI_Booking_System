export default function Card({ children, variant = 'default', hover = false, padding = 'md', className = '', ...props }) {
  const cls = [
    'card',
    `card-${variant}`,
    hover ? 'card-hover' : '',
    `card-pad-${padding}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
