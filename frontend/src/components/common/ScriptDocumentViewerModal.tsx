'use client';

import React, { useState } from 'react';
import { resolveFileUrl } from '@/lib/api';
import {
  FileText,
  X,
  ExternalLink,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileCode,
} from 'lucide-react';

export interface ScriptDocPreviewData {
  id?: string;
  name?: string;
  fileName?: string;
  title?: string;
  fileUrl?: string;
  url?: string;
  storagePath?: string;
  fileSize?: number;
  uploadedBy?: string | { name?: string; role?: string };
  createdAt?: string | Date;
  scriptText?: string;
  hook?: string;
  notes?: string;
}

interface ScriptDocumentViewerModalProps {
  doc: ScriptDocPreviewData | null;
  onClose: () => void;
}

export function ScriptDocumentViewerModal({ doc, onClose }: ScriptDocumentViewerModalProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!doc) return null;

  const docName = doc.fileName || doc.name || doc.title || 'Script Document';
  const rawUrl = doc.fileUrl || doc.url || doc.storagePath || '';
  const resolvedUrl = resolveFileUrl(rawUrl);

  const isPdf =
    docName.toLowerCase().endsWith('.pdf') ||
    rawUrl.toLowerCase().includes('.pdf');

  const isDocx =
    docName.toLowerCase().endsWith('.doc') ||
    docName.toLowerCase().endsWith('.docx') ||
    rawUrl.toLowerCase().includes('.doc');

  const isText =
    docName.toLowerCase().endsWith('.txt') ||
    docName.toLowerCase().endsWith('.md') ||
    Boolean(doc.scriptText);

  const uploaderName =
    typeof doc.uploadedBy === 'string'
      ? doc.uploadedBy
      : doc.uploadedBy?.name || doc.uploadedBy?.role || 'Team Member';

  const handleCopyText = () => {
    const textToCopy = doc.scriptText || docName;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${
          isExpanded ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className={`p-2 rounded-xl shrink-0 ${isPdf ? 'bg-rose-100 text-rose-700' : isDocx ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                <span className="truncate">{docName}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${isPdf ? 'bg-rose-50 text-rose-700 border border-rose-200' : isDocx ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                  {isPdf ? 'PDF Script' : isDocx ? 'Word Document' : 'Script'}
                </span>
              </h3>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>By <strong className="text-slate-700">{uploaderName}</strong></span>
                {doc.fileSize && <span>• {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>}
                {doc.createdAt && <span>• {new Date(doc.createdAt).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {doc.scriptText && (
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                title="Copy Script Text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                title="Open file in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </a>
            )}

            {resolvedUrl && (
              <a
                href={resolvedUrl}
                download={docName}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              title={isExpanded ? 'Restore window size' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition ml-1"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Embedded Document Preview */}
        <div className="flex-1 bg-slate-100/70 p-3 sm:p-5 overflow-hidden flex flex-col justify-center items-center">
          {doc.scriptText ? (
            <div className="w-full h-full bg-white rounded-xl border border-slate-200 p-6 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs">
              {doc.hook && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs italic text-amber-950 font-sans">
                  <strong className="not-italic font-bold">🎣 Hook:</strong> "{doc.hook}"
                </div>
              )}
              {doc.scriptText}
              {doc.notes && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-slate-500 italic font-sans text-xs">
                  📝 Notes: {doc.notes}
                </div>
              )}
            </div>
          ) : isPdf && resolvedUrl ? (
            <div className="w-full h-full rounded-xl overflow-hidden border border-slate-300 bg-white shadow-inner flex flex-col">
              <iframe
                src={`${resolvedUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title={`PDF Viewer - ${docName}`}
              />
            </div>
          ) : isDocx && resolvedUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4 border border-blue-100">
                <FileCode className="w-12 h-12" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">{docName}</h4>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                Word documents can be viewed directly using the buttons below or downloaded to your device for editing.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={resolvedUrl}
                  download={docName}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  <Download className="w-4 h-4" /> Download Word Document
                </a>
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Google Docs Viewer
                </a>
              </div>
            </div>
          ) : resolvedUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <FileText className="w-12 h-12 text-purple-600 mb-3" />
              <h4 className="font-bold text-slate-900 text-base mb-1">{docName}</h4>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                Document is ready. Click below to download or open the file.
              </p>
              <a
                href={resolvedUrl}
                download={docName}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          ) : (
            <div className="text-center p-8 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No preview available for this document.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
