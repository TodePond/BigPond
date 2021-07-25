
//=======//
// Setup //
//=======//
// These settings must be kept the same as in script.c !!!!!!
const WORLD_SIZE =  1500
const WORLD_WIDTH = WORLD_SIZE
const WORLD_HEIGHT = WORLD_SIZE
const WORLD_AREA = WORLD_WIDTH * WORLD_HEIGHT

const canvas = document.createElement("canvas")
const context = canvas.getContext("2d")
canvas.style["background-color"] = "rgb(45, 56, 77)"
canvas.style["image-rendering"] = "pixelated"

let c = {}
let imageData = undefined
let imageDataBuffer = undefined

const offerSand = (x) => {
	socket.send({offer: x})
}

const loadWasm = async () => {
	const response = await fetch("script.wasm")
	const wasm = await response.arrayBuffer()
	const {instance} = await WebAssembly.instantiate(wasm, {env: {print, offerSand}})
	c = instance.exports
	imageDataBuffer = getWasmGlobal("imageData", {length: WORLD_AREA * 4, type: Uint8ClampedArray})
	imageData = new ImageData(imageDataBuffer, WORLD_SIZE, WORLD_SIZE)
	c.setup()
	tick()
}

const getWasmGlobal = (name, {length=1, type=Int32Array}) => {
	const offset = c[name]
	return new type(c.memory.buffer, offset, length)
}

loadWasm()

on.load(() => {
	document.body.appendChild(canvas)
	document.body.style["margin"] = "0"
	document.body.style["background-color"] = "rgb(23, 29, 40)"
	trigger("resize")
})

on.resize(() => {
	canvas.width = WORLD_SIZE
	canvas.height = WORLD_SIZE
	//canvas.style["width"] = innerWidth + "px"
	//canvas.style["height"] = innerHeight + "px"
	//c.redrawWorld?.()
	drawWorld()
})

//============//
// Web Socket //
//============//

const socket = new WebSocket(`ws://${location.hostname}:8080`)
socket.onopen = () => socket.send("LAPTOP")

const OFFER_NONE = 0
const OFFER_IN_PROGRESS = 1

const offers = new Uint8Array(3000)

socket.onmessage = async (message) => {
	const arrayBuffer = await message.data.arrayBuffer()
	const array = new Uint8Array(arrayBuffer).d
	for (let x = 0; x < WORLD_SIZE; x++) {

		// IF I'M READY TO RECEIVE A NEW OFFER
		if (offers[x] === OFFER_NONE) {
			if (array[x] === OFFER_NONE) {
				// nothing to do here
			}
			else if (array[x] === OFFER_IN_PROGRESS) {
				const topElement = c.getTopElement(x).d9
				if (topElement === 0) {
					c.setTopElement(x, true)
					offers[x] = OFFER_IN_PROGRESS
				}
			}

		}

		// IF I'VE JUST PROCESSED AN OFFER
		else if (offers[x] === OFFER_IN_PROGRESS) {
			if (array[x] === OFFER_NONE) {
				// relax again so i can get ready for another offer
				offers[x] = OFFER_NONE
			}
			else if (array[x] === OFFER_IN_PROGRESS) {
				// nothing to do
			}
		}

	}
}

//======//
// Draw //
//======//
const drawWorld = () => {
	if (!imageData) return
	context.putImageData(imageData, 0, 0)
}

const WORLD_WIDTH_4 = WORLD_WIDTH * 4
const setPixel = (x, y, r, g, b, a) => {
	const offset = y * WORLD_WIDTH_4 + x * 4
	const data = imageData.data
	data[offset] = r
	data[offset+1] = g
	data[offset+2] = b
	data[offset+3] = a
}

const setPixelTransparency = (x, y, a) => {
	const offset = y * WORLD_WIDTH_4 + x * 4
	imageData.data[offset+3] = a
}

const setPixelIdTransparency = (id, a) => {
	imageData.data[id] = a
}

//=========//
// Dropper //
//=========//
let dropperSize = 4
//let dropperElement = 1
let dropperPreviousPosition = [undefined, undefined]

on.keydown(e => {
	if (e.key === "]") dropperSize++
	else if (e.key === "[") dropperSize--
	if (dropperSize < 0) dropperSize = 0
})

const drop = (dx, dy) => {
	for (let x = dx - dropperSize; x <= dx + dropperSize; x++) {
		for (let y = dy - dropperSize; y <= dy + dropperSize; y++) {
			c.setSpaceByPosition(x, y, 1)
		}
	}
}

on.touchmove(e => e.preventDefault(), {passive: false})

const updateDropper = () => {
	if (Mouse.Left || Touches.length > 0) {
		const cursor = Touches.length > 0? Touches[0] : Mouse
		const [cx, cy] = cursor.position
		const [mx, my] = [cx + scrollX, cy + scrollY]
		if (mx >= WORLD_WIDTH || my >= WORLD_HEIGHT || mx < 0 || my < 0) {
			dropperPreviousPosition = [undefined, undefined]
			return
		}

		const [px, py] = dropperPreviousPosition
		if (px === undefined || py === undefined) {
			drop(mx, my)
			dropperPreviousPosition = [mx, my]
			return
		}

		const [dx, dy] = [mx - px, my - py]
		const dmax = Math.max(Math.abs(dx), Math.abs(dy))
		if (dmax === 0) {
			drop(mx, my)
			//dropperPreviousPosition = [mx, my]
			//return
		}
		
		const [rx, ry] = [dx / dmax, dy / dmax]
		let [ix, iy] = dropperPreviousPosition
		for (let i = 0; i < dmax; i++) {
			ix += rx
			iy += ry
			drop(Math.round(ix), Math.round(iy))
		}

		dropperPreviousPosition = [mx, my]
	}
	else {
		dropperPreviousPosition = [undefined, undefined]
	}
}

//======//
// Tick //
//======//
const tick = () => {
	c.updateWorld()
	updateDropper()
	drawWorld()
	requestAnimationFrame(tick)
}

