import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateCall } from '../src/services/whatsapp/metaApi';

vi.mock('../src/config/env', () => ({
  env: {
    META_API_VERSION: 'v21.0',
    WHATSAPP_ACCESS_TOKEN: 'test-token',
  },
}));

describe('Meta call API responses', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps calls[].id to call_id for outbound connect', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: 'whatsapp',
        calls: [{ id: 'wacid.ABGGFjFVU2AfAgo6V' }],
      }),
    });

    const result = await initiateCall('106540352242922', '+918860916437', undefined, {
      sdp_type: 'offer',
      sdp: 'v=0',
    });

    expect(result.call_id).toBe('wacid.ABGGFjFVU2AfAgo6V');
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.to).toBe('918860916437');
  });
});