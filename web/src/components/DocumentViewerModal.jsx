import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, FileText } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

export default function DocumentViewerModal({ document, onClose }) {
  const [zoom, setZoom] = useState(1);

  if (!document) return null;

  const isPdf = document.file_type?.includes('pdf') || document.file_path?.endsWith('.pdf');
  const fileUrl = document.file_path?.startsWith('http')
    ? document.file_path
    : `${API_BASE_URL.replace('/api', '')}${document.file_path}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 capitalize text-sm">
              {document.document_type?.replace(/_/g, ' ') || 'Document Viewer'}
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-md">{document.file_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isPdf && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-500 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              download={document.file_name}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60"
              title="Open / Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={document.file_name}
              className="w-full h-[600px] rounded-lg border border-slate-300"
            />
          ) : (
            <div className="overflow-auto max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={fileUrl}
                alt={document.file_name}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[600px] max-w-full object-contain rounded-lg shadow-md transition-transform duration-200 bg-white"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden flex-col items-center justify-center p-12 text-slate-400">
                <FileText className="w-16 h-16 mb-2 text-slate-300" />
                <p className="text-sm font-semibold">Preview not available for this document file</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={document.file_name}
                  className="mt-3 text-xs text-emerald-700 hover:underline font-bold"
                >
                  Click here to download
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
