'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CurrencyInfo { code: string; symbol: string; name: string; }

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira'      },
  { code: 'USD', symbol: '$',   name: 'US Dollar'           },
  { code: 'GBP', symbol: '£',   name: 'British Pound'       },
  { code: 'EUR', symbol: '€',   name: 'Euro'                },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi'       },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling'     },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand'  },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar'     },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar'   },
];

interface CurrencyCtx {
  currency:    string;
  setCurrency: (code: string) => void;
  currencies:  CurrencyInfo[];
  rates:       Record<string, number>;
  convert:     (ngnAmount: number) => number;
  fmt:         (ngnAmount: number) => string;
}

const STORAGE_KEY = 'ariva_admin_display_currency';
const Ctx = createContext<CurrencyCtx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState('NGN');
  const [rates,    setRates]         = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CURRENCIES.find(c => c.code === saved)) setCurrencyState(saved);

    fetch('https://open.er-api.com/v6/latest/NGN')
      .then(r => r.json())
      .then((d: any) => { if (d.rates) setRates(d.rates); })
      .catch(() => {});
  }, []);

  function setCurrency(code: string) {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  function convert(ngnAmount: number): number {
    const n = Number(ngnAmount) || 0;
    if (currency === 'NGN' || !rates[currency]) return n;
    return n * rates[currency];
  }

  function fmt(ngnAmount: number): string {
    const info      = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];
    const converted = convert(ngnAmount);
    const isNGN     = currency === 'NGN';
    return `${info.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: isNGN ? 0 : 2,
      maximumFractionDigits: isNGN ? 0 : 2,
    })}`;
  }

  return (
    <Ctx.Provider value={{ currency, setCurrency, currencies: CURRENCIES, rates, convert, fmt }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCurrency(): CurrencyCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
