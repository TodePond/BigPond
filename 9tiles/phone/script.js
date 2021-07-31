const urlParams = new URLSearchParams(window.location.search)
const WORLD_SIZE = urlParams.get("size")?.as(Number) || 1500
const WORLD_WIDTH = WORLD_SIZE
const WORLD_HEIGHT = WORLD_SIZE
const WORLD_AREA = WORLD_WIDTH * WORLD_HEIGHT
const SPEED = urlParams.get("speed")?.as(Number) || 1

//=======//
// Setup //
//=======//
const canvas = document.createElement("canvas")
const context = canvas.getContext("2d")
const imageData = context.createImageData(WORLD_SIZE, WORLD_SIZE)
canvas.style["background-color"] = "rgb(45, 56, 77)"
canvas.style["image-rendering"] = "pixelated"

on.load(() => {
	document.body.appendChild(canvas)
	document.body.style["margin"] = "0"
	document.body.style["background-color"] = "rgb(23, 29, 40)"
	trigger("resize")
})

on.resize(() => {
	canvas.width = WORLD_SIZE
	canvas.height = WORLD_SIZE
	canvas.style["width"] = innerHeight + "px"
	canvas.style["height"] = innerHeight + "px"
	drawWorld()
})

const downOffers = new Uint8Array(1500)
const socket = new WebSocket(`ws://${location.hostname}:8081`)
socket.onopen = () => socket.send("PHONE")
socket.onmessage = async (message) => {
	let changed = false
	const arrayBuffer = await message.data.arrayBuffer()
	const array = new Uint8Array(arrayBuffer)
	for (let i = 0; i < array.length; i++) {
		if (array[i] === 0) {

		}
		else if (array[i] === 1) {
			downOffers[i] = 0
			changed = true
		}
	}
	if (changed) socket.send(downOffers)
}

//======//
// Draw //
//======//
const drawWorld = () => {
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

//=======//
// World //
//=======//
let directionTick = true

const makeElement = (colour, behave) => ({colour, behave})
const ELEMENT_EMPTY = makeElement([0, 0, 0, 0])
const ELEMENT_SAND = makeElement([254, 204, 70, 255], (origin) => {
	const below = origin.below
	if (below?.element === ELEMENT_EMPTY) {
		setSpace(below, ELEMENT_SAND)
		setSpace(origin, ELEMENT_EMPTY)
		return
	}
	const direction = Random.oneIn(2)
	if (direction) {
		const slide = origin.slideRight
		if (slide?.element === ELEMENT_EMPTY) {
			setSpace(slide, ELEMENT_SAND)
			setSpace(origin, ELEMENT_EMPTY)
		}
		return

	}

	const slide = origin.slideLeft
	if (slide?.element === ELEMENT_EMPTY) {
		setSpace(slide, ELEMENT_SAND)
		setSpace(origin, ELEMENT_EMPTY)
		return
	}
})

const setSpace = (space, element) => {
	space.element = element
	if (element === ELEMENT_SAND) setPixelIdTransparency(space.id, 255)
	else setPixelIdTransparency(space.id, 0)
}

const makeSpace = (x, y) => ({
	x,
	y,
	id: y * WORLD_WIDTH * 4 + x * 4 + 3,
	element: ELEMENT_EMPTY,
	below: undefined,
	slideLeft: undefined,
	slideRight: undefined
})

const world = []
const worldReversed = []
const grid = []

// Make the grid
for (let x = 0; x < WORLD_WIDTH; x++) {
	grid.push([])
	for (let y = 0; y < WORLD_HEIGHT; y++) {
		const space = makeSpace(x, y)
		grid[x].push(space)
		setPixel(space.x, space.y, 254, 204, 70, 0)
	}

	for (let y = WORLD_HEIGHT-1; y >= 0; y--) {
		world.push(grid[x][y])
	}
	
}

for (let x = WORLD_WIDTH-1; x >= 0; x--) {
	for (let y = WORLD_HEIGHT-1; y >= 0; y--) {
		worldReversed.push(grid[x][y])
	}
	
}

// Make the big space array
//for (let y = WORLD_HEIGHT-1; y >= 0; y--) {
/*for (let y = 0; y < WORLD_HEIGHT; y++) {
	const row = grid[y].clone
	//if (y % 2 === 0) row.reverse()
	//const row = grid[y].clone.shuffle()
	for (let x = 0; x < WORLD_WIDTH; x++) {
		world.push(row[x])
	}
}
const worldReversed = world.clone.reverse()*/

// Link neighbours
for (let x = 0; x < WORLD_WIDTH; x++) {
	grid.push([])
	for (let y = 0; y < WORLD_HEIGHT; y++) {
		const space = grid[x][y]
		space.below = grid[x][y+1]
		space.slideRight = grid[x+1]?.[y+1]
		space.slideLeft = grid[x-1]?.[y+1]
	}
}

let tickTock = true
const updateWorld = () => {
	for (let i = 0; i < SPEED; i++) {
		if (tickTock) {
			for (const space of world) {
				space.element.behave?.(space)
			}
		}
		else {
			for (const space of worldReversed) {
				space.element.behave?.(space)
			}
		}
		//tickTock = !tickTock
	}

	if (socket.readyState === 1) {
		let changed = false
		for (let i = 0; i < downOffers.length; i++) {
			const bottomSpace = grid[i][WORLD_HEIGHT-1]
			if (downOffers[i] === 0 && bottomSpace.element === ELEMENT_SAND) {
				setSpace(bottomSpace, ELEMENT_EMPTY)
				downOffers[i] = 1
				changed = true
			}
		}
		if (changed) socket.send(downOffers)
	}
}

//=========//
// Dropper //
//=========//
let dropperSize = 4
let dropperElement = ELEMENT_SAND
let dropperPreviousPosition = [undefined, undefined]

on.keydown(e => {
	if (e.key === "]") dropperSize++
	else if (e.key === "[") dropperSize--
	if (dropperSize < 0) dropperSize = 0
})

const drop = (dx, dy) => {
	for (let x = dx - dropperSize; x <= dx + dropperSize; x++) {
		for (let y = dy - dropperSize; y <= dy + dropperSize; y++) {
			const space = grid[x]?.[y]
			if (space) {
				setSpace(space, ELEMENT_SAND)
			}
		}
	}
}

canvas.on.touchstart(() => {
	document.body.requestFullscreen()
})

on.touchmove(e => e.preventDefault(), {passive: false})

const updateDropper = () => {
	if (Mouse.Left || Touches.length > 0) {
		const cursor = Touches.length > 0? Touches[0] : Mouse
		const canvasRatio = WORLD_HEIGHT / innerHeight
		let [mx, my] = cursor.position
		mx *= canvasRatio
		my *= canvasRatio
		mx = Math.round(mx)
		my = Math.round(my)
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
	updateWorld()
	updateDropper()
	drawWorld()
	setTimeout(tick, 0)
}


tick()

