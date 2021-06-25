
const urlParams = new URLSearchParams(window.location.search)

//=======//
// Setup //
//=======//
const canvas = document.createElement("canvas")
const context = canvas.getContext("2d")
canvas.style["background-color"] = "rgb(23, 29, 40)"
canvas.style["image-rendering"] = "pixelated"

on.load(() => {
	document.body.appendChild(canvas)
	document.body.style["margin"] = "0"
	trigger("resize")
})

on.resize(() => {
	canvas.width = innerWidth
	canvas.height = innerHeight
	//canvas.style["width"] = innerWidth + "px"
	//canvas.style["height"] = innerHeight + "px"
	//drawWorld()
})

//=======//
// World //
//=======//
const WORLD_WIDTH = urlParams.get("size")?.as(Number) || 100
const WORLD_HEIGHT = urlParams.get("size")?.as(Number) || 100
const WORLD_AREA = WORLD_WIDTH * WORLD_HEIGHT

const makeElement = (colour, behave) => ({colour, behave})
const ELEMENT_EMPTY = makeElement("rgb(45, 56, 77)")
const ELEMENT_VOID = makeElement("rgb(23, 29, 40)")
const ELEMENT_WALL = makeElement("rgb(65, 76, 97)")
const ELEMENT_SAND = makeElement("rgb(255, 204, 70)", (origin) => {
	const [x, y] = origin
	const below = grid[x][y+1]
	if (below?.element === ELEMENT_EMPTY) {
		below.element = ELEMENT_SAND
		origin.element = ELEMENT_EMPTY
		return
	}
	const direction = Random.oneIn(2)? 1 : -1
	const slide = grid[x+direction]?.[y+1]
	if (slide?.element === ELEMENT_EMPTY) {
		slide.element = ELEMENT_SAND
		origin.element = ELEMENT_EMPTY
		return
	}
})

const makeSpace = (x, y) => ({x, y, element: ELEMENT_EMPTY})

const world = []
const grid = []
for (let x = 0; x < WORLD_WIDTH; x++) {
	grid.push([])
	for (let y = 0; y < WORLD_HEIGHT; y++) {
		const space = makeSpace(x, y)
		grid[x].push(space)
	}
	for (let y = WORLD_HEIGHT-1; y >= 0; y--) {
		world.push(grid[x][y])
	}
	
}


const updateWorld = () => {
	for (const space of world) {
		space.element.behave?.(space)
	}
}

//======//
// Draw //
//======//
const drawWorld = () => {
	for (const space of world) {
		drawSpace(space)
	}
}

const drawSpace = (space) => {
	context.fillStyle = space.element.colour
	context.fillRect(space.x, space.y, 1, 1)
}

//=========//
// Dropper //
//=========//
let dropperSize = 0
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
			if (space) space.element = dropperElement
		}
	}
}

const updateDropper = () => {
	if (Mouse.Left) {
		const [mx, my] = Mouse.position
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
	updateDropper()
	updateWorld()
	drawWorld()
	requestAnimationFrame(tick)
	//setTimeout(tick, 1000 / 60)
}

tick()
//requestAnimationFrame(() => setInterval(tick, 1000 / 60))

