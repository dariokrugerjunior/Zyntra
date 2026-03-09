const sessions = new Map<string, unknown>();

export function getSessionKey(companyId: string, sessionId: string) {
  return `${companyId}:${sessionId}`;
}

export function setSocket(companyId: string, sessionId: string, socket: unknown) {
  sessions.set(getSessionKey(companyId, sessionId), socket);
}

export function getSocket<T>(companyId: string, sessionId: string): T | undefined {
  return sessions.get(getSessionKey(companyId, sessionId)) as T | undefined;
}

export function removeSocket(companyId: string, sessionId: string) {
  sessions.delete(getSessionKey(companyId, sessionId));
}
