export type SelfDestructTimer = '10s' | '1m' | '5m' | '1h' | '24h' | 'never';
export type ParticipantRole = 'owner' | 'guest';
export interface Participant {
    id: string;
    role: ParticipantRole;
    slot: 'owner' | 'guest';
    joinedAt: number;
    ecdhPublicKeyHex: string;
    isOnline: boolean;
    fingerprint: string;
}
export type RoomStatus = 'waiting' | 'active' | 'locked' | 'destroyed';
export interface RoomMetadata {
    id: string;
    createdAt: number;
    timer: SelfDestructTimer;
    status: RoomStatus;
    maxParticipants: number;
    currentParticipantCount: number;
    isLocked: boolean;
    expiresAt?: number;
}
export interface EncryptedFileMetadata {
    fileId: string;
    fileNameEncrypted: string;
    fileSize: number;
    mimeTypeEncrypted: string;
    fileKeyEncrypted: string;
    ivHex: string;
    downloadUrl: string;
}
export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
    aad: string;
    fileMetadata?: EncryptedFileMetadata;
}
export type MessageStatus = 'sent' | 'delivered' | 'read';
export interface Message {
    id: string;
    roomId: string;
    senderSlot: 'owner' | 'guest';
    encryptedData: EncryptedPayload;
    sentAt: number;
    readAt?: number;
    expiresAt?: number;
    ttlSeconds?: number;
    status: MessageStatus;
    replyToId?: string;
    reactions: Record<string, string[]>;
}
export interface JoinRequestPayload {
    roomId: string;
    ecdhPublicKeyHex: string;
    hmacSignature: string;
}
export interface JoinApprovalPayload {
    roomId: string;
    guestSocketId: string;
    wrappedRoomKeyHex: string;
    ivHex: string;
    ownerEcdhPublicKeyHex: string;
}
export interface SocketEvents {
    'room:create': (data: {
        timer: SelfDestructTimer;
    }, cb: (res: {
        roomId: string;
        ownerToken: string;
    }) => void) => void;
    'room:join-request': (data: JoinRequestPayload, cb: (res: {
        success: boolean;
        message?: string;
        guestToken?: string;
    }) => void) => void;
    'room:approve': (data: JoinApprovalPayload) => void;
    'room:reject': (data: {
        roomId: string;
        guestSocketId: string;
    }) => void;
    'room:lock': (data: {
        roomId: string;
    }) => void;
    'room:destroy': (data: {
        roomId: string;
    }) => void;
    'msg:send': (data: {
        roomId: string;
        encryptedData: EncryptedPayload;
        replyToId?: string;
        ttlSeconds?: number;
    }, cb: (res: {
        success: boolean;
        messageId?: string;
    }) => void) => void;
    'msg:delivered': (data: {
        roomId: string;
        messageId: string;
    }) => void;
    'msg:read': (data: {
        roomId: string;
        messageId: string;
    }) => void;
    'msg:edit': (data: {
        roomId: string;
        messageId: string;
        newEncryptedData: EncryptedPayload;
    }) => void;
    'msg:delete': (data: {
        roomId: string;
        messageId: string;
    }) => void;
    'msg:react': (data: {
        roomId: string;
        messageId: string;
        emoji: string;
    }) => void;
    'typing:start': (data: {
        roomId: string;
    }) => void;
    'typing:stop': (data: {
        roomId: string;
    }) => void;
    'room:join-requested': (data: {
        guestSocketId: string;
        ecdhPublicKeyHex: string;
        fingerprint: string;
    }) => void;
    'room:approved': (data: {
        wrappedRoomKeyHex: string;
        ivHex: string;
        ownerEcdhPublicKeyHex: string;
        ownerFingerprint: string;
    }) => void;
    'room:rejected': (data: {
        reason: string;
    }) => void;
    'room:status-changed': (data: {
        status: RoomStatus;
        isLocked: boolean;
    }) => void;
    'room:destroyed': () => void;
    'msg:new': (message: Message) => void;
    'msg:status-updated': (data: {
        messageId: string;
        status: MessageStatus;
        readAt?: number;
        expiresAt?: number;
    }) => void;
    'msg:edited': (data: {
        messageId: string;
        newEncryptedData: EncryptedPayload;
    }) => void;
    'msg:deleted': (data: {
        messageId: string;
    }) => void;
    'msg:reaction-updated': (data: {
        messageId: string;
        reactions: Record<string, string[]>;
    }) => void;
    'msg:expired': (data: {
        messageId: string;
    }) => void;
    'presence:update': (data: {
        participants: Participant[];
    }) => void;
    'typing:update': (data: {
        slot: 'owner' | 'guest';
        isTyping: boolean;
    }) => void;
}
