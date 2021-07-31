import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.1/mod.ts";

let laptop
let desktop
let phone

const LAPTOP_SIZE = 1500
const DESKTOP_SIZE = 3000
const PHONE_SIZE = 1500

const OFFER_NONE = 0
const OFFER_IN_PROGRESS = 1

const wss = new WebSocketServer(8081);
wss.on("connection", (ws) => {

	ws.on("message", (message) => {

		if (ws === phone) {
			if (desktop.state === 1) desktop.send(message)
			return
		}

		if (ws === desktop) {
			if (phone.state === 1) phone.send(message)
			return
		}

		if (message === "LAPTOP") {
			if (laptop) {
				console.log("%cClosing old laptop connection", "color: rgb(255, 70, 70)")
				//if (laptop.state !== 3) laptop.close()
			}
			console.log("%cLaptop Connected", "color: rgb(70, 255, 128)")
			laptop = ws
			return
		}
		if (message === "DESKTOP") {
			if (desktop) {
				console.log("%cClosing old desktop connection", "color: rgb(255, 70, 70)")
				//if (desktop.state !== 3) desktop.close()
			}
			console.log("%cDesktop Connected", "color: rgb(70, 255, 128)")
			desktop = ws
			return
		}
		if (message === "PHONE") {
			if (phone) {
				console.log("%cClosing old phone connection", "color: rgb(255, 70, 70)")
				//phone.close()
			}
			console.log("%cPhone Connected", "color: rgb(70, 255, 128)")
			phone = ws
			return
		}
		//console.log(message);
		//ws.send(message)
	})
})