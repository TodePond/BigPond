const urlParams = new URLSearchParams(window.location.search)
const WORLD_SIZE = urlParams.get("size")?.as(Number) || 1000
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
	//canvas.style["width"] = innerWidth + "px"
	//canvas.style["height"] = innerHeight + "px"
	drawWorld()
})

//======//
// Draw //
//======//
const drawWorld = () => {
	context.putImageData(imageData, 0, 0)
}

const setPixel = (x, y, r, g, b, a) => {
	const offset = y * WORLD_WIDTH * 4 + x * 4
	const data = imageData.data
	data[offset] = r
	data[offset+1] = g
	data[offset+2] = b
	data[offset+3] = a
}

const setPixelTransparency = (x, y, a) => {
	const offset = y * WORLD_WIDTH * 4 + x * 4
	imageData.data[offset+3] = a
}

//=======//
// World //
//=======//
let directionTick = true

const makeElement = (colour, behave) => ({colour, behave})
const ELEMENT_EMPTY = makeElement([0, 0, 0, 0])
const ELEMENT_SAND = makeElement([254, 204, 70, 255], (origin) => {
	const {x, y} = origin
	const below = grid[x][y+1]
	if (below?.element === ELEMENT_EMPTY) {
		setSpace(below, ELEMENT_SAND)
		setSpace(origin, ELEMENT_EMPTY)
		return
	}
	const direction = Random.oneIn(2)? 1 : -1
	//directionTick = !directionTick
	const slide = grid[x+direction]?.[y+1]
	if (slide?.element === ELEMENT_EMPTY) {
		setSpace(slide, ELEMENT_SAND)
		setSpace(origin, ELEMENT_EMPTY)
		return
	}
})

const setSpace = (space, element) => {
	space.element = element
	if (element === ELEMENT_SAND) setPixelTransparency(space.x, space.y, 255)
	else setPixelTransparency(space.x, space.y, 0)
}

const makeSpace = (x, y) => ({x, y, element: ELEMENT_EMPTY})

const world = []
const grid = []
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


const updateWorld = () => {
	for (let i = 0; i < SPEED; i++) for (const space of world) {
		space.element.behave?.(space)
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

on.touchmove(e => e.preventDefault(), {passive: false})

const updateDropper = () => {
	if (Mouse.Left || Touches.length > 0) {
		const cursor = Touches.length > 0? Touches[0] : Mouse
		const [mx, my] = cursor.position
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
	requestAnimationFrame(tick)
}


requestAnimationFrame(tick, 1000 / 60)

