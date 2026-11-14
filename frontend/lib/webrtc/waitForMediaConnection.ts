export function waitForMediaConnection(
  peerConnection: RTCPeerConnection,
  timeoutMs = 20000
): Promise<void> {
  const isReady = () => {
    const ice = peerConnection.iceConnectionState;
    const conn = peerConnection.connectionState;
    return (
      ice === 'connected' ||
      ice === 'completed' ||
      conn === 'connected'
    );
  };

  if (isReady()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Call media connection timed out. Check microphone permissions and try again.'));
    }, timeoutMs);

    const onIce = () => {
      if (peerConnection.iceConnectionState === 'failed') {
        cleanup();
        reject(new Error('Call media connection failed.'));
        return;
      }
      if (isReady()) {
        cleanup();
        resolve();
      }
    };

    const onConnection = () => {
      if (peerConnection.connectionState === 'failed') {
        cleanup();
        reject(new Error('Call media connection failed.'));
        return;
      }
      if (isReady()) {
        cleanup();
        resolve();
      }
    };

    function cleanup() {
      window.clearTimeout(timeout);
      peerConnection.removeEventListener('iceconnectionstatechange', onIce);
      peerConnection.removeEventListener('connectionstatechange', onConnection);
    }

    peerConnection.addEventListener('iceconnectionstatechange', onIce);
    peerConnection.addEventListener('connectionstatechange', onConnection);
  });
}