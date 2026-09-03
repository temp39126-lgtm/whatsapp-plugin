import type { NotificationPreferences } from '@shared/types/preferences';

let audioContext: AudioContext | null = null;
let originalDocumentTitle = '';
let titleFlashTimer: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
  }
  return audioContext;
}

export function playNotificationSound(): void {
  const context = getAudioContext();
  if (!context) return;

  void context.resume().then(() => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  }).catch(() => undefined);
}

export async function ensureDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showDesktopNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    });
  } catch {
    // Ignore browsers that block notifications without a user gesture.
  }
}

export function flashDocumentTitle(label: string): void {
  if (typeof document === 'undefined') return;
  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title;
  }
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
  }

  let showAlert = true;
  titleFlashTimer = setInterval(() => {
    document.title = showAlert ? `(${label}) ${originalDocumentTitle}` : originalDocumentTitle;
    showAlert = !showAlert;
  }, 1000);

  const stop = () => {
    if (titleFlashTimer) {
      clearInterval(titleFlashTimer);
      titleFlashTimer = null;
    }
    document.title = originalDocumentTitle;
    window.removeEventListener('focus', stop);
  };

  window.addEventListener('focus', stop, { once: true });
}

export function getMessagePreview(content: unknown, type?: string): string {
  if (!content || typeof content !== 'object') {
    return type ? `[${type}]` : 'New message';
  }

  const record = content as { text?: string; caption?: string; fileName?: string };
  if (record.text?.trim()) return record.text.trim();
  if (record.caption?.trim()) return record.caption.trim();
  if (record.fileName?.trim()) return record.fileName.trim();
  return type ? `[${type}]` : 'New message';
}

export function shouldSuppressConversationAlert(conversationId?: string): boolean {
  if (!conversationId || typeof window === 'undefined') return false;
  return window.sessionStorage.getItem('activeConversationId') === conversationId;
}

export function setActiveConversationId(conversationId: string | null): void {
  if (typeof window === 'undefined') return;
  if (conversationId) {
    window.sessionStorage.setItem('activeConversationId', conversationId);
  } else {
    window.sessionStorage.removeItem('activeConversationId');
  }
}

export function notifyIncomingMessage(
  preferences: NotificationPreferences,
  params: { conversationId: string; preview: string; senderLabel?: string }
): void {
  if (!preferences.messageAlerts) return;
  if (shouldSuppressConversationAlert(params.conversationId)) return;

  const title = params.senderLabel ? `New message from ${params.senderLabel}` : 'New customer message';

  if (preferences.sound) {
    playNotificationSound();
  }

  if (preferences.desktopNotifications) {
    showDesktopNotification(title, {
      body: params.preview,
      tag: `message-${params.conversationId}`,
    });
  }

  flashDocumentTitle('New message');
}

export function notifyConversationAssigned(
  preferences: NotificationPreferences,
  params: { conversationLabel?: string }
): void {
  if (!preferences.messageAlerts) return;

  const title = 'Conversation assigned to you';
  const body = params.conversationLabel
    ? `${params.conversationLabel} was assigned to you.`
    : 'Open the inbox to respond.';

  if (preferences.sound) {
    playNotificationSound();
  }

  if (preferences.desktopNotifications) {
    showDesktopNotification(title, { body, tag: 'conversation-assigned' });
  }

  flashDocumentTitle('Assigned');
}
