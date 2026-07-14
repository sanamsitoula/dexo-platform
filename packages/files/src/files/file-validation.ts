import { BadRequestException } from '@nestjs/common';

/**
 * Central allow-list of MIME types + max size per documentType. Enforced at
 * upload time in files.service.ts — no document type may bypass this by
 * calling the S3 layer directly, since FilesService.uploadFile() is the only
 * path that writes to S3 and it always calls validateFile() first.
 */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
// Broader image set for the website/menu Media Library (logos/avatars stay
// restricted to IMAGE_TYPES above — this is only for general content media).
const MEDIA_IMAGE_TYPES = [...IMAGE_TYPES, 'image/webp', 'image/gif', 'image/svg+xml'];
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  ...IMAGE_TYPES,
];

const KB = 1024;
const MB = 1024 * KB;

export const FILE_RULES: Record<string, { allowedMimeTypes: string[]; maxSizeBytes: number }> = {
  LOGO: { allowedMimeTypes: IMAGE_TYPES, maxSizeBytes: 500 * KB },
  PROFILE_PIC: { allowedMimeTypes: IMAGE_TYPES, maxSizeBytes: 500 * KB },
  DOCUMENT: { allowedMimeTypes: DOCUMENT_TYPES, maxSizeBytes: 10 * MB },
  INVOICE: { allowedMimeTypes: DOCUMENT_TYPES, maxSizeBytes: 10 * MB },
  CONTRACT: { allowedMimeTypes: DOCUMENT_TYPES, maxSizeBytes: 10 * MB },
  ID_PROOF: { allowedMimeTypes: IMAGE_TYPES.concat('application/pdf'), maxSizeBytes: 5 * MB },
  MEDIA: { allowedMimeTypes: MEDIA_IMAGE_TYPES, maxSizeBytes: 5 * MB },
  OTHER: { allowedMimeTypes: DOCUMENT_TYPES, maxSizeBytes: 10 * MB },
};

export function validateFile(documentType: string, mimeType: string | undefined, sizeBytes: number): void {
  const rule = FILE_RULES[documentType] || FILE_RULES.OTHER;
  if (!mimeType || !rule.allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException(
      `File type "${mimeType || 'unknown'}" is not allowed for ${documentType}. Allowed: ${rule.allowedMimeTypes.join(', ')}`,
    );
  }
  if (sizeBytes > rule.maxSizeBytes) {
    throw new BadRequestException(
      `File is ${Math.round(sizeBytes / KB)}KB, which exceeds the ${Math.round(rule.maxSizeBytes / KB)}KB limit for ${documentType}.`,
    );
  }
}
