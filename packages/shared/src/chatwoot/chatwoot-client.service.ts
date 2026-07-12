import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin, typed wrapper around the self-hosted Chatwoot REST API
 * (https://github.com/chatwoot/chatwoot). Not tied to any one module —
 * anything that needs to provision an inbox, register a contact, or check
 * connectivity injects this client. No business logic lives here; callers
 * (ChatwootService in apps/api) own the "when do we call this" decisions.
 *
 * Auth: Chatwoot's platform/account API uses an `api_access_token` header.
 */
export interface ChatwootConnection {
  baseUrl: string;
  apiAccessToken: string;
  accountId: number;
}

export interface ChatwootInbox {
  id: number;
  name: string;
  website_token: string;
  channel_type: string;
}

@Injectable()
export class ChatwootClientService {
  private readonly logger = new Logger(ChatwootClientService.name);

  private async request<T>(conn: ChatwootConnection, path: string, init?: RequestInit): Promise<T> {
    const url = `${conn.baseUrl.replace(/\/$/, '')}/api/v1/accounts/${conn.accountId}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        api_access_token: conn.apiAccessToken,
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Chatwoot API ${path} failed (${res.status}): ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** Creates a "Website" channel inbox — this is what a widget script embeds against. */
  async createWebsiteInbox(conn: ChatwootConnection, name: string, websiteUrl: string): Promise<ChatwootInbox> {
    return this.request<ChatwootInbox>(conn, '/inboxes', {
      method: 'POST',
      body: JSON.stringify({
        name,
        channel: { type: 'web_widget', website_url: websiteUrl, welcome_title: `Chat with ${name}`, welcome_tagline: 'We usually reply within a few hours.' },
      }),
    });
  }

  /** Registers/updates a contact (e.g. a tenant owner) under the platform account, for the Tier-2 inbox. */
  async upsertContact(conn: ChatwootConnection, dto: { name: string; email: string; identifier?: string }): Promise<{ id: number }> {
    return this.request<{ id: number }>(conn, '/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: dto.name, email: dto.email, identifier: dto.identifier || dto.email }),
    }).catch(async () => {
      // Chatwoot returns 422 if the contact already exists by email — look it up instead.
      const search = await this.request<{ payload: Array<{ id: number }> }>(
        conn,
        `/contacts/search?q=${encodeURIComponent(dto.email)}`,
      );
      const existing = search.payload?.[0];
      if (!existing) throw new Error(`Could not create or find Chatwoot contact for ${dto.email}`);
      return existing;
    });
  }

  /** Lightweight connectivity check — used by the platform-admin "Test connection" button. */
  async testConnection(conn: ChatwootConnection): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request(conn, '/inboxes');
      return { success: true };
    } catch (e) {
      this.logger.warn(`Chatwoot connection test failed: ${(e as Error).message}`);
      return { success: false, error: (e as Error).message };
    }
  }
}
