/**
 * Register / Unregister EIP Session.
 * Per CIP Vol 2, Section 2-4.7 and 2-4.8
 */

import { RequestPipeline } from '@/pipeline/request-pipeline';
import { parseHeader } from '@/encapsulation/header';
import {
  registerSession as buildRegisterSession,
  unregisterSession as buildUnregisterSession,
} from '@/encapsulation/encapsulation';
import { ITransport } from '@/transport/interfaces';
import { SessionError } from '@/errors';

/**
 * Send RegisterSession and return the session ID.
 */
export async function doRegisterSession(
  pipeline: RequestPipeline,
  timeoutMs: number,
): Promise<number> {
  const request = buildRegisterSession();
  const response = await pipeline.send(request, timeoutMs);
  const parsed = parseHeader(response);

  if (parsed.statusCode !== 0) {
    throw new SessionError(`Register session failed: ${parsed.status}`, parsed.statusCode);
  }

  return parsed.session;
}

/**
 * Send UnregisterSession (fire-and-forget, no response expected).
 */
export function doUnregisterSession(transport: ITransport, sessionId: number): void {
  transport.write(buildUnregisterSession(sessionId));
}
