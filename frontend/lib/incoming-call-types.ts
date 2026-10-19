import type { CallDTO } from '@/types';
import type { WebRtcSession } from '@/lib/webrtc/outboundCall';

export type IncomingCallContact = {
  _id?: string;
  name?: string;
  phone?: string;
};

export type IncomingCallSocketPayload = {
  call: CallDTO;
  session?: WebRtcSession;
  contact?: IncomingCallContact;
};

export type PendingIncomingCall = {
  call: CallDTO;
  session?: WebRtcSession;
  contact?: IncomingCallContact;
};
