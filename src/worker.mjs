import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";

// Los servicios existentes leen process.env. Se completa una vez con los
// secretos y bindings entregados por Workers, sin incluirlos en el cliente.
globalThis.__MAWG_ENV__ = env;
globalThis.__MAWG_SESSION_KV__ = env.SESSIONS;
// La base queda enlazada desde esta fase, pero Sheets sigue siendo la fuente
// activa hasta concluir la importacion y sus pruebas de consistencia.
globalThis.__MAWG_D1__ = env.DB;

const serverModule = await import("../server.js");
const { app } = serverModule.default || serverModule;

app.listen(3000);

export default httpServerHandler({ port: 3000 });
