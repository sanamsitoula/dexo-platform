export interface MediaItem {
  id: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  uploadedAt: string;
}

export const isImage = (m: Pick<MediaItem, 'mimeType'>) => m.mimeType.startsWith('image/');
