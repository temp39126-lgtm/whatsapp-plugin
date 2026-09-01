'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Users } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/api';
import { getAuthHeaders } from '@/lib/auth';

interface ProfileAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  isGroup?: boolean;
  editable?: boolean;
  uploading?: boolean;
  onUpload?: (file: File) => void;
}

const sizeClasses = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

export function ProfileAvatar({
  name,
  imageUrl,
  size = 'md',
  isGroup = false,
  editable = false,
  uploading = false,
  onUpload,
}: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | undefined>();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);

    if (!imageUrl) {
      setLoadedImageUrl(undefined);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    async function loadImage() {
      try {
        const response = await fetch(resolveMediaUrl(imageUrl!), {
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (!response.ok) {
          if (!cancelled) setImageError(true);
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setLoadedImageUrl(objectUrl);
      } catch {
        if (!cancelled) setImageError(true);
      }
    }

    loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  const showImage = loadedImageUrl && !imageError;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && onUpload) onUpload(file);
    event.target.value = '';
  }

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full font-semibold text-white',
          sizeClasses[size],
          isGroup ? 'bg-emerald-700' : 'bg-whatsapp'
        )}
      >
        {showImage ? (
          <img src={loadedImageUrl} alt={name} className="h-full w-full object-cover" />
        ) : isGroup ? (
          <Users className={size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} />
        ) : (
          getInitials(name)
        )}
      </div>

      {editable && onUpload && (
        <>
          <button
            type="button"
            aria-label="Upload profile photo"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-foreground text-background shadow hover:bg-foreground/90 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
