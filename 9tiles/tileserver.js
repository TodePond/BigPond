import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.1/mod.ts";

let laptop
let desktop
let phone

const LAPTOP_SIZE = 1500
const DESKTOP_SIZE = 3000
const PHONE_SIZE = 1500

const desktopOffers = new Uint8Array(DESKTOP_SIZE)

const OFFER_NONE = 0
const OFFER_READY = 1
const OFFER_FIRED = 2

const wss = new WebSocketServer(8080);
wss.on("connection", (ws) => {

	ws.on("message", (message) => {

		if (ws === desktop) {
			for (let i = 0; i < DESKTOP_SIZE * 4; i += 4) {
				const pixel = message[i]
				const x = i / 4
				const offer = desktopOffers[x]

				// No sand in this space
				if (pixel === 0) {
					if (offer === OFFER_READY) {
						desktopOffers[x] = OFFER_FIRED
					}
				}

				// Yes sand in this space
				else {
					if (offer === OFFER_NONE) {
						desktopOffers[x] = OFFER_READY
					}
				}
			}
			
			console.log(desktopOffers)
			//laptop.send(desktopOffers)
			return
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