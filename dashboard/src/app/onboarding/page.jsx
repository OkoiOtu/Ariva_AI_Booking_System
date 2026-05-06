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

/* ─── Steps ────────────────────────────────────────────────────────────────── */
const STEPS = [
  { icon: 'badge',          label: 'Identity & Brand'    },
  { icon: 'directions_car', label: 'Fleet & Services'    },
  { icon: 'gavel',          label: 'Compliance & Legal'  },
  { icon: 'payments',       label: 'Pricing & Hours'     },
  { icon: 'contact_phone',  label: 'Admin & Alerts'      },
];

const SERVICE_TYPES = [
  'Airport transfers', 'Corporate travel', 'Wedding hire', 'Day tours',
  'Event transport', 'Intercity rides', 'School runs', 'Medical / NEMT',
  'Freight & delivery', 'Luxury limousine', 'Other',
];

const VEHICLE_TYPES = [
  'Saloon / Sedan', 'SUV / 4x4', 'MPV / Minivan', 'Minibus',
  'Coach / Bus', 'Luxury / Limo', 'Electric', 'Wheelchair accessible', 'Other',
];

const TIMEZONES = [
  // Africa
  'Africa/Abidjan','Africa/Accra','Africa/Addis_Ababa','Africa/Algiers',
  'Africa/Asmara','Africa/Bamako','Africa/Bangui','Africa/Banjul',
  'Africa/Bissau','Africa/Blantyre','Africa/Brazzaville','Africa/Bujumbura',
  'Africa/Cairo','Africa/Casablanca','Africa/Ceuta','Africa/Conakry',
  'Africa/Dakar','Africa/Dar_es_Salaam','Africa/Djibouti','Africa/Douala',
  'Africa/El_Aaiun','Africa/Freetown','Africa/Gaborone','Africa/Harare',
  'Africa/Johannesburg','Africa/Juba','Africa/Kampala','Africa/Khartoum',
  'Africa/Kigali','Africa/Kinshasa','Africa/Lagos','Africa/Libreville',
  'Africa/Lome','Africa/Luanda','Africa/Lubumbashi','Africa/Lusaka',
  'Africa/Malabo','Africa/Maputo','Africa/Maseru','Africa/Mbabane',
  'Africa/Mogadishu','Africa/Monrovia','Africa/Nairobi','Africa/Ndjamena',
  'Africa/Niamey','Africa/Nouakchott','Africa/Ouagadougou','Africa/Porto-Novo',
  'Africa/Sao_Tome','Africa/Tripoli','Africa/Tunis','Africa/Windhoek',
  // Americas
  'America/Adak','America/Anchorage','America/Anguilla','America/Antigua',
  'America/Araguaina','America/Argentina/Buenos_Aires','America/Argentina/Catamarca',
  'America/Argentina/Cordoba','America/Argentina/Jujuy','America/Argentina/La_Rioja',
  'America/Argentina/Mendoza','America/Argentina/Rio_Gallegos','America/Argentina/Salta',
  'America/Argentina/San_Juan','America/Argentina/San_Luis','America/Argentina/Tucuman',
  'America/Argentina/Ushuaia','America/Aruba','America/Asuncion','America/Atikokan',
  'America/Bahia','America/Bahia_Banderas','America/Barbados','America/Belem',
  'America/Belize','America/Blanc-Sablon','America/Boa_Vista','America/Bogota',
  'America/Boise','America/Cambridge_Bay','America/Campo_Grande','America/Cancun',
  'America/Caracas','America/Cayenne','America/Cayman','America/Chicago',
  'America/Chihuahua','America/Costa_Rica','America/Creston','America/Cuiaba',
  'America/Curacao','America/Danmarkshavn','America/Dawson','America/Dawson_Creek',
  'America/Denver','America/Detroit','America/Dominica','America/Edmonton',
  'America/Eirunepe','America/El_Salvador','America/Fortaleza','America/Glace_Bay',
  'America/Godthab','America/Goose_Bay','America/Grand_Turk','America/Grenada',
  'America/Guadeloupe','America/Guatemala','America/Guayaquil','America/Guyana',
  'America/Halifax','America/Havana','America/Hermosillo','America/Indiana/Indianapolis',
  'America/Indiana/Knox','America/Indiana/Marengo','America/Indiana/Petersburg',
  'America/Indiana/Tell_City','America/Indiana/Vevay','America/Indiana/Vincennes',
  'America/Indiana/Winamac','America/Inuvik','America/Iqaluit','America/Jamaica',
  'America/Juneau','America/Kentucky/Louisville','America/Kentucky/Monticello',
  'America/Kralendijk','America/La_Paz','America/Lima','America/Los_Angeles',
  'America/Lower_Princes','America/Maceio','America/Managua','America/Manaus',
  'America/Marigot','America/Martinique','America/Matamoros','America/Mazatlan',
  'America/Menominee','America/Merida','America/Metlakatla','America/Mexico_City',
  'America/Miquelon','America/Moncton','America/Monterrey','America/Montevideo',
  'America/Montserrat','America/Nassau','America/New_York','America/Nipigon',
  'America/Nome','America/Noronha','America/North_Dakota/Beulah',
  'America/North_Dakota/Center','America/North_Dakota/New_Salem',
  'America/Ojinaga','America/Panama','America/Pangnirtung','America/Paramaribo',
  'America/Phoenix','America/Port-au-Prince','America/Port_of_Spain',
  'America/Porto_Velho','America/Puerto_Rico','America/Rainy_River',
  'America/Rankin_Inlet','America/Recife','America/Regina','America/Resolute',
  'America/Rio_Branco','America/Santa_Isabel','America/Santarem',
  'America/Santiago','America/Santo_Domingo','America/Sao_Paulo',
  'America/Scoresbysund','America/Sitka','America/St_Barthelemy',
  'America/St_Johns','America/St_Kitts','America/St_Lucia','America/St_Thomas',
  'America/St_Vincent','America/Swift_Current','America/Tegucigalpa',
  'America/Thule','America/Thunder_Bay','America/Tijuana','America/Toronto',
  'America/Tortola','America/Vancouver','America/Whitehorse','America/Winnipeg',
  'America/Yakutat','America/Yellowknife',
  // Antarctica
  'Antarctica/Casey','Antarctica/Davis','Antarctica/DumontDUrville',
  'Antarctica/Macquarie','Antarctica/Mawson','Antarctica/McMurdo',
  'Antarctica/Palmer','Antarctica/Rothera','Antarctica/Syowa',
  'Antarctica/Troll','Antarctica/Vostok',
  // Asia
  'Asia/Aden','Asia/Almaty','Asia/Amman','Asia/Anadyr','Asia/Aqtau',
  'Asia/Aqtobe','Asia/Ashgabat','Asia/Baghdad','Asia/Bahrain','Asia/Baku',
  'Asia/Bangkok','Asia/Beirut','Asia/Bishkek','Asia/Brunei','Asia/Choibalsan',
  'Asia/Chongqing','Asia/Colombo','Asia/Damascus','Asia/Dhaka','Asia/Dili',
  'Asia/Dubai','Asia/Dushanbe','Asia/Gaza','Asia/Harbin','Asia/Hebron',
  'Asia/Ho_Chi_Minh','Asia/Hong_Kong','Asia/Hovd','Asia/Irkutsk',
  'Asia/Jakarta','Asia/Jayapura','Asia/Jerusalem','Asia/Kabul','Asia/Kamchatka',
  'Asia/Karachi','Asia/Kashgar','Asia/Kathmandu','Asia/Khandyga',
  'Asia/Kolkata','Asia/Krasnoyarsk','Asia/Kuala_Lumpur','Asia/Kuching',
  'Asia/Kuwait','Asia/Macau','Asia/Magadan','Asia/Makassar','Asia/Manila',
  'Asia/Muscat','Asia/Nicosia','Asia/Novokuznetsk','Asia/Novosibirsk',
  'Asia/Omsk','Asia/Oral','Asia/Phnom_Penh','Asia/Pontianak','Asia/Pyongyang',
  'Asia/Qatar','Asia/Qyzylorda','Asia/Rangoon','Asia/Riyadh','Asia/Sakhalin',
  'Asia/Samarkand','Asia/Seoul','Asia/Shanghai','Asia/Singapore',
  'Asia/Taipei','Asia/Tashkent','Asia/Tbilisi','Asia/Tehran','Asia/Thimphu',
  'Asia/Tokyo','Asia/Ulaanbaatar','Asia/Urumqi','Asia/Ust-Nera','Asia/Vientiane',
  'Asia/Vladivostok','Asia/Yakutsk','Asia/Yekaterinburg','Asia/Yerevan',
  // Atlantic
  'Atlantic/Azores','Atlantic/Bermuda','Atlantic/Canary','Atlantic/Cape_Verde',
  'Atlantic/Faroe','Atlantic/Madeira','Atlantic/Reykjavik','Atlantic/South_Georgia',
  'Atlantic/St_Helena','Atlantic/Stanley',
  // Australia
  'Australia/Adelaide','Australia/Brisbane','Australia/Broken_Hill',
  'Australia/Currie','Australia/Darwin','Australia/Eucla','Australia/Hobart',
  'Australia/Lindeman','Australia/Lord_Howe','Australia/Melbourne',
  'Australia/Perth','Australia/Sydney',
  // Europe
  'Europe/Amsterdam','Europe/Andorra','Europe/Athens','Europe/Belgrade',
  'Europe/Berlin','Europe/Bratislava','Europe/Brussels','Europe/Bucharest',
  'Europe/Budapest','Europe/Busingen','Europe/Chisinau','Europe/Copenhagen',
  'Europe/Dublin','Europe/Gibraltar','Europe/Guernsey','Europe/Helsinki',
  'Europe/Isle_of_Man','Europe/Istanbul','Europe/Jersey','Europe/Kaliningrad',
  'Europe/Kiev','Europe/Lisbon','Europe/Ljubljana','Europe/London',
  'Europe/Luxembourg','Europe/Madrid','Europe/Malta','Europe/Mariehamn',
  'Europe/Minsk','Europe/Monaco','Europe/Moscow','Europe/Nicosia',
  'Europe/Oslo','Europe/Paris','Europe/Podgorica','Europe/Prague',
  'Europe/Riga','Europe/Rome','Europe/Samara','Europe/San_Marino',
  'Europe/Sarajevo','Europe/Simferopol','Europe/Skopje','Europe/Sofia',
  'Europe/Stockholm','Europe/Tallinn','Europe/Tirane','Europe/Uzhgorod',
  'Europe/Vaduz','Europe/Vatican','Europe/Vienna','Europe/Vilnius',
  'Europe/Volgograd','Europe/Warsaw','Europe/Zagreb','Europe/Zaporozhye',
  'Europe/Zurich',
  // Indian Ocean
  'Indian/Antananarivo','Indian/Chagos','Indian/Christmas','Indian/Cocos',
  'Indian/Comoro','Indian/Kerguelen','Indian/Mahe','Indian/Maldives',
  'Indian/Mauritius','Indian/Mayotte','Indian/Reunion',
  // Pacific
  'Pacific/Apia','Pacific/Auckland','Pacific/Chatham','Pacific/Chuuk',
  'Pacific/Easter','Pacific/Efate','Pacific/Enderbury','Pacific/Fakaofo',
  'Pacific/Fiji','Pacific/Funafuti','Pacific/Galapagos','Pacific/Gambier',
  'Pacific/Guadalcanal','Pacific/Guam','Pacific/Honolulu','Pacific/Johnston',
  'Pacific/Kiritimati','Pacific/Kosrae','Pacific/Kwajalein','Pacific/Majuro',
  'Pacific/Marquesas','Pacific/Midway','Pacific/Nauru','Pacific/Niue',
  'Pacific/Norfolk','Pacific/Noumea','Pacific/Pago_Pago','Pacific/Palau',
  'Pacific/Pitcairn','Pacific/Pohnpei','Pacific/Port_Moresby','Pacific/Rarotonga',
  'Pacific/Saipan','Pacific/Tahiti','Pacific/Tarawa','Pacific/Tongatapu',
  'Pacific/Wake','Pacific/Wallis',
  'UTC',
];

const CURRENCIES = [
  { code:'USD', label:'USD — US Dollar'         },
  { code:'GBP', label:'GBP — British Pound'     },
  { code:'EUR', label:'EUR — Euro'              },
  { code:'NGN', label:'NGN — Nigerian Naira'    },
  { code:'GHS', label:'GHS — Ghanaian Cedi'     },
  { code:'ZAR', label:'ZAR — South African Rand'},
  { code:'KES', label:'KES — Kenyan Shilling'   },
  { code:'CAD', label:'CAD — Canadian Dollar'   },
  { code:'AUD', label:'AUD — Australian Dollar' },
  { code:'AED', label:'AED — UAE Dirham'        },
  { code:'INR', label:'INR — Indian Rupee'      },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Step 1 — Identity & Brand                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
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
    setSlugChecking(true); setSlugMsg(''); setSlugOk(false);
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
    setSlugEdited(true); setSlugMsg(''); setSlugOk(false);
  }

  return (
    <>
      <p className="wizard-section-label">Legal identity</p>

      <div className="wizard-field">
        <label className="wizard-label">Legal company name <span style={{ color:'#f87171' }}>*</span></label>
        <input className={`wizard-input${errors.companyName ? ' wizard-input-err' : ''}`}
          value={data.companyName}
          onChange={e => setData(p => ({ ...p, companyName: e.target.value }))}
          placeholder="e.g. Lagos Luxury Rides Ltd" autoFocus />
        {errors.companyName && <p className="wizard-field-error">{errors.companyName}</p>}
        <p className="wizard-helper">Used on invoices and legal documents.</p>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Doing Business As (DBA) <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input"
          value={data.dbaName}
          onChange={e => setData(p => ({ ...p, dbaName: e.target.value }))}
          placeholder="Public-facing brand name if different" />
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Company slug <span style={{ color:'#f87171' }}>*</span></label>
        <input className={`wizard-input${errors.slug || (!slugOk && slugMsg) ? ' wizard-input-err' : ''}`}
          value={data.slug}
          onChange={e => handleSlug(e.target.value)}
          onBlur={() => checkSlug(data.slug)}
          placeholder="lagos-luxury-rides" />
        {errors.slug
          ? <p className="wizard-field-error">{errors.slug}</p>
          : slugChecking
            ? <p className="wizard-helper">Checking…</p>
            : slugMsg && <p className="wizard-helper" style={slugOk ? { color:'#4ade80' } : { color:'#f87171' }}>{slugMsg}</p>
        }
      </div>

      <p className="wizard-section-label">Brand</p>

      <div className="wizard-field">
        <label className="wizard-label">Logo URL <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input" type="url"
          value={data.logoUrl}
          onChange={e => setData(p => ({ ...p, logoUrl: e.target.value }))}
          placeholder="https://yourcompany.com/logo.png" />
        <p className="wizard-helper">Paste a direct link to your logo image. You can also upload a file in Settings after setup.</p>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Brand colour <span className="wizard-label-optional">(optional)</span></label>
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
        <p className="wizard-helper">Used to personalise your booking widget and customer-facing materials.</p>
      </div>

      <p className="wizard-section-label">Headquarters address</p>

      <div className="wizard-field">
        <label className="wizard-label">Address line 1 <span style={{ color:'#f87171' }}>*</span></label>
        <input className={`wizard-input${errors.addressLine1 ? ' wizard-input-err' : ''}`}
          value={data.addressLine1}
          onChange={e => setData(p => ({ ...p, addressLine1: e.target.value }))}
          placeholder="Street address or P.O. box" />
        {errors.addressLine1 && <p className="wizard-field-error">{errors.addressLine1}</p>}
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Address line 2 <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input"
          value={data.addressLine2}
          onChange={e => setData(p => ({ ...p, addressLine2: e.target.value }))}
          placeholder="Suite, floor, building, etc." />
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">City <span style={{ color:'#f87171' }}>*</span></label>
          <input className={`wizard-input${errors.city ? ' wizard-input-err' : ''}`}
            value={data.city}
            onChange={e => setData(p => ({ ...p, city: e.target.value }))}
            placeholder="Lagos" />
          {errors.city && <p className="wizard-field-error">{errors.city}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">State / Province <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input"
            value={data.state}
            onChange={e => setData(p => ({ ...p, state: e.target.value }))}
            placeholder="Lagos State" />
        </div>
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Country <span style={{ color:'#f87171' }}>*</span></label>
          <input className={`wizard-input${errors.country ? ' wizard-input-err' : ''}`}
            value={data.country}
            onChange={e => setData(p => ({ ...p, country: e.target.value }))}
            placeholder="Nigeria" />
          {errors.country && <p className="wizard-field-error">{errors.country}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Postal / ZIP code <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input"
            value={data.postalCode}
            onChange={e => setData(p => ({ ...p, postalCode: e.target.value }))}
            placeholder="100001" />
        </div>
      </div>

      <p className="wizard-section-label">Contact & online presence</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Phone <span style={{ color:'#f87171' }}>*</span></label>
          <input className={`wizard-input${errors.phone ? ' wizard-input-err' : ''}`}
            type="tel" value={data.phone}
            onChange={e => setData(p => ({ ...p, phone: e.target.value }))}
            placeholder="+234 800 000 0000" />
          {errors.phone && <p className="wizard-field-error">{errors.phone}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Website <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input" type="url"
            value={data.website}
            onChange={e => setData(p => ({ ...p, website: e.target.value }))}
            placeholder="https://yourcompany.com" />
        </div>
      </div>

      <p className="wizard-section-label">Social media <span className="wizard-label-optional" style={{ textTransform:'none', letterSpacing:0, fontSize:11 }}>(all optional)</span></p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Instagram</label>
          <input className="wizard-input"
            value={data.socialInstagram}
            onChange={e => setData(p => ({ ...p, socialInstagram: e.target.value }))}
            placeholder="@yourhandle" />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">LinkedIn</label>
          <input className="wizard-input"
            value={data.socialLinkedin}
            onChange={e => setData(p => ({ ...p, socialLinkedin: e.target.value }))}
            placeholder="linkedin.com/company/..." />
        </div>
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">X / Twitter</label>
          <input className="wizard-input"
            value={data.socialTwitter}
            onChange={e => setData(p => ({ ...p, socialTwitter: e.target.value }))}
            placeholder="@yourhandle" />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Facebook</label>
          <input className="wizard-input"
            value={data.socialFacebook}
            onChange={e => setData(p => ({ ...p, socialFacebook: e.target.value }))}
            placeholder="facebook.com/yourpage" />
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Step 2 — Fleet & Services                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Step2({ data, setData, errors }) {
  function toggleSet(key, value) {
    setData(p => {
      const set = new Set(p[key] ?? []);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...p, [key]: [...set] };
    });
  }

  const serviceOther = (data.serviceTypes ?? []).includes('Other');
  const vehicleOther = (data.vehicleTypes ?? []).includes('Other');

  return (
    <>
      <p className="wizard-section-label">Service niche</p>
      <div className="wizard-checks">
        {SERVICE_TYPES.map(s => (
          <CheckPill key={s} label={s}
            checked={(data.serviceTypes ?? []).includes(s)}
            onToggle={() => toggleSet('serviceTypes', s)} />
        ))}
      </div>
      {serviceOther && (
        <input className="wizard-input" style={{ marginTop:10 }}
          value={data.otherServiceText ?? ''}
          onChange={e => setData(p => ({ ...p, otherServiceText: e.target.value }))}
          placeholder="Describe your other service(s)…" />
      )}
      {errors.serviceTypes && <p className="wizard-field-error" style={{ marginTop:8 }}>{errors.serviceTypes}</p>}

      <p className="wizard-section-label">Vehicle types</p>
      <div className="wizard-checks">
        {VEHICLE_TYPES.map(v => (
          <CheckPill key={v} label={v}
            checked={(data.vehicleTypes ?? []).includes(v)}
            onToggle={() => toggleSet('vehicleTypes', v)} />
        ))}
      </div>
      {vehicleOther && (
        <input className="wizard-input" style={{ marginTop:10 }}
          value={data.otherVehicleText ?? ''}
          onChange={e => setData(p => ({ ...p, otherVehicleText: e.target.value }))}
          placeholder="Describe your other vehicle type(s)…" />
      )}
      {errors.vehicleTypes && <p className="wizard-field-error" style={{ marginTop:8 }}>{errors.vehicleTypes}</p>}

      <p className="wizard-section-label">Fleet size & coverage</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Total vehicles <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input" type="number" min={1}
            value={data.fleetSize}
            onChange={e => setData(p => ({ ...p, fleetSize: e.target.value }))}
            placeholder="12" />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Timezone <span style={{ color:'#f87171' }}>*</span></label>
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
        <label className="wizard-label">Operating area <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input"
          value={data.operatingArea}
          onChange={e => setData(p => ({ ...p, operatingArea: e.target.value }))}
          placeholder="e.g. Lagos Island, Victoria Island, Ikoyi" />
        <p className="wizard-helper">Cities, states, or regions where you provide service.</p>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Step 3 — Compliance & Legal                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Step3({ data, setData, errors }) {
  return (
    <>
      <div className="wizard-alert wizard-alert-info" style={{ marginBottom:24 }}>
        <span className="material-symbols-outlined" style={{ fontSize:16, verticalAlign:'middle', marginRight:6 }}>info</span>
        These fields are optional during setup but required before going live. You can complete them later in Settings.
      </div>

      <p className="wizard-section-label">Tax & registration</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Tax ID / EIN <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input"
            value={data.taxId}
            onChange={e => setData(p => ({ ...p, taxId: e.target.value }))}
            placeholder="e.g. 12-3456789" />
          <p className="wizard-helper">Required for payment processing and financial reporting.</p>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Operating authority no. <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input"
            value={data.operatingAuthority}
            onChange={e => setData(p => ({ ...p, operatingAuthority: e.target.value }))}
            placeholder="e.g. USDOT 1234567 / MC-123456" />
          <p className="wizard-helper">USDOT, MC number, or local transport licence.</p>
        </div>
      </div>

      <p className="wizard-section-label">Insurance</p>

      <div className="wizard-field">
        <label className="wizard-label">Insurance provider <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input"
          value={data.insuranceProvider}
          onChange={e => setData(p => ({ ...p, insuranceProvider: e.target.value }))}
          placeholder="e.g. AXA, Allianz, NAICOM carrier" />
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Coverage amount <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input" type="number" min={0}
            value={data.insuranceCoverage}
            onChange={e => setData(p => ({ ...p, insuranceCoverage: e.target.value }))}
            placeholder="1000000" />
          <p className="wizard-helper">Minimum liability coverage in your currency.</p>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Policy expiry date <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input" type="date"
            value={data.insuranceExpiry}
            onChange={e => setData(p => ({ ...p, insuranceExpiry: e.target.value }))} />
        </div>
      </div>

      <p className="wizard-section-label">Bank account <span className="wizard-label-optional" style={{ textTransform:'none', letterSpacing:0, fontSize:11 }}>(for payouts)</span></p>

      <div className="wizard-field">
        <label className="wizard-label">Bank name <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input"
          value={data.bankName}
          onChange={e => setData(p => ({ ...p, bankName: e.target.value }))}
          placeholder="e.g. First Bank, GTBank, Chase" />
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Account name <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input"
            value={data.bankAccountName}
            onChange={e => setData(p => ({ ...p, bankAccountName: e.target.value }))}
            placeholder="Name on account" />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Account number <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input"
            value={data.bankAccountNumber}
            onChange={e => setData(p => ({ ...p, bankAccountNumber: e.target.value }))}
            placeholder="0123456789"
            autoComplete="off" />
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Step 4 — Pricing & Hours                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Step4({ data, setData, errors }) {
  return (
    <>
      <p className="wizard-section-label">Pricing model</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Pricing structure <span style={{ color:'#f87171' }}>*</span></label>
          <select className={`wizard-select${errors.pricingModel ? ' wizard-input-err' : ''}`}
            value={data.pricingModel}
            onChange={e => setData(p => ({ ...p, pricingModel: e.target.value }))}>
            <option value="">Select model…</option>
            <option value="hourly">Per hour</option>
            <option value="per_mile">Per mile / km</option>
            <option value="flat_rate">Flat rate per route</option>
            <option value="hybrid">Hybrid (multiple models)</option>
          </select>
          {errors.pricingModel && <p className="wizard-field-error">{errors.pricingModel}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Currency <span style={{ color:'#f87171' }}>*</span></label>
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
        <label className="wizard-label">Default base rate <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input" type="number" min={0} step="0.01"
          value={data.baseRate}
          onChange={e => setData(p => ({ ...p, baseRate: e.target.value }))}
          placeholder="0.00" />
        <p className="wizard-helper">Your starting price per hour, mile, or trip. Set detailed route pricing later.</p>
      </div>

      <p className="wizard-section-label">Operating hours</p>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">24 / 7 operation</p>
          <p className="wizard-toggle-desc">Your service is available around the clock, every day.</p>
        </div>
        <Toggle on={data.is247} onToggle={() => setData(p => ({ ...p, is247: !p.is247 }))} />
      </div>

      {!data.is247 && (
        <>
          <p className="wizard-section-label">Weekday hours (Mon – Fri)</p>
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
          <p className="wizard-section-label">Weekend hours (Sat – Sun)</p>
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Step 5 — Admin & Alerts                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Step5({ data, setData, errors }) {
  return (
    <>
      <p className="wizard-section-label">Primary admin contact</p>

      <div className="wizard-field">
        <label className="wizard-label">Full name <span style={{ color:'#f87171' }}>*</span></label>
        <input className={`wizard-input${errors.contactName ? ' wizard-input-err' : ''}`}
          value={data.contactName}
          onChange={e => setData(p => ({ ...p, contactName: e.target.value }))}
          placeholder="Account owner's full name" />
        {errors.contactName && <p className="wizard-field-error">{errors.contactName}</p>}
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Direct phone <span style={{ color:'#f87171' }}>*</span></label>
          <input className={`wizard-input${errors.contactPhone ? ' wizard-input-err' : ''}`}
            type="tel" value={data.contactPhone}
            onChange={e => setData(p => ({ ...p, contactPhone: e.target.value }))}
            placeholder="+234 800 000 0000" />
          {errors.contactPhone && <p className="wizard-field-error">{errors.contactPhone}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Direct email <span style={{ color:'#f87171' }}>*</span></label>
          <input className={`wizard-input${errors.contactEmail ? ' wizard-input-err' : ''}`}
            type="email" value={data.contactEmail}
            onChange={e => setData(p => ({ ...p, contactEmail: e.target.value }))}
            placeholder="admin@yourcompany.com" />
          {errors.contactEmail && <p className="wizard-field-error">{errors.contactEmail}</p>}
        </div>
      </div>

      <p className="wizard-section-label">Team capacity</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Dispatchers planned <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input" type="number" min={0}
            value={data.numDispatchers}
            onChange={e => setData(p => ({ ...p, numDispatchers: e.target.value }))}
            placeholder="e.g. 3" />
          <p className="wizard-helper">Used for seat-based plan recommendations.</p>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Drivers planned <span className="wizard-label-optional">(optional)</span></label>
          <input className="wizard-input" type="number" min={0}
            value={data.numDrivers}
            onChange={e => setData(p => ({ ...p, numDrivers: e.target.value }))}
            placeholder="e.g. 10" />
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
          <p className="wizard-toggle-desc">Get a text message for every new confirmed booking.</p>
        </div>
        <Toggle on={data.alertSms} onToggle={() => setData(p => ({ ...p, alertSms: !p.alertSms }))} />
      </div>

      <div className="wizard-field" style={{ marginTop:16 }}>
        <label className="wizard-label">Webhook URL <span className="wizard-label-optional">(optional)</span></label>
        <input className="wizard-input" type="url"
          value={data.webhookUrl}
          onChange={e => setData(p => ({ ...p, webhookUrl: e.target.value }))}
          placeholder="https://yourapp.com/webhook/bookings" />
        <p className="wizard-helper">We'll POST new booking events here in real time.</p>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Validation                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function validateStep(step, data) {
  const errs = {};
  if (step === 0) {
    if (!data.companyName.trim()) errs.companyName  = 'Legal company name is required';
    if (!data.slug.trim())        errs.slug         = 'Slug is required';
    else if (data.slug.length < 2) errs.slug        = 'Slug must be at least 2 characters';
    if (!data.addressLine1.trim()) errs.addressLine1 = 'Address is required';
    if (!data.city.trim())        errs.city         = 'City is required';
    if (!data.country.trim())     errs.country      = 'Country is required';
    if (!data.phone.trim())       errs.phone        = 'Phone number is required';
  }
  if (step === 1) {
    if (!data.serviceTypes.length) errs.serviceTypes = 'Select at least one service type';
    if (!data.vehicleTypes.length) errs.vehicleTypes = 'Select at least one vehicle type';
    if (!data.timezone)            errs.timezone     = 'Please select your timezone';
  }
  // Step 2 (compliance) — all optional, no validation
  if (step === 3) {
    if (!data.pricingModel) errs.pricingModel = 'Select a pricing model';
    if (!data.currency)     errs.currency     = 'Select a currency';
  }
  if (step === 4) {
    if (!data.contactName.trim())        errs.contactName  = 'Contact name is required';
    if (!data.contactPhone.trim())       errs.contactPhone = 'Contact phone is required';
    if (!data.contactEmail.includes('@')) errs.contactEmail = 'Enter a valid email address';
  }
  return errs;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Initial state                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
const INITIAL = {
  // Step 1
  companyName: '', dbaName: '', slug: '', logoUrl: '', brandColor: '#7c5aed',
  addressLine1: '', addressLine2: '', city: '', state: '', country: '', postalCode: '',
  phone: '', website: '',
  socialInstagram: '', socialLinkedin: '', socialTwitter: '', socialFacebook: '',
  // Step 2
  serviceTypes: [], vehicleTypes: [], otherServiceText: '', otherVehicleText: '',
  fleetSize: '', timezone: '', operatingArea: '',
  // Step 3
  taxId: '', operatingAuthority: '', insuranceProvider: '',
  insuranceCoverage: '', insuranceExpiry: '',
  bankName: '', bankAccountName: '', bankAccountNumber: '',
  // Step 4
  pricingModel: '', currency: '', baseRate: '', is247: true,
  weekdayStart: '08:00', weekdayEnd: '20:00', weekendStart: '09:00', weekendEnd: '18:00',
  // Step 5
  contactName: '', contactPhone: '', contactEmail: '',
  numDispatchers: '', numDrivers: '',
  alertEmail: true, alertSms: true, webhookUrl: '',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Main wizard                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
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
    if (step < STEPS.length - 1) { setStep(s => s + 1); window.scrollTo(0,0); return; }
    submit();
  }

  function back() {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo(0,0);
  }

  async function submit() {
    setSubmitting(true); setGlobalError('');
    try {
      const resolveOther = (arr, text) => {
        const filtered = arr.filter(v => v !== 'Other');
        if (arr.includes('Other') && text.trim()) filtered.push(text.trim());
        return filtered;
      };

      const payload = {
        // Identity
        companyName:       data.companyName.trim(),
        slug:              data.slug.trim(),
        phone:             data.phone.trim(),
        dbaName:           data.dbaName.trim(),
        logoUrl:           data.logoUrl.trim(),
        brandColor:        data.brandColor,
        addressLine1:      data.addressLine1.trim(),
        addressLine2:      data.addressLine2.trim(),
        city:              data.city.trim(),
        state:             data.state.trim(),
        country:           data.country.trim(),
        postalCode:        data.postalCode.trim(),
        website:           data.website.trim(),
        socialInstagram:   data.socialInstagram.trim(),
        socialLinkedin:    data.socialLinkedin.trim(),
        socialTwitter:     data.socialTwitter.trim(),
        socialFacebook:    data.socialFacebook.trim(),
        // Fleet
        serviceTypes:      JSON.stringify(resolveOther(data.serviceTypes, data.otherServiceText)),
        vehicleTypes:      JSON.stringify(resolveOther(data.vehicleTypes, data.otherVehicleText)),
        fleetSize:         data.fleetSize   ? Number(data.fleetSize)   : null,
        timezone:          data.timezone,
        operatingArea:     data.operatingArea.trim(),
        // Compliance
        taxId:             data.taxId.trim(),
        operatingAuthority: data.operatingAuthority.trim(),
        insuranceProvider: data.insuranceProvider.trim(),
        insuranceCoverage: data.insuranceCoverage ? Number(data.insuranceCoverage) : null,
        insuranceExpiry:   data.insuranceExpiry,
        bankName:          data.bankName.trim(),
        bankAccountName:   data.bankAccountName.trim(),
        bankAccountNumber: data.bankAccountNumber.trim(),
        // Pricing
        pricingModel:      data.pricingModel,
        currency:          data.currency,
        baseRate:          data.baseRate ? Number(data.baseRate) : null,
        is247:             data.is247,
        weekdayStart:      data.is247 ? null : data.weekdayStart,
        weekdayEnd:        data.is247 ? null : data.weekdayEnd,
        weekendStart:      data.is247 ? null : data.weekendStart,
        weekendEnd:        data.is247 ? null : data.weekendEnd,
        // Admin
        contactName:       data.contactName.trim(),
        contactPhone:      data.contactPhone.trim(),
        contactEmail:      data.contactEmail.trim(),
        numDispatchers:    data.numDispatchers ? Number(data.numDispatchers) : null,
        numDrivers:        data.numDrivers     ? Number(data.numDrivers)     : null,
        alertEmail:        data.alertEmail,
        alertSms:          data.alertSms,
        webhookUrl:        data.webhookUrl.trim(),
      };

      const token = pb.authStore.token;
      const res   = await api('/auth/setup-company', {
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

  const TITLES = [
    'Tell us about your company',
    'Your fleet and services',
    'Compliance & legal documents',
    'Pricing and operating hours',
    'Admin contact and alerts',
  ];
  const SUBTITLES = [
    'Legal name, address, logo, and social presence — how your business is identified.',
    'What services you offer, what vehicles you run, and where you operate.',
    'Tax ID, operating authority, insurance, and bank details for payouts.',
    'Set your pricing model so the AI can quote customers accurately during calls.',
    'Who manages this account and how should we notify them of new bookings?',
  ];

  return (
    <div className="wizard-page">
      <nav className="wizard-nav">
        <Link href="/" className="wizard-nav-logo">
          <div className="wizard-nav-logo-icon">
            <span className="material-symbols-outlined">flight_takeoff</span>
          </div>
          Arrival
        </Link>
        <span className="wizard-nav-step">Step {step + 1} of {STEPS.length} — {stepDef.label}</span>
      </nav>

      <div className="wizard-body">
        <div className="wizard-wrap">
          <div className="wizard-progress">
            {STEPS.map((_, i) => (
              <div key={i} className={`wizard-progress-seg${i < step ? ' done' : i === step ? ' active' : ''}`} />
            ))}
          </div>

          <div className="wizard-header">
            <div className="wizard-step-badge">
              <span className="material-symbols-outlined">{stepDef.icon}</span>
              {stepDef.label}
            </div>
            <h1 className="wizard-title">{TITLES[step]}</h1>
            <p className="wizard-subtitle">{SUBTITLES[step]}</p>
          </div>

          {globalError && <div className="wizard-alert wizard-alert-error">{globalError}</div>}

          <div className="wizard-card">
            {step === 0 && <Step1 data={data} setData={setData} errors={errors} />}
            {step === 1 && <Step2 data={data} setData={setData} errors={errors} />}
            {step === 2 && <Step3 data={data} setData={setData} errors={errors} />}
            {step === 3 && <Step4 data={data} setData={setData} errors={errors} />}
            {step === 4 && <Step5 data={data} setData={setData} errors={errors} />}
          </div>

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
