"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FILE_SIZE_BYTES = exports.TYPING_TIMEOUT_MS = exports.HEARTBEAT_INTERVAL_MS = exports.UNUSED_ROOM_EXPIRY_MS = exports.MAX_ROOM_CAPACITY = exports.TIMER_SECONDS_MAP = void 0;
exports.TIMER_SECONDS_MAP = {
    '10s': 10,
    '1m': 60,
    '5m': 300,
    '1h': 3600,
    '24h': 86400,
    'never': null
};
exports.MAX_ROOM_CAPACITY = 2;
exports.UNUSED_ROOM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
exports.HEARTBEAT_INTERVAL_MS = 15000;
exports.TYPING_TIMEOUT_MS = 3000;
exports.MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
