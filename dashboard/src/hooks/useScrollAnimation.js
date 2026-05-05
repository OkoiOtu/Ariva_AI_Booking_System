'use client';
import { useEffect, useRef } from 'react';

export function useScrollAnimation(options = {}) {
  const ref = useRef(null);
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px', once = true } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add('anim-ready');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('anim-visible');
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('anim-visible');
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

export function useScrollAnimationAll(selector = '.anim-item', options = {}) {
  const containerRef = useRef(null);
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px', once = true } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(selector);
    items.forEach(el => el.classList.add('anim-ready'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('anim-visible');
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('anim-visible');
          }
        });
      },
      { threshold, rootMargin }
    );

    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [selector, threshold, rootMargin, once]);

  return containerRef;
}
