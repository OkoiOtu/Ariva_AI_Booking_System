'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import pb from '@/lib/pb';
import '@/styles/wizard.css';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function Toggle({ on, onToggle }) {
  return (
    <button type="button" className={`wizard-toggle${on ? ' on' : ''}`} onClick={onToggle}>
      <span className="wizard-toggle-thumb" />
    </button>
  );
}

function CheckPill({ label, checked, onToggle }) {
  return (
    <div className={`wizard-check${checked ? ' checked' : ''}`} onClick={onToggle}>
      <span className="wizard-check-box">
        <span className="material-symbols-outlined">check</span>
      </span>
      <span className="wizard-check-label">{label}</span>
    </div>
  );
}

/* ─── Steps metadata ───────────────────────────────────────────────────────── */
const STEPS = [
  { icon: 'badge',          label: 'Identity & Brand' },
  { icon: 'directions_car', label: 'Fleet & Services' },
  { icon: 'payments',       label: 'Pricing & Hours'  },
  { icon: 'contact_phone',  label: 'Contact & Alerts' },
];

const SERVICE_TYPES = [
  'Airport transfers', 'Corporate travel', 'Wedding hire',
  'Day tours', 'Event transport', 'Intercity rides',
  'School runs', 'Medical transport', 'Other',
];

const VEHICLE_TYPES = [
  'Saloon', 'SUV / 4x4', 'MPV', 'Minibus',
  'Coach', 'Luxury / Limo', 'Electric', 'Other',
];

const TIMEZONES = [
  // Africa
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers',
  'Africa/Asmara', 'Africa/Bamako', 'Africa/Bangui', 'Africa/Banjul',
  'Africa/Bissau', 'Africa/Blantyre', 'Africa/Brazzaville', 'Africa/Bujumbura',
  'Africa/Cairo', 'Africa/Casablanca', 'Africa/Ceuta', 'Africa/Conakry',
  'Africa/Dakar', 'Africa/Dar_es_Salaam', 'Africa/Djibouti', 'Africa/Douala',
  'Africa/El_Aaiun', 'Africa/Freetown', 'Africa/Gaborone', 'Africa/Harare',
  'Africa/Johannesburg', 'Africa/Juba', 'Africa/Kampala', 'Africa/Khartoum',
  'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Lagos', 'Africa/Libreville',
  'Africa/Lome', 'Africa/Luanda', 'Africa/Lubumbashi', 'Africa/Lusaka',
  'Africa/Malabo', 'Africa/Maputo', 'Africa/Maseru', 'Africa/Mbabane',
  'Africa/Mogadishu', 'Africa/Monrovia', 'Africa/Nairobi', 'Africa/Ndjamena',
  'Africa/Niamey', 'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Porto-Novo',
  'Africa/Sao_Tome', 'Africa/Tripoli', 'Africa/Tunis', 'Africa/Windhoek',
  // Americas
  'America/Adak', 'America/Anchorage', 'America/Anguilla', 'America/Antigua',
  'America/Araguaina', 'America/Argentina/Buenos_Aires', 'America/Argentina/Catamarca',
  'America/Argentina/Cordoba', 'America/Argentina/Jujuy', 'America/Argentina/La_Rioja',
  'America/Argentina/Mendoza', 'America/Argentina/Rio_Gallegos', 'America/Argentina/Salta',
  'America/Argentina/San_Juan', 'America/Argentina/San_Luis', 'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia', 'America/Aruba', 'America/Asuncion', 'America/Atikokan',
  'America/Bahia', 'America/Bahia_Banderas', 'America/Barbados', 'America/Belem',
  'America/Belize', 'America/Blanc-Sablon', 'America/Boa_Vista', 'America/Bogota',
  'America/Boise', 'America/Cambridge_Bay', 'America/Campo_Grande', 'America/Cancun',
  'America/Caracas', 'America/Cayenne', 'America/Cayman', 'America/Chicago',
  'America/Chihuahua', 'America/Costa_Rica', 'America/Creston', 'America/Cuiaba',
  'America/Curacao', 'America/Danmarkshavn', 'America/Dawson', 'America/Dawson_Creek',
  'America/Denver', 'America/Detroit', 'America/Dominica', 'America/Edmonton',
  'America/Eirunepe', 'America/El_Salvador', 'America/Fortaleza', 'America/Glace_Bay',
  'America/Godthab', 'America/Goose_Bay', 'America/Grand_Turk', 'America/Grenada',
  'America/Guadeloupe', 'America/Guatemala', 'America/Guayaquil', 'America/Guyana',
  'America/Halifax', 'America/Havana', 'America/Hermosillo', 'America/Indiana/Indianapolis',
  'America/Indiana/Knox', 'America/Indiana/Marengo', 'America/Indiana/Petersburg',
  'America/Indiana/Tell_City', 'America/Indiana/Vevay', 'America/Indiana/Vincennes',
  'America/Indiana/Winamac', 'America/Inuvik', 'America/Iqaluit', 'America/Jamaica',
  'America/Juneau', 'America/Kentucky/Louisville', 'America/Kentucky/Monticello',
  'America/Kralendijk', 'America/La_Paz', 'America/Lima', 'America/Los_Angeles',
  'America/Lower_Princes', 'America/Maceio', 'America/Managua', 'America/Manaus',
  'America/Marigot', 'America/Martinique', 'America/Matamoros', 'America/Mazatlan',
  'America/Menominee', 'America/Merida', 'America/Metlakatla', 'America/Mexico_City',
  'America/Miquelon', 'America/Moncton', 'America/Monterrey', 'America/Montevideo',
  'America/Montserrat', 'America/Nassau', 'America/New_York', 'America/Nipigon',
  'America/Nome', 'America/Noronha', 'America/North_Dakota/Beulah',
  'America/North_Dakota/Center', 'America/North_Dakota/New_Salem',
  'America/Ojinaga', 'America/Panama', 'America/Pangnirtung', 'America/Paramaribo',
  'America/Phoenix', 'America/Port-au-Prince', 'America/Port_of_Spain',
  'America/Porto_Velho', 'America/Puerto_Rico', 'America/Rainy_River',
  'America/Rankin_Inlet', 'America/Recife', 'America/Regina', 'America/Resolute',
  'America/Rio_Branco', 'America/Santa_Isabel', 'America/Santarem',
  'America/Santiago', 'America/Santo_Domingo', 'America/Sao_Paulo',
  'America/Scoresbysund', 'America/Sitka', 'America/St_Barthelemy',
  'America/St_Johns', 'America/St_Kitts', 'America/St_Lucia', 'America/St_Thomas',
  'America/St_Vincent', 'America/Swift_Current', 'America/Tegucigalpa',
  'America/Thule', 'America/Thunder_Bay', 'America/Tijuana', 'America/Toronto',
  'America/Tortola', 'America/Vancouver', 'America/Whitehorse', 'America/Winnipeg',
  'America/Yakutat', 'America/Yellowknife',
  // Antarctica
  'Antarctica/Casey', 'Antarctica/Davis', 'Antarctica/DumontDUrville',
  'Antarctica/Macquarie', 'Antarctica/Mawson', 'Antarctica/McMurdo',
  'Antarctica/Palmer', 'Antarctica/Rothera', 'Antarctica/Syowa',
  'Antarctica/Troll', 'Antarctica/Vostok',
  // Asia
  'Asia/Aden', 'Asia/Almaty', 'Asia/Amman', 'Asia/Anadyr', 'Asia/Aqtau',
  'Asia/Aqtobe', 'Asia/Ashgabat', 'Asia/Baghdad', 'Asia/Bahrain', 'Asia/Baku',
  'Asia/Bangkok', 'Asia/Beirut', 'Asia/Bishkek', 'Asia/Brunei', 'Asia/Choibalsan',
  'Asia/Chongqing', 'Asia/Colombo', 'Asia/Damascus', 'Asia/Dhaka', 'Asia/Dili',
  'Asia/Dubai', 'Asia/Dushanbe', 'Asia/Gaza', 'Asia/Harbin', 'Asia/Hebron',
  'Asia/Ho_Chi_Minh', 'Asia/Hong_Kong', 'Asia/Hovd', 'Asia/Irkutsk',
  'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Jerusalem', 'Asia/Kabul', 'Asia/Kamchatka',
  'Asia/Karachi', 'Asia/Kashgar', 'Asia/Kathmandu', 'Asia/Khandyga',
  'Asia/Kolkata', 'Asia/Krasnoyarsk', 'Asia/Kuala_Lumpur', 'Asia/Kuching',
  'Asia/Kuwait', 'Asia/Macau', 'Asia/Magadan', 'Asia/Makassar', 'Asia/Manila',
  'Asia/Muscat', 'Asia/Nicosia', 'Asia/Novokuznetsk', 'Asia/Novosibirsk',
  'Asia/Omsk', 'Asia/Oral', 'Asia/Phnom_Penh', 'Asia/Pontianak', 'Asia/Pyongyang',
  'Asia/Qatar', 'Asia/Qyzylorda', 'Asia/Rangoon', 'Asia/Riyadh', 'Asia/Sakhalin',
  'Asia/Samarkand', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Taipei', 'Asia/Tashkent', 'Asia/Tbilisi', 'Asia/Tehran', 'Asia/Thimphu',
  'Asia/Tokyo', 'Asia/Ulaanbaatar', 'Asia/Urumqi', 'Asia/Ust-Nera', 'Asia/Vientiane',
  'Asia/Vladivostok', 'Asia/Yakutsk', 'Asia/Yekaterinburg', 'Asia/Yerevan',
  // Atlantic
  'Atlantic/Azores', 'Atlantic/Bermuda', 'Atlantic/Canary', 'Atlantic/Cape_Verde',
  'Atlantic/Faroe', 'Atlantic/Madeira', 'Atlantic/Reykjavik', 'Atlantic/South_Georgia',
  'Atlantic/St_Helena', 'Atlantic/Stanley',
  // Australia
  'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Broken_Hill',
  'Australia/Currie', 'Australia/Darwin', 'Australia/Eucla', 'Australia/Hobart',
  'Australia/Lindeman', 'Australia/Lord_Howe', 'Australia/Melbourne',
  'Australia/Perth', 'Australia/Sydney',
  // Europe
  'Europe/Amsterdam', 'Europe/Andorra', 'Europe/Athens', 'Europe/Belgrade',
  'Europe/Berlin', 'Europe/Bratislava', 'Europe/Brussels', 'Europe/Bucharest',
  'Europe/Budapest', 'Europe/Busingen', 'Europe/Chisinau', 'Europe/Copenhagen',
  'Europe/Dublin', 'Europe/Gibraltar', 'Europe/Guernsey', 'Europe/Helsinki',
  'Europe/Isle_of_Man', 'Europe/Istanbul', 'Europe/Jersey', 'Europe/Kaliningrad',
  'Europe/Kiev', 'Europe/Lisbon', 'Europe/Ljubljana', 'Europe/London',
  'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta', 'Europe/Mariehamn',
  'Europe/Minsk', 'Europe/Monaco', 'Europe/Moscow', 'Europe/Nicosia',
  'Europe/Oslo', 'Europe/Paris', 'Europe/Podgorica', 'Europe/Prague',
  'Europe/Riga', 'Europe/Rome', 'Europe/Samara', 'Europe/San_Marino',
  'Europe/Sarajevo', 'Europe/Simferopol', 'Europe/Skopje', 'Europe/Sofia',
  'Europe/Stockholm', 'Europe/Tallinn', 'Europe/Tirane', 'Europe/Uzhgorod',
  'Europe/Vaduz', 'Europe/Vatican', 'Europe/Vienna', 'Europe/Vilnius',
  'Europe/Volgograd', 'Europe/Warsaw', 'Europe/Zagreb', 'Europe/Zaporozhye',
  'Europe/Zurich',
  // Indian Ocean
  'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos',
  'Indian/Comoro', 'Indian/Kerguelen', 'Indian/Mahe', 'Indian/Maldives',
  'Indian/Mauritius', 'Indian/Mayotte', 'Indian/Reunion',
  // Pacific
  'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Chatham', 'Pacific/Chuuk',
  'Pacific/Easter', 'Pacific/Efate', 'Pacific/Enderbury', 'Pacific/Fakaofo',
  'Pacific/Fiji', 'Pacific/Funafuti', 'Pacific/Galapagos', 'Pacific/Gambier',
  'Pacific/Guadalcanal', 'Pacific/Guam', 'Pacific/Honolulu', 'Pacific/Johnston',
  'Pacific/Kiritimati', 'Pacific/Kosrae', 'Pacific/Kwajalein', 'Pacific/Majuro',
  'Pacific/Marquesas', 'Pacific/Midway', 'Pacific/Nauru', 'Pacific/Niue',
  'Pacific/Norfolk', 'Pacific/Noumea', 'Pacific/Pago_Pago', 'Pacific/Palau',
  'Pacific/Pitcairn', 'Pacific/Pohnpei', 'Pacific/Port_Moresby', 'Pacific/Rarotonga',
  'Pacific/Saipan', 'Pacific/Tahiti', 'Pacific/Tarawa', 'Pacific/Tongatapu',
  'Pacific/Wake', 'Pacific/Wallis',
  // UTC
  'UTC',
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
];

/* ─── Step 1: Identity & Brand ─────────────────────────────────────────────── */
function Step1({ data, setData, errors }) {
  const [slugEdited,   setSlugEdited]   = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugMsg,      setSlugMsg]      = useState('');
  const [slugOk,       setSlugOk]       = useState(false);

  useEffect(() => {
    if (!slugEdited && data.companyName) {
      setData(p => ({ ...p, slug: slugify(data.companyName) }));
    }
  }, [data.companyName, slugEdited]);

  async function checkSlug(v) {
    const s = v.trim();
    if (!s || s.length < 2) return;
    setSlugChecking(true);
    setSlugMsg(''); setSlugOk(false);
    try {
      const res  = await api(`/auth/check-slug?slug=${encodeURIComponent(s)}`);
      const json = await res.json();
      if (json.exists) { setSlugMsg('This slug is already taken.'); setSlugOk(false); }
      else             { setSlugMsg(`arrival.ai/${s}`); setSlugOk(true); }
    } catch { setSlugMsg(''); }
    finally  { setSlugChecking(false); }
  }

  function handleSlug(v) {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setData(p => ({ ...p, slug: clean }));
    setSlugEdited(true);
    setSlugMsg(''); setSlugOk(false);
  }

  return (
    <>
      <p className="wizard-section-label">Company identity</p>

      <div className="wizard-field">
        <label className="wizard-label">Company name <span style={{ color:'var(--red)' }}>*</span></label>
        <input className={`wizard-input${errors.companyName ? ' wizard-input-err' : ''}`}
          value={data.companyName}
          onChange={e => setData(p => ({ ...p, companyName: e.target.value }))}
          placeholder="Lagos Luxury Rides" autoFocus />
        {errors.companyName && <p className="wizard-field-error">{errors.companyName}</p>}
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Trading name <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input"
          value={data.dbaName}
          onChange={e => setData(p => ({ ...p, dbaName: e.target.value }))}
          placeholder="If different from company name" />
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Company slug <span style={{ color:'var(--red)' }}>*</span></label>
        <input className={`wizard-input${errors.slug || (!slugOk && slugMsg) ? ' wizard-input-err' : ''}`}
          value={data.slug}
          onChange={e => handleSlug(e.target.value)}
          onBlur={() => checkSlug(data.slug)}
          placeholder="lagos-luxury-rides" />
        {errors.slug
          ? <p className="wizard-field-error">{errors.slug}</p>
          : slugChecking
            ? <p className="wizard-helper">Checking…</p>
            : slugMsg && <p className={`wizard-helper${slugOk ? '' : ' wizard-field-error'}`}
                style={slugOk ? { color:'#4ade80' } : undefined}>{slugMsg}</p>
        }
      </div>

      <p className="wizard-section-label">Location & contact</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">City <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.city ? ' wizard-input-err' : ''}`}
            value={data.city}
            onChange={e => setData(p => ({ ...p, city: e.target.value }))}
            placeholder="Lagos" />
          {errors.city && <p className="wizard-field-error">{errors.city}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Phone <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.phone ? ' wizard-input-err' : ''}`}
            type="tel" value={data.phone}
            onChange={e => setData(p => ({ ...p, phone: e.target.value }))}
            placeholder="+234 800 000 0000" />
          {errors.phone && <p className="wizard-field-error">{errors.phone}</p>}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Website <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input"
          type="url" value={data.website}
          onChange={e => setData(p => ({ ...p, website: e.target.value }))}
          placeholder="https://yourcompany.com" />
      </div>

      <p className="wizard-section-label">Brand</p>

      <div className="wizard-field">
        <label className="wizard-label">
          Brand colour <span className="wizard-label-optional">(optional)</span>
        </label>
        <div className="wizard-color-row">
          <input type="color" className="wizard-color-input"
            value={data.brandColor}
            onChange={e => setData(p => ({ ...p, brandColor: e.target.value }))} />
          <div className="wizard-color-text">
            <input className="wizard-input"
              value={data.brandColor}
              onChange={e => setData(p => ({ ...p, brandColor: e.target.value }))}
              placeholder="#7c5aed" maxLength={7} />
          </div>
        </div>
        <p className="wizard-helper">Used to personalise your dashboard and customer communications.</p>
      </div>
    </>
  );
}

/* ─── Step 2: Fleet & Services ─────────────────────────────────────────────── */
function Step2({ data, setData, errors }) {
  function toggleSet(key, value) {
    setData(p => {
      const set = new Set(p[key] ?? []);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...p, [key]: [...set] };
    });
  }

  const serviceOther  = (data.serviceTypes ?? []).includes('Other');
  const vehicleOther  = (data.vehicleTypes ?? []).includes('Other');

  return (
    <>
      <p className="wizard-section-label">Services you offer</p>
      <div className="wizard-checks">
        {SERVICE_TYPES.map(s => (
          <CheckPill key={s} label={s}
            checked={(data.serviceTypes ?? []).includes(s)}
            onToggle={() => toggleSet('serviceTypes', s)} />
        ))}
      </div>
      {serviceOther && (
        <input className="wizard-input" style={{ marginTop: 10 }}
          value={data.otherServiceText ?? ''}
          onChange={e => setData(p => ({ ...p, otherServiceText: e.target.value }))}
          placeholder="Describe your other service(s)…" />
      )}
      {errors.serviceTypes && <p className="wizard-field-error" style={{ marginTop:8 }}>{errors.serviceTypes}</p>}

      <p className="wizard-section-label">Vehicle types in your fleet</p>
      <div className="wizard-checks">
        {VEHICLE_TYPES.map(v => (
          <CheckPill key={v} label={v}
            checked={(data.vehicleTypes ?? []).includes(v)}
            onToggle={() => toggleSet('vehicleTypes', v)} />
        ))}
      </div>
      {vehicleOther && (
        <input className="wizard-input" style={{ marginTop: 10 }}
          value={data.otherVehicleText ?? ''}
          onChange={e => setData(p => ({ ...p, otherVehicleText: e.target.value }))}
          placeholder="Describe your other vehicle type(s)…" />
      )}
      {errors.vehicleTypes && <p className="wizard-field-error" style={{ marginTop:8 }}>{errors.vehicleTypes}</p>}

      <p className="wizard-section-label">Fleet size & coverage</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">
            Number of vehicles <span className="wizard-label-optional">(optional)</span>
          </label>
          <input className="wizard-input" type="number" min={1} max={9999}
            value={data.fleetSize}
            onChange={e => setData(p => ({ ...p, fleetSize: e.target.value }))}
            placeholder="12" />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">
            Timezone <span style={{ color:'var(--red)' }}>*</span>
          </label>
          <select className={`wizard-select${errors.timezone ? ' wizard-input-err' : ''}`}
            value={data.timezone}
            onChange={e => setData(p => ({ ...p, timezone: e.target.value }))}>
            <option value="">Select timezone…</option>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          {errors.timezone && <p className="wizard-field-error">{errors.timezone}</p>}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Operating area <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input"
          value={data.operatingArea}
          onChange={e => setData(p => ({ ...p, operatingArea: e.target.value }))}
          placeholder="e.g. Lagos Island, Victoria Island, Ikoyi" />
        <p className="wizard-helper">Describe the areas or cities you cover.</p>
      </div>
    </>
  );
}

/* ─── Step 3: Pricing & Hours ──────────────────────────────────────────────── */
function Step3({ data, setData, errors }) {
  return (
    <>
      <p className="wizard-section-label">Pricing model</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Pricing model <span style={{ color:'var(--red)' }}>*</span></label>
          <select className={`wizard-select${errors.pricingModel ? ' wizard-input-err' : ''}`}
            value={data.pricingModel}
            onChange={e => setData(p => ({ ...p, pricingModel: e.target.value }))}>
            <option value="">Select model…</option>
            <option value="hourly">Hourly rate</option>
            <option value="fixed">Fixed per route</option>
            <option value="hybrid">Hybrid (both)</option>
          </select>
          {errors.pricingModel && <p className="wizard-field-error">{errors.pricingModel}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Currency <span style={{ color:'var(--red)' }}>*</span></label>
          <select className={`wizard-select${errors.currency ? ' wizard-input-err' : ''}`}
            value={data.currency}
            onChange={e => setData(p => ({ ...p, currency: e.target.value }))}>
            <option value="">Select currency…</option>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {errors.currency && <p className="wizard-field-error">{errors.currency}</p>}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Base rate <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input" type="number" min={0}
          value={data.baseRate}
          onChange={e => setData(p => ({ ...p, baseRate: e.target.value }))}
          placeholder="0.00" />
        <p className="wizard-helper">
          Your starting price per hour or per trip. You can set detailed route prices later in Pricing.
        </p>
      </div>

      <p className="wizard-section-label">Operating hours</p>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">24 / 7 operation</p>
          <p className="wizard-toggle-desc">Your service is available around the clock.</p>
        </div>
        <Toggle on={data.is247} onToggle={() => setData(p => ({ ...p, is247: !p.is247 }))} />
      </div>

      {!data.is247 && (
        <>
          <p className="wizard-section-label">Weekday hours</p>
          <div className="wizard-row">
            <div className="wizard-field">
              <label className="wizard-label">Open</label>
              <input className="wizard-input" type="time"
                value={data.weekdayStart}
                onChange={e => setData(p => ({ ...p, weekdayStart: e.target.value }))} />
            </div>
            <div className="wizard-field">
              <label className="wizard-label">Close</label>
              <input className="wizard-input" type="time"
                value={data.weekdayEnd}
                onChange={e => setData(p => ({ ...p, weekdayEnd: e.target.value }))} />
            </div>
          </div>

          <p className="wizard-section-label">Weekend hours</p>
          <div className="wizard-row">
            <div className="wizard-field">
              <label className="wizard-label">Open</label>
              <input className="wizard-input" type="time"
                value={data.weekendStart}
                onChange={e => setData(p => ({ ...p, weekendStart: e.target.value }))} />
            </div>
            <div className="wizard-field">
              <label className="wizard-label">Close</label>
              <input className="wizard-input" type="time"
                value={data.weekendEnd}
                onChange={e => setData(p => ({ ...p, weekendEnd: e.target.value }))} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ─── Step 4: Contact & Alerts ─────────────────────────────────────────────── */
function Step4({ data, setData, errors }) {
  return (
    <>
      <p className="wizard-section-label">Primary contact</p>

      <div className="wizard-field">
        <label className="wizard-label">Contact name <span style={{ color:'var(--red)' }}>*</span></label>
        <input className={`wizard-input${errors.contactName ? ' wizard-input-err' : ''}`}
          value={data.contactName}
          onChange={e => setData(p => ({ ...p, contactName: e.target.value }))}
          placeholder="Your name" />
        {errors.contactName && <p className="wizard-field-error">{errors.contactName}</p>}
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Contact phone <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.contactPhone ? ' wizard-input-err' : ''}`}
            type="tel" value={data.contactPhone}
            onChange={e => setData(p => ({ ...p, contactPhone: e.target.value }))}
            placeholder="+234 800 000 0000" />
          {errors.contactPhone && <p className="wizard-field-error">{errors.contactPhone}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Contact email <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.contactEmail ? ' wizard-input-err' : ''}`}
            type="email" value={data.contactEmail}
            onChange={e => setData(p => ({ ...p, contactEmail: e.target.value }))}
            placeholder="you@company.com" />
          {errors.contactEmail && <p className="wizard-field-error">{errors.contactEmail}</p>}
        </div>
      </div>

      <p className="wizard-section-label">Booking alerts</p>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">Email alerts</p>
          <p className="wizard-toggle-desc">Get an email for every new booking and lead.</p>
        </div>
        <Toggle on={data.alertEmail} onToggle={() => setData(p => ({ ...p, alertEmail: !p.alertEmail }))} />
      </div>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">SMS alerts</p>
          <p className="wizard-toggle-desc">Get a text message for every new booking.</p>
        </div>
        <Toggle on={data.alertSms} onToggle={() => setData(p => ({ ...p, alertSms: !p.alertSms }))} />
      </div>
    </>
  );
}

/* ─── Main wizard ───────────────────────────────────────────────────────────── */
const INITIAL = {
  // Step 1
  companyName: '', dbaName: '', slug: '', city: '', phone: '', website: '', brandColor: '#7c5aed',
  // Step 2
  serviceTypes: [], vehicleTypes: [], otherServiceText: '', otherVehicleText: '',
  fleetSize: '', timezone: '', operatingArea: '',
  // Step 3
  pricingModel: '', currency: '', baseRate: '', is247: true,
  weekdayStart: '08:00', weekdayEnd: '20:00', weekendStart: '09:00', weekendEnd: '18:00',
  // Step 4
  contactName: '', contactPhone: '', contactEmail: '', alertEmail: true, alertSms: true,
};

function validateStep(step, data) {
  const errs = {};
  if (step === 0) {
    if (!data.companyName.trim()) errs.companyName = 'Company name is required';
    if (!data.slug.trim())        errs.slug        = 'Slug is required';
    else if (data.slug.length < 2) errs.slug       = 'Slug must be at least 2 characters';
    if (!data.city.trim())        errs.city        = 'City is required';
    if (!data.phone.trim())       errs.phone       = 'Phone number is required';
  }
  if (step === 1) {
    if (!data.serviceTypes.length) errs.serviceTypes = 'Select at least one service type';
    if (!data.vehicleTypes.length) errs.vehicleTypes = 'Select at least one vehicle type';
    if (!data.timezone)            errs.timezone     = 'Please select your timezone';
  }
  if (step === 2) {
    if (!data.pricingModel) errs.pricingModel = 'Select a pricing model';
    if (!data.currency)     errs.currency     = 'Select a currency';
  }
  if (step === 3) {
    if (!data.contactName.trim())  errs.contactName  = 'Contact name is required';
    if (!data.contactPhone.trim()) errs.contactPhone = 'Contact phone is required';
    if (!data.contactEmail.includes('@')) errs.contactEmail = 'Enter a valid email';
  }
  return errs;
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step,        setStep]        = useState(0);
  const [data,        setData]        = useState(INITIAL);
  const [errors,      setErrors]      = useState({});
  const [globalError, setGlobalError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.company_id) { router.replace('/dashboard'); }
  }, [user, loading, router]);

  function next() {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    submit();
  }

  function back() {
    setErrors({});
    setStep(s => s - 1);
  }

  async function submit() {
    setSubmitting(true); setGlobalError('');
    try {
      const token = pb.authStore.token;
      // Resolve "Other" entries to the custom text the user typed
      const resolveOther = (arr, customText) => {
        const filtered = arr.filter(v => v !== 'Other');
        if (arr.includes('Other') && customText.trim()) filtered.push(customText.trim());
        return filtered;
      };
      const finalServices = resolveOther(data.serviceTypes, data.otherServiceText);
      const finalVehicles = resolveOther(data.vehicleTypes, data.otherVehicleText);

      const payload = {
        companyName:   data.companyName.trim(),
        slug:          data.slug.trim(),
        city:          data.city.trim(),
        phone:         data.phone.trim(),
        dbaName:       data.dbaName.trim(),
        website:       data.website.trim(),
        brandColor:    data.brandColor,
        serviceTypes:  JSON.stringify(finalServices),
        vehicleTypes:  JSON.stringify(finalVehicles),
        fleetSize:     data.fleetSize ? Number(data.fleetSize) : null,
        timezone:      data.timezone,
        operatingArea: data.operatingArea.trim(),
        pricingModel:  data.pricingModel,
        currency:      data.currency,
        baseRate:      data.baseRate ? Number(data.baseRate) : null,
        is247:         data.is247,
        weekdayStart:  data.is247 ? null : data.weekdayStart,
        weekdayEnd:    data.is247 ? null : data.weekdayEnd,
        weekendStart:  data.is247 ? null : data.weekendStart,
        weekendEnd:    data.is247 ? null : data.weekendEnd,
        contactName:   data.contactName.trim(),
        contactPhone:  data.contactPhone.trim(),
        contactEmail:  data.contactEmail.trim(),
        alertEmail:    data.alertEmail,
        alertSms:      data.alertSms,
      };

      const res = await api('/auth/setup-company', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Company setup failed.');

      try { await pb.collection('users').authRefresh(); } catch {}
      router.replace('/dashboard');
    } catch (err) {
      setGlobalError(err.message);
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  const stepDef = STEPS[step];

  return (
    <div className="wizard-page">
      <nav className="wizard-nav">
        <Link href="/" className="wizard-nav-logo">
          <div className="wizard-nav-logo-icon">
            <span className="material-symbols-outlined">flight_takeoff</span>
          </div>
          Arrival
        </Link>
        <span className="wizard-nav-step">
          Step {step + 1} of {STEPS.length} — {stepDef.label}
        </span>
      </nav>

      <div className="wizard-body">
        <div className="wizard-wrap">
          {/* Progress */}
          <div className="wizard-progress">
            {STEPS.map((_, i) => (
              <div key={i} className={`wizard-progress-seg${i < step ? ' done' : i === step ? ' active' : ''}`} />
            ))}
          </div>

          {/* Header */}
          <div className="wizard-header">
            <div className="wizard-step-badge">
              <span className="material-symbols-outlined">{stepDef.icon}</span>
              {stepDef.label}
            </div>
            <h1 className="wizard-title">
              {step === 0 && 'Tell us about your company'}
              {step === 1 && 'Your fleet and services'}
              {step === 2 && 'Pricing and operating hours'}
              {step === 3 && 'Contact details and alerts'}
            </h1>
            <p className="wizard-subtitle">
              {step === 0 && 'This information is used to personalise your dashboard and set up your AI agent.'}
              {step === 1 && 'Help your AI agent understand what services you offer and what vehicles are available.'}
              {step === 2 && 'Set your pricing model so the AI can quote customers accurately during calls.'}
              {step === 3 && 'Who should we notify when new bookings and leads come in?'}
            </p>
          </div>

          {globalError && <div className="wizard-alert wizard-alert-error">{globalError}</div>}

          {/* Step content */}
          <div className="wizard-card">
            {step === 0 && <Step1 data={data} setData={setData} errors={errors} />}
            {step === 1 && <Step2 data={data} setData={setData} errors={errors} />}
            {step === 2 && <Step3 data={data} setData={setData} errors={errors} />}
            {step === 3 && <Step4 data={data} setData={setData} errors={errors} />}
          </div>

          {/* Footer */}
          <div className="wizard-footer">
            <div>
              {step > 0 && (
                <button className="wizard-btn-back" onClick={back}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </button>
              )}
            </div>
            <button className="wizard-btn-next" onClick={next} disabled={submitting}>
              {submitting
                ? <><span className="wizard-spinner" /> Setting up…</>
                : step === STEPS.length - 1
                  ? <>Launch my dashboard <span className="material-symbols-outlined">rocket_launch</span></>
                  : <>Next <span className="material-symbols-outlined">arrow_forward</span></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
