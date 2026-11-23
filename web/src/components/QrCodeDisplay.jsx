import React from 'react';
import { Download, Printer, QrCode, ShieldCheck } from 'lucide-react';

export default function QrCodeDisplay({ peddlerCode, peddlerName, businessNature, qrToken, isActive = true }) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrToken || peddlerCode)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Arkabala QR Pass - ${peddlerCode}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; margin: 0; }
            .card { border: 3px double #064e3b; border-radius: 16px; padding: 30px; max-width: 360px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            h2 { color: #064e3b; margin: 0; font-size: 20px; }
            p { color: #64748b; margin: 4px 0 16px; font-size: 12px; }
            .qr { width: 220px; height: 220px; margin: 0 auto; }
            .id { font-size: 18px; font-weight: bold; color: #064e3b; margin-top: 14px; }
            .name { font-size: 14px; font-weight: bold; color: #334155; margin-top: 2px; }
            .biz { font-size: 12px; color: #64748b; margin-top: 4px; }
            .footer { font-size: 10px; color: #059669; margin-top: 20px; border-top: 1px dashed #a7f3d0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>CITY OF LA CARLOTA</h2>
            <p>Official Arkabala Weekly Collection QR Pass</p>
            <img src="${qrImageUrl}" class="qr" />
            <div class="id">${peddlerCode}</div>
            <div class="name">${peddlerName}</div>
            <div class="biz">${businessNature}</div>
            <div class="footer">Scan weekly using e-Peddlers Inspector Mobile App</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `Arkabala_QR_${peddlerCode}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-emerald-700" />
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Official Arkabala QR Pass</h3>
      </div>

      <div className="relative p-4 bg-white rounded-2xl shadow-inner border-2 border-emerald-500/30 inline-block mb-3">
        <img src={qrImageUrl} alt="Peddler QR Code" className="w-52 h-52 rounded-xl" />
        {!isActive && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs rounded-xl flex items-center justify-center p-4">
            <span className="text-xs font-bold text-white bg-rose-600 px-3 py-1.5 rounded-lg shadow">
              PENDING PERMIT RELEASE
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-extrabold text-emerald-950 font-serif">{peddlerCode}</h4>
        <p className="text-sm font-bold text-slate-800 mt-0.5">{peddlerName}</p>
        <p className="text-xs text-slate-500 mt-0.5">{businessNature}</p>
      </div>

      <div className="flex items-center gap-2 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Pass</span>
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Validated securely through backend API token verification</span>
      </div>
    </div>
  );
}
