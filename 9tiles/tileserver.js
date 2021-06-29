import {serve} from "https://deno.land/std/http/server.ts"
import {acceptWebSocket} from "https://deno.land/std/ws/mod.ts"
const s = serve({port: 80})

console.log("%cTile Server Running on port 80", "color: rgb(0, 128, 255)")
for await (const req of s) {
	req.respond({body: "hi"})
}