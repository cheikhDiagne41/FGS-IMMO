import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const TYPES = [
  { key: 'encaissements', label: 'Encaissements', icon: '💰' },
  { key: 'comptabilite', label: 'Comptabilité', icon: '📊' },
  { key: 'paiements', label: 'Paiements', icon: '💳' },
  { key: 'factures', label: 'Factures', icon: '🧾' },
  { key: 'retards', label: 'Retards', icon: '⏰' },
  { key: 'ventes', label: 'Ventes', icon: '🏡' },
  { key: 'clients', label: 'Clients', icon: '👥' },
  { key: 'cooperatives', label: 'Coopératives', icon: '🏘️' },
  { key: 'sites', label: 'Sites', icon: '🗺️' },
];

interface Colonne {
  key: string;
  label: string;
  align?: string;
  format?: string;
}
interface ReportData {
  titre: string;
  colonnes: Colonne[];
  lignes: Record<string, any>[];
  resume?: { label: string; value: string }[];
}

const fmt = (col: Colonne, v: any) => {
  if (v === null || v === undefined) return '—';
  if (col.format === 'money')
    return new Intl.NumberFormat('fr-FR').format(Math.round(Number(v))) + ' FCFA';
  if (col.format === 'date') return new Date(v).toLocaleDateString('fr-FR');
  return String(v);
};

async function exporter(
  type: string,
  format: 'pdf' | 'excel',
  from: string,
  to: string,
) {
  const params = new URLSearchParams({ format });
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const res = await api.get(`/rapports/${type}/export?${params}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FGS_${type}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Rapports() {
  const [type, setType] = useState('encaissements');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['rapport', type, from, to],
    queryFn: async () =>
      (await api.get(`/rapports/${type}?${params}`)).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rapports</h1>
        <p className="text-sm text-slate-500">
          Générez et exportez vos rapports en PDF ou Excel
        </p>
      </div>

      {/* Sélecteur de type */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              type === t.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtres + export */}
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Du</label>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Au</label>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => exporter(type, 'pdf', from, to)}
          className="btn-primary"
        >
          📄 Export PDF
        </button>
        <button
          onClick={() => exporter(type, 'excel', from, to)}
          className="btn-ghost"
        >
          📊 Export Excel
        </button>
      </div>

      {/* Résumé */}
      {data?.resume && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.resume.map((r) => (
            <div key={r.label} className="card">
              <div className="text-xs uppercase text-slate-400">{r.label}</div>
              <div className="text-lg font-bold text-brand-700">{r.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Aperçu du tableau */}
      <div className="card overflow-x-auto p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Chargement…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                {data?.colonnes.map((c) => (
                  <th
                    key={c.key}
                    className={`p-3 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.lignes.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  {data.colonnes.map((c) => (
                    <td
                      key={c.key}
                      className={`p-3 ${
                        c.align === 'right'
                          ? 'text-right font-medium'
                          : 'text-slate-600'
                      }`}
                    >
                      {fmt(c, row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.lignes.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            Aucune donnée pour cette période.
          </div>
        )}
        {data && data.lignes.length > 100 && (
          <div className="border-t border-slate-100 p-3 text-center text-xs text-slate-400">
            Aperçu limité à 100 lignes — l'export contient tout ({data.lignes.length} lignes).
          </div>
        )}
      </div>
    </div>
  );
}
