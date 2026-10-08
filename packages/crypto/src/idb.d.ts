export declare function saveRoomKeyToIDB(roomId: string, rawRoomKeyHex: string): Promise<void>;
export declare function getRoomKeyFromIDB(roomId: string): Promise<string | null>;
export declare function removeRoomKeyFromIDB(roomId: string): Promise<void>;
