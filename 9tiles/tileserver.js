import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.1/mod.ts";

let laptop
let desktop
let phone

const LAPTOP_SIZE = 1500
const DESKTOP_SIZE = 3000
const PHONE_SIZE = 1500

const desktopOffers = new Uint8Array(DESKTOP_SIZE)

const OFFER_NONE = 0
const OFFER_IN_PROGRESS = 1

const wss = new WebSocketServer(8080);
wss.on("connection", (ws) => {

	ws.on("message", (message) => {

		if (ws === desktop) {
			for (let i = 0; i < DESKTOP_SIZE * 4; i += 4) {
				const pixel = message[i]
				const x = i / 4
				if (desktopOffers[x] === OFFER_NONE) {
					if (pixel !== 0) {
						desktopOffers[x] = OFFER_IN_PROGRESS
					}
				}
				else if (desktopOffers[x] === OFFER_IN_PROGRESS) {
					
				}
			}
			
			if (desktop.state === 1) desktop.send(desktopOffers)
			//if (laptop.state === 1) laptop.send(desktopOffers)
			return
		}

		if (ws === laptop) {

			return
		}

		if (message === "LAPTOP") {
			if (laptop) {
				console.log("%cClosing old laptop connection", "color: rgb(255, 70, 70)")
				if (laptop.readyState !== 3) laptop.close()
			}
			console.log("%cLaptop Connected", "color: rgb(70, 255, 128)")
			laptop = ws
			return
		}
		if (message === "DESKTOP") {
			if (desktop) {
				console.log("%cClosing old desktop connection", "color: rgb(255, 70, 70)")
				desktop.close()
				for (let i = 0; i < desktopOffers.length; i++) {
					desktopOffers[i] = OFFER_NONE
				}
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