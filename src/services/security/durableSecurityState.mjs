// Cada sesion y cada limite por IP tienen un objeto independiente, compartido
// por todas las instancias. Este almacenamiento no usa D1.
export class SecurityState {
  constructor(ctx) { this.ctx = ctx; }

  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const data = request.method === "POST" ? await request.json() : {};
    return this.ctx.blockConcurrencyWhile(async () => {
      const now = Date.now();
      if (pathname === "/audit") {
        if (request.method === "POST") {
          const event = data.event;
          if (!event?.evento_id || !event.creado_en) return new Response("Invalid event", { status: 400 });
          await this.ctx.storage.put(`audit:${event.creado_en}:${event.evento_id}`, event);
          const recent = await this.ctx.storage.list({ prefix: "audit:", reverse: true, limit: 1001 });
          if (recent.size > 1000) await this.ctx.storage.delete([...recent.keys()].slice(1000));
          return Response.json({ ok: true });
        }
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
        const limit = Math.min(300, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 100));
        const events = await this.ctx.storage.list({ prefix: "audit:", reverse: true, limit });
        return Response.json({ events: [...events.values()] });
      }
      let record = await this.ctx.storage.get("record");
      if (record && record.expiresAt <= now) record = null;
      if (pathname === "/version") {
        if (request.method === "POST") {
          record = { version: crypto.randomUUID() };
          await this.ctx.storage.put("record", record);
        } else if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
        return Response.json({ version: record?.version || "" });
      }
      if (pathname === "/limit" && request.method === "POST") {
        if (!record) record = { count: 0, expiresAt: now + data.windowMs };
        const allowed = record.count < data.max;
        if (allowed) record.count += 1;
        await this.ctx.storage.put("record", record);
        await this.ctx.storage.setAlarm(record.expiresAt);
        return Response.json({ allowed, resetAt: record.expiresAt });
      }
      if (pathname !== "/session") return new Response("Not found", { status: 404 });
      if (request.method === "GET") return Response.json(record && !record.revoked ? record.session : null);
      if (request.method === "DELETE") {
        // Una escritura que ya estaba en vuelo no puede resucitar la sesion.
        record = { revoked: true, expiresAt: Math.max(record?.expiresAt || 0, now + 7 * 86400000) };
      } else if (request.method === "POST") {
        if (record?.revoked) return Response.json({ ok: true });
        if (data.touch && !record) return Response.json({ ok: true });
        record = { session: data.touch ? { ...record.session, cookie: data.session.cookie } : data.session, expiresAt: data.expiresAt };
      } else return new Response("Method not allowed", { status: 405 });
      await this.ctx.storage.put("record", record);
      await this.ctx.storage.setAlarm(record.expiresAt);
      return Response.json({ ok: true });
    });
  }

  async alarm() {
    // Una solicitud puede extender la vida del registro mientras el alarm espera.
    const record = await this.ctx.storage.get("record");
    if (!record || record.expiresAt <= Date.now()) await this.ctx.storage.deleteAll();
    else await this.ctx.storage.setAlarm(record.expiresAt);
  }
}
