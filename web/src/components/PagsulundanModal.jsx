import React, { useState } from 'react';
import { X, ScrollText, CheckCircle2 } from 'lucide-react';

const PAGSULUNDAN_RULES = [
  'Pagsunod sa oras sang Pagbaligya (3:00 a.m. to 3:00 p.m.)',
  'Pagsunod sang sakto nga Papag suno sa Takos (3 x 6 ft.)',
  'Pag gamit sang sakto nga Papag suno sa gin Bayaran mo.',
  'Pag Baligya sang Insakto nga Pruducto ukon Serbisyo suno sa gin Gawad mo nga Permit.',
  'Indi puide nga ipahulam O ihatag O Pa Arkilahan ang imo puwesto.',
  'Pag mintinar sang katinlo sa lugar Okun puwesto.',
  'Pag butang sa (2) ka klase nga basurahan (Madunot kag Indi Madunot)',
  'Regular nga bulantihan ukon baligyaan ang Imo puwesto kada sabado.',
  '(3) ka sunod-sunod nga Sabado nga indi mo ma Baligyaan ang imo puwesto gina tagaan mo sang diretso ang management sang Merkado Publiko sa pag bawi sang imo puwesto.',
  'May kahigayunan ikaw sa pag Presentar sang imo balido nga rason sa tag dumalahan sa sulod sang (1) ka Semana.',
  'Indi puide ang Pag panigarilyo, Pag panahor, Pag Inom sang Makahulubog nga ilimnon, Pag uba Panapton kag Pag Luto sa imo puwesto.',
  'Pagabutangan mo sang PRICE TAG ang mga Pruducto nga gina baligya mo.',
  'Sa Papag gid lamang puide ka Baligya Indi sa dalan kag indi puide ilibud ang baligya O Pruducto.',
  'Maga sunod ikaw sa Regulasyon kag Polisiya sang AGORA PUBLIC MARKET KAG SYUDAD.',
  'Pag Bayad sang Insakto nga Kantidad sa Arkabala O Cash Ticket.',
  'Indi puide mag hatag sang Suhol O Regalo sa Empleyado sang Merkado Publiko. (puide gid marebokar ang imo Permit sa pagbaligya.)',
  'NO USE OF SINGLE – USE PLASTIC (City Ordinance No. 2022 - 006)',
];

export default function PagsulundanModal({ isOpen, onClose, onAgree, agreedInitially = false }) {
  const [agreed, setAgreed] = useState(agreedInitially);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (agreed && onAgree) {
      onAgree(true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <ScrollText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">PAGSULUNDAN SANG MERKADO PUBLIKO</h2>
              <p className="text-xs text-emerald-200">
                City of La Carlota • Mga Polisiya kag Pagsulundan para sa mga Bulantero
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed max-h-[58vh]">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs font-semibold">
            Ang Tag dumala sang Merkado Publiko naga paihibalo sa tanan nga Bulantero sang mga PAGSULUNDAN:
          </div>

          <ol className="space-y-2.5 text-xs text-slate-800 font-medium list-none">
            {PAGSULUNDAN_RULES.map((rule, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-emerald-50/40 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed flex-1">{rule}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer Checkbox & Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none text-xs font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Nabasa ko kag nagapasugot ako sa tanan nga mga Pagsulundan sa ibabaw.</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!agreed}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold rounded-xl text-white transition-all inline-flex items-center justify-center gap-1.5 ${
                agreed
                  ? 'bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-800/20 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Agree &amp; Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
