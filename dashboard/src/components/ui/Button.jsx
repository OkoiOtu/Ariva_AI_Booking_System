'use client';
import { useRef } from 'react';

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  outline:   'btn-outline',
  danger:    'btn-danger',
};

const SIZES = {
  sm:  'btn-sm',
  md:  'btn-md',
  lg:  'btn-lg',
  xl:  'btn-xl',
};

function addRipple(e, ref) {
  const btn  = ref.current;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const r    = document.createElement('span');
  r.className = 'ripple';
  r.style.left = `${e.clientX - rect.left}px`;
  r.style.top  = `${e.clientY - rect.top}px`;
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  icon,
  iconRight,
  loading  = false,
  disabled = false,
  fullWidth = false,
  ripple   = true,
  className = '',
  onClick,
  href,
  target,
  ...props
}) {
  const ref = useRef(null);

  const cls = [
    'btn',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size]       ?? SIZES.md,
    fullWidth ? 'btn-full' : '',
    loading   ? 'btn-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  function handleClick(e) {
    if (ripple && !disabled && !loading) addRipple(e, ref);
    if (onClick) onClick(e);
  }

  if (href) {
    return (
      <a ref={ref} href={href} target={target} className={cls} onClick={handleClick} {...props}>
        {icon && <span className="btn-icon">{icon}</span>}
        {children}
        {iconRight && <span className="btn-icon-right">{iconRight}</span>}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      className={cls}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3"/>
            <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
      )}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
      {!loading && iconRight && <span className="btn-icon-right">{iconRight}</span>}
    </button>
  );
}
