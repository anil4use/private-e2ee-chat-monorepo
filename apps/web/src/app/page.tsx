'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';
import { generateRoomKey, exportRoomKeyRaw, bufferToHex, saveRoomKeyToIDB } from '@e2ee-chat/crypto';
import { SelfDestructTimer } from '@e2ee-chat/shared';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (timer: SelfDestructTimer) => {
    try {
      setIsCreating(true);

      // 1. Call Realtime REST API to create room record
      const res = await fetch('http://localhost:4000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timer })
      });
      const data = await res.json();

      if (!data.roomId || !data.ownerToken) {
        alert('Failed to create room on server');
        setIsCreating(false);
        return;
      }

      const roomId = data.roomId;
      const ownerToken = data.ownerToken;

      // 2. Generate random 128-bit link secret (never sent to server!)
      const linkSecretBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const linkSecret = bufferToHex(linkSecretBytes);

      // 3. Generate AES-256-GCM Room Key on client
      const roomKey = await generateRoomKey();
      const rawRoomKey = await exportRoomKeyRaw(roomKey);
      const rawRoomKeyHex = bufferToHex(rawRoomKey);

      // 4. Save Room Key & Owner Token in IndexedDB & LocalStorage
      await saveRoomKeyToIDB(roomId, rawRoomKeyHex);
      localStorage.setItem(`owner_token_${roomId}`, ownerToken);

      // 5. Navigate to Room Page with hash fragment #<linkSecret>
      router.push(`/r/${roomId}#${linkSecret}`);
    } catch (err) {
      console.error('Create room error:', err);
      alert('Error creating room. Ensure Realtime server is running on port 4000.');
      setIsCreating(false);
    }
  };

  return <LandingPage onCreateRoom={handleCreateRoom} isCreating={isCreating} />;
}
