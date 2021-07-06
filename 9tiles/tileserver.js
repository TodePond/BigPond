import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.1/mod.ts";

let laptop
let desktop
let phone

const LAPTOP_SIZE = 1500
const DESKTOP_SIZE = 3000
const PHONE_SIZE = 1500

const wss = new WebSocketServer(8080);
wss.on("connection", (ws) => {

	ws.on("message", (message) => {

		if (ws === laptop) {
			if (message.offer !== undefined) {

			}
		}

		if (message === "LAPTOP") {
			if (laptop) {
				console.log("%cClosing old laptop connection", "color: rgb(255, 70, 70)")
				laptop.close()
			}
			console.log("%cLaptop Connected", "color: rgb(70, 255, 128)")
			laptop = ws
			return
		}
		if (message === "DESKTOP") {
			if (desktop) {
				console.log("%cClosing old desktop connection", "color: rgb(255, 70, 70)")
				desktop.close()
			}
			console.log("%cDesktop Connected", "color: rgb(70, 255, 128)")
			desktop = ws
			return
		}
		if (message === "PHONE") {
			if (phone) {
				console.log("%cClosing old phone connection", "color: rgb(255, 70, 70)")
				phone.close()
			}
			console.log("%cPhone Connected", "color: rgb(70, 255, 128)")
			phone = ws
			return
		}
		//console.log(message);
		//ws.send(message)
	})
})