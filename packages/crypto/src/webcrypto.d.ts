import { EncryptedPayload } from '@e2ee-chat/shared';
export declare function bufferToHex(buffer: ArrayBuffer | Uint8Array): string;
export declare function hexToBuffer(hex: string): Uint8Array;
export declare function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string;
export declare function base64ToBuffer(base64: string): Uint8Array;
/**
 * Generates a random 256-bit AES-GCM Room Key
 */
export declare function generateRoomKey(): Promise<CryptoKey>;
export declare function exportRoomKeyRaw(roomKey: CryptoKey): Promise<Uint8Array>;
export declare function importRoomKeyRaw(rawKey: Uint8Array): Promise<CryptoKey>;
/**
 * Generates an ephemeral ECDH P-256 Key Pair for key exchange
 */
export declare function generateECDHKeyPair(): Promise<CryptoKeyPair>;
export declare function exportPublicKeyHex(publicKey: CryptoKey): Promise<string>;
export declare function importPublicKeyHex(spkiHex: string): Promise<CryptoKey>;
/**
 * Computes an HMAC-SHA256 signature of public key using link secret to authenticate join requests
 */
export declare function computeLinkHmac(linkSecret: string, publicKeyHex: string): Promise<string>;
/**
 * Derives a shared wrapping key using ECDH + HKDF
 */
export declare function deriveWrappingKey(ownPrivateKey: CryptoKey, peerPublicKeyHex: string): Promise<CryptoKey>;
/**
 * Wraps (encrypts) the AES room key using the derived wrapping key
 */
export declare function wrapRoomKey(roomKey: CryptoKey, wrappingKey: CryptoKey): Promise<{
    wrappedRoomKeyHex: string;
    ivHex: string;
}>;
/**
 * Unwraps (decrypts) the AES room key using the derived wrapping key
 */
export declare function unwrapRoomKey(wrappedRoomKeyHex: string, ivHex: string, wrappingKey: CryptoKey): Promise<CryptoKey>;
/**
 * Computes a formatted Safety Code fingerprint from both participants' public keys.
 * Example output: "4829-1054-9921"
 */
export declare function computeSafetyCode(pubKeyHexA: string, pubKeyHexB: string): Promise<string>;
/**
 * Encrypts message text with AES-256-GCM using Room Key & AAD metadata
 */
export declare function encryptMessageText(plainText: string, roomKey: CryptoKey, aadData: string): Promise<EncryptedPayload>;
/**
 * Decrypts AES-256-GCM encrypted message payload using Room Key
 */
export declare function decryptMessageText(payload: EncryptedPayload, roomKey: CryptoKey): Promise<string>;
/**
 * Encrypts a file (ArrayBuffer) client-side with a unique AES-GCM file key
 */
export declare function encryptFileBuffer(fileBuffer: ArrayBuffer): Promise<{
    encryptedBuffer: ArrayBuffer;
    ivHex: string;
    rawFileKeyHex: string;
}>;
/**
 * Decrypts an encrypted file buffer using raw file key & IV
 */
export declare function decryptFileBuffer(encryptedBuffer: ArrayBuffer, ivHex: string, rawFileKeyHex: string): Promise<ArrayBuffer>;
