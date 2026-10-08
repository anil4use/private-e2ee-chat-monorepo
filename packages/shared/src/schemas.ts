import { z } from 'zod';

export const SelfDestructTimerSchema = z.enum(['10s', '1m', '5m', '1h', '24h', 'never']);

export const EncryptedFileMetadataSchema = z.object({
  fileId: z.string(),
  fileNameEncrypted: z.string(),
  fileSize: z.number().max(25 * 1024 * 1024), // 25MB max
  mimeTypeEncrypted: z.string(),
  fileKeyEncrypted: z.string().min(1),
  fileKeyIv: z.string().min(1),
  fileKeyAad: z.string().min(1),
  ivHex: z.string().min(1),
  downloadUrl: z.string().url()
});

export const EncryptedPayloadSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  aad: z.string().min(1),
  fileMetadata: EncryptedFileMetadataSchema.optional()
});

export const CreateRoomSchema = z.object({
  timer: SelfDestructTimerSchema
});

export const JoinRequestSchema = z.object({
  roomId: z.string().min(10),
  ecdhPublicKeyHex: z.string().min(64),
  hmacSignature: z.string().min(32)
});

export const SendMessageSchema = z.object({
  roomId: z.string(),
  encryptedData: EncryptedPayloadSchema,
  replyToId: z.string().optional(),
  ttlSeconds: z.number().optional()
});

export const EditMessageSchema = z.object({
  roomId: z.string(),
  messageId: z.string(),
  newEncryptedData: EncryptedPayloadSchema
});

export const ReactMessageSchema = z.object({
  roomId: z.string(),
  messageId: z.string(),
  emoji: z.string().min(1).max(8)
});
