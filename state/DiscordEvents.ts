import { ClientEvents, Client } from "oceanic.js";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export default async (client: Client) => {
  let path = resolve(__dirname, "..", "events");
  const eventList = await readdir(path);

	for (let event of eventList) {
		try {
      const _import = await import(join(path, event));
      if (typeof _import.default !== "function" || !_import?.default) continue;
      
      client.on(event.split('.')[0] as keyof ClientEvents, (...args) => _import.default(client, ...args));
    } catch {
      continue;
    };
	};
};