"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactMessageSchema = exports.EditMessageSchema = exports.SendMessageSchema = exports.JoinRequestSchema = exports.CreateRoomSchema = exports.EncryptedPayloadSchema = exports.EncryptedFileMetadataSchema = exports.SelfDestructTimerSchema = void 0;
const zod_1 = require("zod");
exports.SelfDestructTimerSchema = zod_1.z.enum(['10s', '1m', '5m', '1h', '24h', 'never']);
exports.EncryptedFileMetadataSchema = zod_1.z.object({
    fileId: zod_1.z.string(),
    fileNameEncrypted: zod_1.z.string(),
    fileSize: zod_1.z.number().max(25 * 1024 * 1024), // 25MB max
    mimeTypeEncrypted: zod_1.z.string(),
    fileKeyEncrypted: zod_1.z.string(),
    ivHex: zod_1.z.string(),
    downloadUrl: zod_1.z.string().url()
});
exports.EncryptedPayloadSchema = zod_1.z.object({
    ciphertext: zod_1.z.string().min(1),
    iv: zod_1.z.string().min(1),
    aad: zod_1.z.string().min(1),
    fileMetadata: exports.EncryptedFileMetadataSchema.optional()
});
exports.CreateRoomSchema = zod_1.z.object({
    timer: exports.SelfDestructTimerSchema
});
exports.JoinRequestSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(10),
    ecdhPublicKeyHex: zod_1.z.string().min(64),
    hmacSignature: zod_1.z.string().min(32)
});
exports.SendMessageSchema = zod_1.z.object({
    roomId: zod_1.z.string(),
    encryptedData: exports.EncryptedPayloadSchema,
    replyToId: zod_1.z.string().optional(),
    ttlSeconds: zod_1.z.number().optional()
});
exports.EditMessageSchema = zod_1.z.object({
    roomId: zod_1.z.string(),
    messageId: zod_1.z.string(),
    newEncryptedData: exports.EncryptedPayloadSchema
});
exports.ReactMessageSchema = zod_1.z.object({
    roomId: zod_1.z.string(),
    messageId: zod_1.z.string(),
    emoji: zod_1.z.string().min(1).max(8)
});
