import {serve} from "https://deno.land/std/http/server.ts"
import {acceptWebSocket, acceptable} from "https://deno.land/std/ws/mod.ts"
const s = serve({port: 8080})

//https://blog.logrocket.com/using-websockets-with-deno/
//https://www.youtube.com/watch?v=Cb8zho9HDbk
console.log("%cTile Server Running on port 8080", "color: rgb(0, 128, 255)")

const sockets = []

const connection = async (socket) => {
	console.log("%cConnected to client", "color: rgb(0, 255, 128)")
	sockets.push(socket)

	for await (ev of socket) {
		console.log(ev)
	}
}

for await (const req of s) {
	if (acceptable(req)) {
		acceptWebSocket({
			conn: req.conn,
			bufReader: req.r,
			bufWriter: req.w,
			headers: req.headers,
		}).then(connection)
	}
}