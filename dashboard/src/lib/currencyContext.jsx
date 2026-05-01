'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export const CURRENCIES = [
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

const STORAGE_KEY = 'ariva_display_currency';
const Ctx = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('NGN');
  const [rates,    setRates]         = useState({}); // from NGN base

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CURRENCIES.find(c => c.code === saved)) setCurrencyState(saved);

    fetch('https://open.er-api.com/v6/latest/NGN')
      .then(r => r.json())
      .then(d => { if (d.rates) setRates(d.rates); })
      .catch(() => {});
  }, []);

  function setCurrency(code) {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  // Convert an NGN amount to the selected display currency
  function convert(ngnAmount) {
    const n = Number(ngnAmount) || 0;
    if (currency === 'NGN' || !rates[currency]) return n;
    return n * rates[currency];
  }

  // Format an NGN amount in the selected display currency
  function fmt(ngnAmount) {
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

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
