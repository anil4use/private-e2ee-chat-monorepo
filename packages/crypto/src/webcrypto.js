"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToHex = bufferToHex;
exports.hexToBuffer = hexToBuffer;
exports.bufferToBase64 = bufferToBase64;
exports.base64ToBuffer = base64ToBuffer;
exports.generateRoomKey = generateRoomKey;
exports.exportRoomKeyRaw = exportRoomKeyRaw;
exports.importRoomKeyRaw = importRoomKeyRaw;
exports.generateECDHKeyPair = generateECDHKeyPair;
exports.exportPublicKeyHex = exportPublicKeyHex;
exports.importPublicKeyHex = importPublicKeyHex;
exports.computeLinkHmac = computeLinkHmac;
exports.deriveWrappingKey = deriveWrappingKey;
exports.wrapRoomKey = wrapRoomKey;
exports.unwrapRoomKey = unwrapRoomKey;
exports.computeSafetyCode = computeSafetyCode;
exports.encryptMessageText = encryptMessageText;
exports.decryptMessageText = decryptMessageText;
exports.encryptFileBuffer = encryptFileBuffer;
exports.decryptFileBuffer = decryptFileBuffer;
// Utility functions for binary conversions
function bufferToHex(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
function hexToBuffer(hex) {
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
}
function bufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
function getSubtleCrypto() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        return window.crypto.subtle;
    }
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
        return globalThis.crypto.subtle;
    }
    throw new Error('Web Crypto API is not supported in this environment.');
}
function getRandomValues(array) {
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto.getRandomValues(array);
    }
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
        return globalThis.crypto.getRandomValues(array);
    }
    throw new Error('Crypto getRandomValues is not supported.');
}
/**
 * Generates a random 256-bit AES-GCM Room Key
 */
async function generateRoomKey() {
    const subtle = getSubtleCrypto();
    return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, // extractable for key wrapping
    ['encrypt', 'decrypt']);
}
async function exportRoomKeyRaw(roomKey) {
    const subtle = getSubtleCrypto();
    const raw = await subtle.exportKey('raw', roomKey);
    return new Uint8Array(raw);
}
async function importRoomKeyRaw(rawKey) {
    const subtle = getSubtleCrypto();
    return subtle.importKey('raw', rawKey.buffer, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}
/**
 * Generates an ephemeral ECDH P-256 Key Pair for key exchange
 */
async function generateECDHKeyPair() {
    const subtle = getSubtleCrypto();
    return subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}
async function exportPublicKeyHex(publicKey) {
    const subtle = getSubtleCrypto();
    const spki = await subtle.exportKey('spki', publicKey);
    return bufferToHex(spki);
}
async function importPublicKeyHex(spkiHex) {
    const subtle = getSubtleCrypto();
    const buffer = hexToBuffer(spkiHex);
    return subtle.importKey('spki', buffer.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}
/**
 * Computes an HMAC-SHA256 signature of public key using link secret to authenticate join requests
 */
async function computeLinkHmac(linkSecret, publicKeyHex) {
    const subtle = getSubtleCrypto();
    const encoder = new TextEncoder();
    const secretKey = await subtle.importKey('raw', encoder.encode(linkSecret).buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await subtle.sign('HMAC', secretKey, encoder.encode(publicKeyHex).buffer);
    return bufferToHex(signature);
}
/**
 * Derives a shared wrapping key using ECDH + HKDF
 */
async function deriveWrappingKey(ownPrivateKey, peerPublicKeyHex) {
    const subtle = getSubtleCrypto();
    const peerPublicKey = await importPublicKeyHex(peerPublicKeyHex);
    // Derive shared ECDH secret bits
    const sharedBits = await subtle.deriveBits({ name: 'ECDH', public: peerPublicKey }, ownPrivateKey, 256);
    // Import shared bits into HKDF master key
    const hkdfKey = await subtle.importKey('raw', sharedBits, { name: 'HKDF' }, false, ['deriveKey']);
    // Derive AES-GCM wrapping key using HKDF
    const salt = new Uint8Array(16); // Zero salt for determinism
    const info = new TextEncoder().encode('e2ee-room-key-wrap');
    return subtle.deriveKey({
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt.buffer,
        info: info.buffer
    }, hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
/**
 * Wraps (encrypts) the AES room key using the derived wrapping key
 */
async function wrapRoomKey(roomKey, wrappingKey) {
    const subtle = getSubtleCrypto();
    const rawRoomKey = await exportRoomKeyRaw(roomKey);
    const iv = getRandomValues(new Uint8Array(12));
    const encryptedRawKey = await subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer }, wrappingKey, rawRoomKey.buffer);
    return {
        wrappedRoomKeyHex: bufferToHex(encryptedRawKey),
        ivHex: bufferToHex(iv)
    };
}
/**
 * Unwraps (decrypts) the AES room key using the derived wrapping key
 */
async function unwrapRoomKey(wrappedRoomKeyHex, ivHex, wrappingKey) {
    const subtle = getSubtleCrypto();
    const encryptedRawKey = hexToBuffer(wrappedRoomKeyHex);
    const iv = hexToBuffer(ivHex);
    const rawRoomKeyBuffer = await subtle.decrypt({ name: 'AES-GCM', iv: iv.buffer }, wrappingKey, encryptedRawKey.buffer);
    return importRoomKeyRaw(new Uint8Array(rawRoomKeyBuffer));
}
/**
 * Computes a formatted Safety Code fingerprint from both participants' public keys.
 * Example output: "4829-1054-9921"
 */
async function computeSafetyCode(pubKeyHexA, pubKeyHexB) {
    const subtle = getSubtleCrypto();
    const sorted = [pubKeyHexA, pubKeyHexB].sort().join(':');
    const encoder = new TextEncoder();
    const hashBuffer = await subtle.digest('SHA-256', encoder.encode(sorted).buffer);
    const hex = bufferToHex(hashBuffer).toUpperCase();
    // Create 3 chunks of 4 characters
    const part1 = hex.substring(0, 4);
    const part2 = hex.substring(4, 8);
    const part3 = hex.substring(8, 12);
    return `${part1}-${part2}-${part3}`;
}
/**
 * Encrypts message text with AES-256-GCM using Room Key & AAD metadata
 */
async function encryptMessageText(plainText, roomKey, aadData) {
    const subtle = getSubtleCrypto();
    const encoder = new TextEncoder();
    const iv = getRandomValues(new Uint8Array(12));
    const encodedPlainText = encoder.encode(plainText);
    const encodedAad = encoder.encode(aadData);
    const ciphertextBuffer = await subtle.encrypt({
        name: 'AES-GCM',
        iv: iv.buffer,
        additionalData: encodedAad.buffer
    }, roomKey, encodedPlainText.buffer);
    return {
        ciphertext: bufferToBase64(ciphertextBuffer),
        iv: bufferToBase64(iv),
        aad: bufferToBase64(encodedAad)
    };
}
/**
 * Decrypts AES-256-GCM encrypted message payload using Room Key
 */
async function decryptMessageText(payload, roomKey) {
    const subtle = getSubtleCrypto();
    const decoder = new TextDecoder();
    const ciphertextBuffer = base64ToBuffer(payload.ciphertext);
    const ivBuffer = base64ToBuffer(payload.iv);
    const aadBuffer = base64ToBuffer(payload.aad);
    const decryptedBuffer = await subtle.decrypt({
        name: 'AES-GCM',
        iv: ivBuffer.buffer,
        additionalData: aadBuffer.buffer
    }, roomKey, ciphertextBuffer.buffer);
    return decoder.decode(decryptedBuffer);
}
/**
 * Encrypts a file (ArrayBuffer) client-side with a unique AES-GCM file key
 */
async function encryptFileBuffer(fileBuffer) {
    const subtle = getSubtleCrypto();
    const fileKey = await generateRoomKey();
    const rawFileKey = await exportRoomKeyRaw(fileKey);
    const iv = getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer }, fileKey, fileBuffer);
    return {
        encryptedBuffer,
        ivHex: bufferToHex(iv),
        rawFileKeyHex: bufferToHex(rawFileKey)
    };
}
/**
 * Decrypts an encrypted file buffer using raw file key & IV
 */
async function decryptFileBuffer(encryptedBuffer, ivHex, rawFileKeyHex) {
    const subtle = getSubtleCrypto();
    const fileKey = await importRoomKeyRaw(hexToBuffer(rawFileKeyHex));
    const iv = hexToBuffer(ivHex);
    return subtle.decrypt({ name: 'AES-GCM', iv: iv.buffer }, fileKey, encryptedBuffer);
}
