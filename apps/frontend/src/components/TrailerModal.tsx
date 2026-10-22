'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  youtubeId?: string | null;
  embedUrl?: string | null;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  isOpen,
  onClose,
  title,
  youtubeId,
  embedUrl,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const url =
    embedUrl ||
    (youtubeId
      ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0`
      : null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900 border-b border-gray-800 text-white">
          <h3 className="font-bold text-base line-clamp-1">Trailer - {title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black">
          {url ? (
            <iframe
              src={url}
              title={`Trailer: ${title}`}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <p className="text-sm font-semibold">Chưa có video trailer chính thức cho bộ phim này.</p>
              <p className="text-xs text-gray-500 mt-1">Vui lòng quay lại sau!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
