import {serve} from "https://deno.land/std/http/server.ts"
import {serveFile} from "https://deno.land/std/http/file_server.ts"
import {resolve} from "https://deno.land/std/path/mod.ts"
import {acceptWebSocket, acceptable} from "https://deno.land/std/ws/mod.ts"
const s = serve({port: 8000})

const connection = async (socket) => {
	console.log("%cConnected to client", "color: rgb(0, 255, 128)")

	/*for await (ev of socket) {
		console.log(ev)
	}*/
}

console.log("%cServer Running on port 8000", "color: rgb(0, 128, 255)")
for await (const req of s) {

	if (req.url === "/ws") {
		if (acceptable(req)) {
			acceptWebSocket({
				conn: req.conn,
				bufReader: req.r,
				bufWriter: req.w,
				headers: req.headers,
			}).then(connection)
		}
	}
	else {
		const isDir = req.url.split(".").length === 1
		if (isDir) {
			if (req.url.slice(-1) === "/") req.url += "index.html"
			else req.url += "/index.html"
		}

		let path = req.url
		const referer = req.headers.get("referer")
		const host = req.headers.get("host")
		if (referer !== null) {
			path = referer.split(host).slice(-1) + req.url
		}
		const url = resolve("." + path)
		try {
			const content = await serveFile(req, url)
			//content.headers.append("Cross-Origin-Opener-Policy", "same-origin")
			//content.headers.append("Cross-Origin-Embedder-Policy", "require-corp")
			req.respond(content)
			if (url.slice(-".html".length) === ".html") console.log(`%cServing ${url}`, "color: rgb(0, 255, 128)")
		}
		catch(e) {
			console.log("%cCouldn't find " + url, "color: rgb(255, 70, 70)")
			req.respond({status: 404})
		}
	}
		
}