import { z } from 'zod';
export declare const SelfDestructTimerSchema: z.ZodEnum<["10s", "1m", "5m", "1h", "24h", "never"]>;
export declare const EncryptedFileMetadataSchema: z.ZodObject<{
    fileId: z.ZodString;
    fileNameEncrypted: z.ZodString;
    fileSize: z.ZodNumber;
    mimeTypeEncrypted: z.ZodString;
    fileKeyEncrypted: z.ZodString;
    fileKeyIv: z.ZodString;
    fileKeyAad: z.ZodString;
    ivHex: z.ZodString;
    downloadUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fileId: string;
    fileNameEncrypted: string;
    fileSize: number;
    mimeTypeEncrypted: string;
    fileKeyEncrypted: string;
    fileKeyIv: string;
    fileKeyAad: string;
    ivHex: string;
    downloadUrl: string;
}, {
    fileId: string;
    fileNameEncrypted: string;
    fileSize: number;
    mimeTypeEncrypted: string;
    fileKeyEncrypted: string;
    fileKeyIv: string;
    fileKeyAad: string;
    ivHex: string;
    downloadUrl: string;
}>;
export declare const EncryptedPayloadSchema: z.ZodObject<{
    ciphertext: z.ZodString;
    iv: z.ZodString;
    aad: z.ZodString;
    fileMetadata: z.ZodOptional<z.ZodObject<{
        fileId: z.ZodString;
        fileNameEncrypted: z.ZodString;
        fileSize: z.ZodNumber;
        mimeTypeEncrypted: z.ZodString;
        fileKeyEncrypted: z.ZodString;
        fileKeyIv: z.ZodString;
        fileKeyAad: z.ZodString;
        ivHex: z.ZodString;
        downloadUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        fileId: string;
        fileNameEncrypted: string;
        fileSize: number;
        mimeTypeEncrypted: string;
        fileKeyEncrypted: string;
        fileKeyIv: string;
        fileKeyAad: string;
        ivHex: string;
        downloadUrl: string;
    }, {
        fileId: string;
        fileNameEncrypted: string;
        fileSize: number;
        mimeTypeEncrypted: string;
        fileKeyEncrypted: string;
        fileKeyIv: string;
        fileKeyAad: string;
        ivHex: string;
        downloadUrl: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    ciphertext: string;
    iv: string;
    aad: string;
    fileMetadata?: {
        fileId: string;
        fileNameEncrypted: string;
        fileSize: number;
        mimeTypeEncrypted: string;
        fileKeyEncrypted: string;
        fileKeyIv: string;
        fileKeyAad: string;
        ivHex: string;
        downloadUrl: string;
    } | undefined;
}, {
    ciphertext: string;
    iv: string;
    aad: string;
    fileMetadata?: {
        fileId: string;
        fileNameEncrypted: string;
        fileSize: number;
        mimeTypeEncrypted: string;
        fileKeyEncrypted: string;
        fileKeyIv: string;
        fileKeyAad: string;
        ivHex: string;
        downloadUrl: string;
    } | undefined;
}>;
export declare const CreateRoomSchema: z.ZodObject<{
    timer: z.ZodEnum<["10s", "1m", "5m", "1h", "24h", "never"]>;
}, "strip", z.ZodTypeAny, {
    timer: "10s" | "1m" | "5m" | "1h" | "24h" | "never";
}, {
    timer: "10s" | "1m" | "5m" | "1h" | "24h" | "never";
}>;
export declare const JoinRequestSchema: z.ZodObject<{
    roomId: z.ZodString;
    ecdhPublicKeyHex: z.ZodString;
    hmacSignature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    ecdhPublicKeyHex: string;
    hmacSignature: string;
}, {
    roomId: string;
    ecdhPublicKeyHex: string;
    hmacSignature: string;
}>;
export declare const SendMessageSchema: z.ZodObject<{
    roomId: z.ZodString;
    encryptedData: z.ZodObject<{
        ciphertext: z.ZodString;
        iv: z.ZodString;
        aad: z.ZodString;
        fileMetadata: z.ZodOptional<z.ZodObject<{
            fileId: z.ZodString;
            fileNameEncrypted: z.ZodString;
            fileSize: z.ZodNumber;
            mimeTypeEncrypted: z.ZodString;
            fileKeyEncrypted: z.ZodString;
            fileKeyIv: z.ZodString;
            fileKeyAad: z.ZodString;
            ivHex: z.ZodString;
            downloadUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        }, {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    }, {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    }>;
    replyToId: z.ZodOptional<z.ZodString>;
    ttlSeconds: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    encryptedData: {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    };
    replyToId?: string | undefined;
    ttlSeconds?: number | undefined;
}, {
    roomId: string;
    encryptedData: {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    };
    replyToId?: string | undefined;
    ttlSeconds?: number | undefined;
}>;
export declare const EditMessageSchema: z.ZodObject<{
    roomId: z.ZodString;
    messageId: z.ZodString;
    newEncryptedData: z.ZodObject<{
        ciphertext: z.ZodString;
        iv: z.ZodString;
        aad: z.ZodString;
        fileMetadata: z.ZodOptional<z.ZodObject<{
            fileId: z.ZodString;
            fileNameEncrypted: z.ZodString;
            fileSize: z.ZodNumber;
            mimeTypeEncrypted: z.ZodString;
            fileKeyEncrypted: z.ZodString;
            fileKeyIv: z.ZodString;
            fileKeyAad: z.ZodString;
            ivHex: z.ZodString;
            downloadUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        }, {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    }, {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    messageId: string;
    newEncryptedData: {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    };
}, {
    roomId: string;
    messageId: string;
    newEncryptedData: {
        ciphertext: string;
        iv: string;
        aad: string;
        fileMetadata?: {
            fileId: string;
            fileNameEncrypted: string;
            fileSize: number;
            mimeTypeEncrypted: string;
            fileKeyEncrypted: string;
            fileKeyIv: string;
            fileKeyAad: string;
            ivHex: string;
            downloadUrl: string;
        } | undefined;
    };
}>;
export declare const ReactMessageSchema: z.ZodObject<{
    roomId: z.ZodString;
    messageId: z.ZodString;
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    messageId: string;
    emoji: string;
}, {
    roomId: string;
    messageId: string;
    emoji: string;
}>;
