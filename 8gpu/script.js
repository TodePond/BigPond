const urlParams = new URLSearchParams(window.location.search)

const WORLD_WIDTH_PARAM = urlParams.get("w")
const WORLD_WIDTH = WORLD_WIDTH_PARAM !== null? WORLD_WIDTH_PARAM.as(Number) : 300
//const WORLD_WIDTH = 16384
const SPACE_COUNT = WORLD_WIDTH * WORLD_WIDTH

const EVENT_WINDOW_PARAM = urlParams.get("e")
const EVENT_WINDOW = EVENT_WINDOW_PARAM !== null? EVENT_WINDOW_PARAM.as(Number) : 0

const RANDOM_SPAWN_PARAM = urlParams.get("s")
const RANDOM_SPAWN = RANDOM_SPAWN_PARAM !== null? RANDOM_SPAWN_PARAM.as(Number) : 0

const EVENT_CHANCE = 0.05
const EVENTS_NEEDED_FOR_COVERAGE = EVENT_WINDOW == 1? 1 : 1 / EVENT_CHANCE

const EVENTS_PER_FRAME_PARAM = urlParams.get("f")
const EVENTS_PER_FRAME = EVENTS_PER_FRAME_PARAM !== null? EVENTS_PER_FRAME_PARAM.as(Number) : 12
const EVENT_CYCLE_COUNT = Math.round(EVENTS_PER_FRAME)

let PAN_POSITION_X = 0
let PAN_POSITION_Y = 0
let ZOOM = 1.0

const BG_COLOUR = new THREE.Color()
BG_COLOUR.setRGB(13 / 255, 16 / 255, 23 / 255)
//BG_COLOUR.setHSL(Math.random(), 1, 0.92)

//======//
// Menu //
//======//
const MENU_WIDTH = 90
const makeMenu = () => {
	const style = `
		position: absolute;
		width: ${MENU_WIDTH}px;
		z-index: 1;
	`
	const menu = HTML `<div class="menu" style="${style}"></div>`
	
	const sand = makeMenuItem("Sand", SAND, "#fc0")
	const water = makeMenuItem("Water", WATER, "rgb(0, 153, 255)")
	const static = makeMenuItem("Static", STATIC, "rgb(128, 128, 128)")
	const forkbomb = makeMenuItem("Forkbomb", FORKBOMB, "rgb(255, 70, 70)")
	const empty = makeMenuItem("Empty", EMPTY, "rgb(13, 16, 23)", true)
	menu.appendChild(sand)
	menu.appendChild(water)
	menu.appendChild(static)
	menu.appendChild(empty)
	menu.appendChild(forkbomb)
	
	return menu
	
}

on.load(() => {
	document.body.style["text-align"] = "center"
})

const makeMenuItem = (name, element, colour, inverse = false) => {
	const style = `
		background-color: ${colour};
		width: ${MENU_WIDTH}px;
		font-family: Rosario;
		padding: 10px 0px;
		margin: 10px;
		cursor: default;
		user-select: none;
		color: ${inverse? "rgb(224, 224, 224)" : "rgb(13, 16, 23)"};
	`
	
	const item = HTML `<div style="${style}" id="menuItem${name}" class="menuItem menuItem${name}">${name}</div>`
	if (element === DROPPER_ELEMENT) item.classList.add("selected")
	
	const hover = HTML ` 
		<style>
			.menuItem${name}:hover {
				outline: 3px solid ${colour};
				position: relative;
				z-index: 1;
			}
			
			.menuItem${name}.selected {
				outline: 3px solid ${inverse? "rgb(224, 224, 224)" : "rgb(13, 16, 23)"};
			}
		</style>
	`
	document.head.appendChild(hover)
	
	item.on.click(function() {
		DROPPER_ELEMENT = element
		$$(".menuItem").forEach(el => el.classList.remove("selected"))
		this.classList.add("selected")
	})
	return item
}

//========//
// Canvas //
//========//
const CANVAS_MARGIN = 0
const makeCanvas = () => {
	const style = `
		background-color: rgb(47, 51, 61);
		margin: ${CANVAS_MARGIN}px;
		//${EVENT_WINDOW? "" : "cursor: none;"}
		position: absolute;
		left: 0px;
		top:0px;
	`
	const canvas = HTML `<canvas style="${style}"></canvas>`
	return canvas
}
	
const resizeCanvas = (canvas) => {
	//const smallestDimension = Math.min(document.body.clientWidth - CANVAS_MARGIN * 2, document.body.clientHeight - CANVAS_MARGIN * 2)
	canvas.style.width = innerWidth
	canvas.style.height = innerHeight
	
	canvas.width = innerWidth
	canvas.height = innerHeight
	
}

//=========//
// Context //
//=========//
const makeContext = (canvas) => canvas.getContext("webgl2", {preserveDrawingBuffer: true})
const resizeContext = (gl, canvas) => {
	//const smallestDimension = Math.min(document.body.clientWidth, document.body.clientHeight)
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
}

//========//
// Shader //
//========//
const createShader = (gl, type, source) => {

	// Check type
	let typeName
	if (type === gl.VERTEX_SHADER) typeName = "Vertex Shader"
	else if (type === gl.FRAGMENT_SHADER) typeName = "Fragment Shader"
	if (typeName === undefined) throw new Error(`[SandPond] Cannot compile unknown shader type: '${type}'`)
	
	const shader = gl.createShader(type)
	gl.shaderSource(shader, source)
	gl.compileShader(shader)
	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
	if (!success) {
		const log = gl.getShaderInfoLog(shader)
		gl.deleteShader(shader)
		throw new Error(`\n\n[SandPond] WebGL Compilation Error: ${typeName}\n\n${log}`)
	}
	
	print(`[SandPond] WebGL Compilation Success: ${typeName}`)
	return shader
}

//=========//
// Program //
//=========//
const createProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
	const program = gl.createProgram()
	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)
	gl.linkProgram(program)
	const success = gl.getProgramParameter(program, gl.LINK_STATUS)
	if (!success) {
		const log = gl.getProgramInfoLog(program)
		gl.deleteProgram(program)
		throw new Error(`\n\n[SandPond] WebGL Link Error\n\n${log}`)
	}
	
	print(`[SandPond] WebGL Link Success`)
	gl.useProgram(program)
	return program	
}

//========//
// Buffer //
//========//
const createBuffer = (bindPoint, hint, data) => {
	const buffer = gl.createBuffer()
	const typedData = new Float32Array(data)
	gl.bindBuffer(bindPoint, buffer)
	gl.bufferData(bindPoint, typedData, hint)
	return buffer
}

//========//
// Attrib //
//========//


//===============//
// Vertex Shader //
//===============//
const vertexShaderSource = `#version 300 es

	in vec2 a_TexturePosition;
	out vec2 v_TexturePosition;
	
	void main() {
		vec2 position = (a_TexturePosition - 0.5) * 2.0;
		gl_Position = vec4(position, 0, 1);
		v_TexturePosition = a_TexturePosition;
	}
`

//=================//
// Fragment Shader //
//=================//
const coordsOrigin = [
	[-1, 1],
	[ 0, 1],
	[ 1, 1],
	
	[-1, 0],
	[ 1, 0],
	
	[-1,-1],
	[ 0,-1],
	[ 1,-1],
	
	[-2, 2],
	[-1, 2],
	[ 0, 2],
	[ 1, 2],
	[ 2, 2],
	
	[-2,-2],
	[-1,-2],
	[ 0,-2],
	[ 1,-2],
	[ 2,-2],
	
	[-2, 1],
	[-2, 0],
	[-2,-1],
	
	[ 2, 1],
	[ 2, 0],
	[ 2,-1],
]

const sitesKey = [
	["ORIGIN", [0, 0]],
	["BELOW", [0, -1]],
	["RIGHT", [1, 0]],
	["LEFT", [-1, 0]],
	//["ABOVE", [0, 1]],
	//["BELOW_RIGHT", [1, -1]],
	//["BELOW_LEFT", [-1, -1]],
]

const getAxisSuffix = (a) => {
	if (a >= 0) return `${a}`
	return `_${a * -1}`
}
const getCoordSuffix = (x, y) => {
	return getAxisSuffix(x) + getAxisSuffix(y)
}

const gen = (coords = coordsOrigin, margin = ``, sites) => {
	const lines = []
	const [siteName, [rx, ry]] = sites[0]
	//console.log(siteName)
	
	const [cx, cy] = coords[0]
	const x = cx + rx
	const y = cy + ry
	
	const coordSuffix = getCoordSuffix(x, y)
	lines.push(`${margin}vec2 space${coordSuffix} = ew(${x}.0, ${y}.0);`)
	lines.push(`${margin}float score${coordSuffix} = getPickedScoreOfSpace(space${coordSuffix});`)
	lines.push(`${margin}if (score00 < score${coordSuffix}) {`)
	
	if (coords.length > 1) {
		lines.push(...gen(coords.slice(1), margin + `	`, sites))
	}
	else {
		lines.push(`${margin}	return ${siteName};`)
	}
	
	lines.push(`${margin}}`)
	
	if (sites.length > 1) {
		//lines.push(...gen(undefined, margin, sites.slice(1)))
	}
	else {
		//console.log("Hioi")
	}
	
	return lines
}


const fragmentShaderSource = `#version 300 es

	precision highp float;
	
	in vec2 v_TexturePosition;
	
	uniform sampler2D u_Texture;
	uniform bool u_isPost;
	uniform vec2 u_dropperPosition;
	uniform vec2 u_dropperPreviousPosition;
	uniform bool u_dropperDown;
	uniform float u_dropperWidth;
	uniform float u_time;
	uniform float u_seed;
	uniform float u_eventTime;
	
	uniform vec2 u_panPosition;
	uniform float u_zoom;
	
	out vec4 colour;
	
	float random(vec2 st) {
		return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
	}
	
	vec2 world(float x, float y) {
		float ewX = v_TexturePosition.x + x / ${WORLD_WIDTH}.0;
		float ewY = v_TexturePosition.y + y / ${WORLD_WIDTH}.0;
		
		vec2 xy = vec2(ewX, ewY);
		xy = xy * ${WORLD_WIDTH}.0;
		xy = floor(xy);
		xy = xy + 0.5 / ${WORLD_WIDTH}.0;
		return xy;
	}
	
	vec2 ew(float x, float y) {
		vec2 xy = world(x, y);
		xy = xy / ${WORLD_WIDTH}.0;
		return xy;
	}
	
	float getPickedScoreOfSpace(vec2 space) {
		return random(space / (u_seed + 1.0));
	}
	
	float getPickedScore(float x, float y) {
		vec2 space = ew(x, y);
		return getPickedScoreOfSpace(space);
	}
	
	// hot function
	bool isPickedAndBest(float x, float y) {
		
		vec2 space = ew(x, y);
		
		float score = getPickedScoreOfSpace(space);
		
		float x1 = x + 1.0;
		float x_1 = x - 1.0;
		float y1 = y + 1.0;
		float y_1 = y - 1.0;
		
		// 1 space away
		if (score >= getPickedScore(x1, y)) return false;
		if (score >= getPickedScore(x1, y1)) return false;
		if (score >= getPickedScore(x, y1)) return false;
		if (score >= getPickedScore(x_1, y1)) return false;
		if (score >= getPickedScore(x_1, y)) return false;
		if (score >= getPickedScore(x_1, y_1)) return false;
		if (score >= getPickedScore(x, y_1)) return false;
		if (score >= getPickedScore(x1, y_1)) return false;
		
		// 2 spaces away
		float x2 = x + 2.0;
		float x_2 = x - 2.0;
		float y2 = y + 2.0;
		float y_2 = y - 2.0;
		
		if (score >= getPickedScore(x_2, y2)) return false;
		if (score >= getPickedScore(x_1, y2)) return false;
		if (score >= getPickedScore(x, y2)) return false;
		if (score >= getPickedScore(x1, y2)) return false;
		if (score >= getPickedScore(x2, y2)) return false;
		
		if (score >= getPickedScore(x_2, y_2)) return false;
		if (score >= getPickedScore(x_1, y_2)) return false;
		if (score >= getPickedScore(x, y_2)) return false;
		if (score >= getPickedScore(x1, y_2)) return false;
		if (score >= getPickedScore(x2, y_2)) return false;
		
		if (score >= getPickedScore(x_2, y1)) return false;
		if (score >= getPickedScore(x_2, y)) return false;
		if (score >= getPickedScore(x_2, y_1)) return false;
		
		if (score >= getPickedScore(x2, y1)) return false;
		if (score >= getPickedScore(x2, y)) return false;
		if (score >= getPickedScore(x2, y1)) return false;
		
		return true;
	}
	
	
	
	// Site Numbers
	const int ORIGIN = 1;
	const int BELOW = 2;
	const int BELOW_RIGHT = 3;
	const int BELOW_LEFT = 4;
	const int RIGHT = 5;
	const int LEFT = 6;
	const int ABOVE = 7;
	
	/*float score00;
	
	float score_11;
	float score01;
	float score11;
	float score_10;
	float score10;
	float score_1_1;
	float score0_1;
	float score1_1;
	
	float score_22;
	float score_12;
	float score02;
	float score12;
	float score22;
	
	float score_2_2;
	float score_1_2;
	float score0_2;
	float score1_2;
	float score2_2;
	
	float score_21;
	float score_20;
	float score_2_1;
	
	float score21;
	float score20;
	float score2_1;*/
	
	int getMySite() {
	
		vec2 space00 = ew(0.0, 0.0);
		float score00 = getPickedScoreOfSpace(space00);
		
		// Am I an origin?
		if (isPickedAndBest(0.0, 0.0)) return ORIGIN;
		if (isPickedAndBest(0.0, 1.0)) return BELOW;
		if (isPickedAndBest(-1.0, 0.0)) return RIGHT;
		if (isPickedAndBest(1.0, 0.0)) return LEFT;
		if (isPickedAndBest(0.0, -1.0)) return ABOVE;
		if (isPickedAndBest(-1.0, 1.0)) return BELOW_RIGHT;
		if (isPickedAndBest(1.0, 1.0)) return BELOW_LEFT;
		return 0;
	}
	
	// only used for debug vis
	bool isPickedInWindow(float x, float y) {
		if (isPickedAndBest(1.0, 0.0)) return true;
		if (isPickedAndBest(1.0, 1.0)) return true;
		if (isPickedAndBest(0.0, 1.0)) return true;
		if (isPickedAndBest(-1.0, 1.0)) return true;
		if (isPickedAndBest(-1.0, 0.0)) return true;
		if (isPickedAndBest(-1.0, -1.0)) return true;
		if (isPickedAndBest(0.0, -1.0)) return true;
		if (isPickedAndBest(1.0, -1.0)) return true;
		return false;
	}
	
	const vec4 WHITE = vec4(224.0 / 255.0, 224.0 / 255.0, 224.0 / 255.0, 1.0);
	const vec4 BLANK = vec4(0.0, 0.0, 0.0, 0.0);
	const vec4 RED = vec4(1.0, 70.0 / 255.0, 70.0 / 255.0, 1.0);
	const vec4 BLUE = vec4(0.0, 0.5, 1.0, 1.0);
	const vec4 GREEN = vec4(0.0, 1.0, 0.5, 1.0);
	
	const vec4 SAND = vec4(1.0, 204.0 / 255.0, 0.0, 1.0);
	const vec4 EMPTY = vec4(0.0, 0.0, 0.0, 0.0);
	const vec4 VOID = vec4(1.0, 1.0, 1.0, 0.0);
	const vec4 WATER = vec4(0.0, 0.6, 1.0, 1.0);
	const vec4 STATIC = vec4(0.5, 0.5, 0.5, 1.0);
	const vec4 FORKBOMB = RED;
	
	vec4 getColour(float x, float y) {
		
		float ewX = v_TexturePosition.x + x / ${WORLD_WIDTH}.0;
		float ewY = v_TexturePosition.y + y / ${WORLD_WIDTH}.0;
		
		/*ewX = ewX * ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewX = floor(ewX);
		ewX = ewX / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewX = ewX + 0.5 / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		
		ewY = ewY * ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewY = floor(ewY);
		ewY = ewY / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewY = ewY + 0.5 / ${WORLD_WIDTH * WORLD_WIDTH}.0;*/
		
		vec2 xy = vec2(ewX, ewY);
		
		if (xy.y < 0.0) return VOID;
		if (xy.y > 1.0) return VOID;
		if (xy.x < 0.0) return VOID;
		if (xy.x > 1.0) return VOID;
		
		return texture(u_Texture, xy);
	}
	
	uniform bool u_dropperPreviousDown;
	
	bool isInDropper(float offsetX, float offsetY, float offsetZoom) {
	
		if (u_eventTime < ${EVENT_CYCLE_COUNT}.0 - 1.0) return false;
	
		vec2 space = (ew(0.0, 0.0) + vec2(offsetX, offsetY)) / offsetZoom;
		
		vec2 drop = u_dropperPosition;
		vec2 previous = u_dropperPreviousPosition;
		
		float width = u_dropperWidth;// * u_zoom;
				
		if (u_dropperPreviousDown) {
			vec2 diff = drop - previous;
			vec2 abs = abs(diff);
			
			float largest = max(abs.x, abs.y);
			vec2 ratio = abs / largest;
			vec2 way = sign(diff);
			vec2 inc = way * ratio;
			
			float i = 0.0;
			while (i < 1.0) {
				if (i >= largest) break;
				vec2 new = drop - inc * i;
				vec2 final = new + space.x;
				
				vec2 debug = new;
				if (space.x <= debug.x + width) {
					if (space.x >= debug.x - width) {
						if (space.y <= debug.y + width) {
							if (space.y >= debug.y - width) {
								return true;
							}
						}
					}
				}
				i = i + 1.0 / ${WORLD_WIDTH}.0;
			}
			
		
			if (space.x <= u_dropperPreviousPosition.x + width) {
				if (space.x >= u_dropperPreviousPosition.x - width) {
					if (space.y <= u_dropperPreviousPosition.y + width) {
						if (space.y >= u_dropperPreviousPosition.y - width) {
							return true;
						}
					}
				}
			}
		}
		
		
		if (space.x <= u_dropperPosition.x + width) {
			if (space.x >= u_dropperPosition.x - width) {
				if (space.y <= u_dropperPosition.y + width) {
					if (space.y >= u_dropperPosition.y - width) {
						return true;
					}
				}
			}
		}
		
		return false;
	}
	
	uniform vec4 u_dropperElement;
	
	bool isElement(vec4 colour, vec4 element) {
		return floor(colour * 255.0) == floor(element * 255.0);
	}
	
	
	
	void process() {
	
		${(() => {
			if (!EVENT_WINDOW) return ""
			return `
				
				int sitey = getMySite();
				
				if (sitey == ORIGIN) {
					colour = RED;
					return;
				}
				
				if (sitey == 0) {
					colour = BLANK;
					return;
				}
				
				/*if (isPickedAndBest(0.0, 0.0)) {
					colour = RED;
					return;
				}
				
				if (isPickedInWindow(0.0, 0.0)) {
					colour = BLUE;
					return;
				}
				*/
				colour = BLUE;
				return;
			`
		})()}
	
		vec4 dropperElement = u_dropperElement;
	
		// Am I being dropped to?
		if (u_dropperDown && isInDropper(0.0, 0.0, 1.0)) {
			colour = dropperElement;
			return;
		}
		
		//=================//
		// What site am I? //
		//=================//
		int site = getMySite();
		if (site == 0) {
			colour = getColour(0.0, 0.0);
			return;
		}
		
		//=========================//
		// What do I want to read? //
		//=========================//
		vec4 elementOrigin;
		vec4 elementBelow;
		vec4 elementLeft;
		vec4 elementRight;
		vec4 elementBelowRight;
		vec4 elementBelowLeft;
		vec4 elementAbove;
		
		if (site == ORIGIN) {
			elementOrigin = getColour(0.0, 0.0);
			elementBelow = getColour(0.0, -1.0);
			elementAbove = getColour(0.0, 1.0);
			elementBelowRight = getColour(1.0, -1.0);
			elementBelowLeft = getColour(-1.0, -1.0);
			
			elementLeft = getColour(-1.0, 0.0);
			elementRight = getColour(1.0, 0.0);
		}
		else if (site == BELOW) {
			elementOrigin = getColour(0.0, 1.0);
			elementBelow = getColour(0.0, 0.0);
			elementAbove = getColour(0.0, 2.0);
			elementBelowRight = getColour(1.0, 0.0);
			elementBelowLeft = getColour(-1.0, 0.0);
			
			elementLeft = getColour(-1.0, 1.0);
			elementRight = getColour(1.0, 1.0);
		}
		else if (site == BELOW_RIGHT) {
			elementOrigin = getColour(-1.0, 1.0);
			elementBelow = getColour(-1.0, 0.0);
			elementAbove = getColour(-1.0, 2.0);
			elementBelowRight = getColour(0.0, 0.0);
			elementBelowLeft = getColour(-2.0, 0.0);
			
			elementLeft = getColour(-2.0, 1.0);
			elementRight = getColour(0.0, 1.0);
		}
		else if (site == BELOW_LEFT) {
			elementOrigin = getColour(1.0, 1.0);
			elementBelow = getColour(1.0, 0.0);
			elementAbove = getColour(1.0, 2.0);
			elementBelowRight = getColour(2.0, 0.0);
			elementBelowLeft = getColour(0.0, 0.0);
			
			elementLeft = getColour(0.0, 1.0);
			elementRight = getColour(2.0, 1.0);
		}
		else if (site == RIGHT) {
			elementOrigin = getColour(-1.0, 0.0);
			elementBelow = getColour(-1.0, -1.0);
			elementAbove = getColour(-1.0, 1.0);
			elementBelowRight = getColour(0.0, -1.0);
			elementBelowLeft = getColour(-2.0, -1.0);
			
			elementLeft = getColour(-2.0, 0.0);
			elementRight = getColour(0.0, 0.0);
		}
		else if (site == LEFT) {
			elementOrigin = getColour(1.0, 0.0);
			elementBelow = getColour(1.0, -1.0);
			elementAbove = getColour(1.0, 1.0);
			elementBelowRight = getColour(2.0, -1.0);
			elementBelowLeft = getColour(0.0, -1.0);
			
			elementLeft = getColour(0.0, 0.0);
			elementRight = getColour(2.0, 0.0);
		}
		else if (site == ABOVE) {
			elementOrigin = getColour(0.0, -1.0);
			elementBelow = getColour(0.0, -2.0);
			elementAbove = getColour(0.0, 0.0);
			elementBelowRight = getColour(1.0, -2.0);
			elementBelowLeft = getColour(-1.0, -2.0);
			
			elementLeft = getColour(-1.0, -1.0);
			elementRight = getColour(1.0, -1.0);
		}
		
		if (elementOrigin == EMPTY) {
			
		}
		
		//==========================//
		// How do I behave? - WATER //
		//==========================//
		else if (isElement(elementOrigin, WATER)) {
			// Fall
			if (elementBelow == EMPTY) {
				elementOrigin = EMPTY;
				elementBelow = WATER;
			}
			
			else if (elementLeft == EMPTY) {
				elementOrigin = EMPTY;
				elementLeft = WATER;
			}
			
			else if (elementRight == EMPTY) {
				elementOrigin = EMPTY;
				elementRight = WATER;
			}
		}
		
		//=============================//
		// How do I behave? - FORKBOMB //
		//=============================//
		else if (elementOrigin == FORKBOMB) {
			if (elementBelow == EMPTY) elementBelow = FORKBOMB;
			if (elementLeft == EMPTY) elementLeft = FORKBOMB;
			if (elementRight == EMPTY) elementRight = FORKBOMB;
			if (elementAbove == EMPTY) elementAbove = FORKBOMB;
		}
		
		//=========================//
		// How do I behave? - SAND //
		//=========================//
		else if (elementOrigin == SAND) {
			// Fall
			if (elementBelow == EMPTY || isElement(elementBelow, WATER)) {
				elementOrigin = elementBelow;
				elementBelow = SAND;
			}
			
			// Slide Right
			else if (elementBelowRight == EMPTY || isElement(elementBelowRight, WATER)) {
				elementOrigin = elementBelowRight;
				elementBelowRight = SAND;
			}
			
			// Slide Left
			else if (elementBelowLeft == EMPTY || isElement(elementBelowLeft, WATER)) {
				elementOrigin = elementBelowLeft;
				elementBelowLeft = SAND;
			}
		}
		
		//================//
		// Apply changes! //
		//================//
		if (site == ORIGIN) {
			colour = elementOrigin;
			return;
		}
		if (site == BELOW) {
			colour = elementBelow;
			return;
		}
		if (site == BELOW_RIGHT) {
			colour = elementBelowRight;
			return;
		}
		if (site == BELOW_LEFT) {
			colour = elementBelowLeft;
			return;
		}
		if (site == RIGHT) {
			colour = elementRight;
			return;
		}
		if (site == LEFT) {
			colour = elementLeft;
			return;
		}
		if (site == ABOVE) {
			colour = elementAbove;
			return;
		}
		
		colour = RED;
		
	}
	
	const vec4 u_bgColor = vec4(${BG_COLOUR.r}, ${BG_COLOUR.g}, ${BG_COLOUR.b}, 1.0);
	
	void postProcess() {
		
		${(() => EVENT_WINDOW !== 1? `
			
			if (isInDropper(u_panPosition.x, u_panPosition.y, u_zoom)) {
				colour = vec4(0.0, 1.0, 0.5, 1.0);
				return;
			}
		
		` : "")()}
		
		vec2 targetPos = (v_TexturePosition + u_panPosition) / u_zoom;
		if (targetPos.x <= 1.0 && targetPos.x >= 0.0 && targetPos.y >= 0.0 && targetPos.y <= 1.0) colour = texture(u_Texture, targetPos);
		else colour = u_bgColor;
	}
	
	void main() {
		if (!u_isPost) {
			process();
		}
		else {
			postProcess();
		}
	}
`

//=======//
// Setup //
//=======//
const EMPTY = [0, 0, 0, 0]
const SAND = [1.0, 204.0 / 255.0, 0.0, 1.0]
const WATER = [0.0, 0.6, 1.0, 1.0]
const STATIC = [0.5, 0.5, 0.5, 1.0]
const FORKBOMB = [1.0, 70.0 / 255.0, 70.0 / 255.0, 1.0]
let DROPPER_ELEMENT = SAND

/*const menu = makeMenu()
document.body.appendChild(menu)*/

const canvas = makeCanvas()
document.body.appendChild(canvas)
const gl = makeContext(canvas)
resizeCanvas(canvas)
resizeContext(gl, canvas)
on.resize(() => {
	resizeCanvas(canvas)
	resizeContext(gl, canvas)
})

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

const isPostLocation = gl.getUniformLocation(program, "u_isPost")
gl.uniform1ui(isPostLocation, 1)

const dropperDownLocation = gl.getUniformLocation(program, "u_dropperDown")
gl.uniform1ui(dropperDownLocation, 0)

const previousDownLocation = gl.getUniformLocation(program, "u_dropperPreviousDown")
gl.uniform1ui(previousDownLocation, 0)

const dropperPositionLocation = gl.getUniformLocation(program, "u_dropperPosition")
gl.uniform2f(dropperPositionLocation, 0, 0)

const panPositionLocation = gl.getUniformLocation(program, "u_panPosition")
gl.uniform2f(panPositionLocation, PAN_POSITION_X, PAN_POSITION_Y)

const zoomLocation = gl.getUniformLocation(program, "u_zoom")
gl.uniform1f(zoomLocation, ZOOM)

const dropperPreviousPositionLocation = gl.getUniformLocation(program, "u_dropperPreviousPosition")
gl.uniform2f(dropperPreviousPositionLocation, 0, 0)

const dropperElementLocation = gl.getUniformLocation(program, "u_dropperElement")
gl.uniform4fv(dropperElementLocation, DROPPER_ELEMENT)

const dropperWidthLocation = gl.getUniformLocation(program, "u_dropperWidth")
gl.uniform1f(dropperWidthLocation, 1 / WORLD_WIDTH)

const timeLocation = gl.getUniformLocation(program, "u_time")
gl.uniform1f(timeLocation, 0)

const seedLocation = gl.getUniformLocation(program, "u_seed")
gl.uniform1f(seedLocation, 0)

const eventTimeLocation = gl.getUniformLocation(program, "u_eventTime")
gl.uniform1f(eventTimeLocation, 0)

// Texture Position Attribute
const texturePositionLocation = gl.getAttribLocation(program, "a_TexturePosition")
const texturePositionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer)
const texturePositionData = new Float32Array([
	-1.0, -1.0,
	-1.0, 1.0,
	1.0, 1.0,
	
	1.0, 1.0,
	1.0, -1.0,
	-1.0, -1.0,
])
gl.bufferData(gl.ARRAY_BUFFER, texturePositionData, gl.STATIC_DRAW)
gl.enableVertexAttribArray(texturePositionLocation)
gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, false, 0, 0)

let texture1 = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture1)
const spaces = new Uint8Array(WORLD_WIDTH * WORLD_WIDTH * 4)
if (RANDOM_SPAWN !== 0) for (let i = 0; i < spaces.length; i += 4) {
	if (RANDOM_SPAWN == 1) {
		if (Math.random() < 0.05) {
			spaces[i] = 255
			spaces[i+1] = 204
			spaces[i+3] = 255
		}
	}
	else if (RANDOM_SPAWN == 2) {
		if (i === Math.floor(WORLD_WIDTH * WORLD_WIDTH * 4 / 2) + WORLD_WIDTH * 4/2) {
			spaces[i] = 255
			spaces[i+1] = 204
			spaces[i+3] = 255
		}
	}
	else if (RANDOM_SPAWN == 3) {
		spaces[i] = 255
		spaces[i+1] = 204
		spaces[i+3] = 255
	}
}
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RGBA, gl.UNSIGNED_BYTE, spaces)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

const fb1 = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, fb1)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture1, 0)

const texture2 = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture2)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

const fb2 = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, fb2)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture2, 0)

//======//
// Draw //
//======//
let currentDirection = true
let paused = false
on.keydown((e) => {
	if (e.key === " ") paused = !paused
})

let middleDown = false
on.mousedown(e => {
	if (e.button === 1) middleDown = true
})
on.mouseup(e => {
	if (e.button === 1) middleDown = false
})

let mouseDown = false
canvas.on.mousedown(e => {
	if (e.button === 0) mouseDown = true
})
canvas.on.mouseup(e => {
	if (e.button === 0) mouseDown = false
})
canvas.on.touchstart(e => {
	mouseDown = true
})
canvas.on.touchend(e => {
	mouseDown = false
})

let time = 0
const SEED_STEP = 0.0001
let seed = SEED_STEP

let previousMouseX = 0
let previousMouseY = 0
const draw = async () => {
	
	previousDown = dropperDown
	dropperDown = mouseDown
	
	const currentMouseX = Mouse.x
	const currentMouseY = Mouse.y

	const diffX = currentMouseX - previousMouseX
	const diffY = currentMouseY - previousMouseY
	
	previousMouseX = currentMouseX
	previousMouseY = currentMouseY
	
	if (middleDown) {
		PAN_POSITION_X -= diffX / canvas.clientWidth
		PAN_POSITION_Y += diffY / canvas.clientHeight
	}
	
	gl.uniform1f(zoomLocation, ZOOM)
	gl.uniform2f(panPositionLocation, PAN_POSITION_X, PAN_POSITION_Y)
	gl.uniform4fv(dropperElementLocation, DROPPER_ELEMENT)
	
	gl.uniform1ui(dropperDownLocation, dropperDown)
	gl.uniform1ui(previousDownLocation, previousDown)
	
	gl.uniform2f(dropperPositionLocation, dropperX / WORLD_WIDTH, dropperY / WORLD_WIDTH)
	gl.uniform2f(dropperPreviousPositionLocation, previousX / WORLD_WIDTH, previousY / WORLD_WIDTH)
	gl.uniform1f(dropperWidthLocation, DROPPER_SIZE / WORLD_WIDTH)
	
	
	previousX = dropperX
	previousY = dropperY
	
	/*let cont = true
	if (EVENT_WINDOW) {
		if (cummT >= 500) cummT = 0
		else cont = false
	}*/
	
	let sourceTexture
	let frameBuffer
	let targetTexture
	
	for (let i = 0; i < EVENT_CYCLE_COUNT; i++) {
	
		//time++
		seed += SEED_STEP
		if (seed > 1.0) seed = SEED_STEP
		//while (time >= 18) time -= 18
		//gl.uniform1f(timeLocation, time)
		gl.uniform1f(seedLocation, seed)
		gl.uniform1f(eventTimeLocation, i)
	
		if (currentDirection === true && !paused) {
			sourceTexture = texture1
			frameBuffer = fb2
			targetTexture = texture2
			targetFrameBuffer = fb1
			if (!paused) currentDirection = false
		}
		else {
			sourceTexture = texture2
			frameBuffer = fb1
			targetTexture = texture1
			targetFrameBuffer = fb2
			if (!paused) currentDirection = true
		}
		
		if (!paused) {
			// Target
			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
			gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
			gl.uniform1ui(isPostLocation, 0)
			
			gl.viewport(0, 0, WORLD_WIDTH, WORLD_WIDTH)
			gl.drawArrays(gl.TRIANGLES, 0, 6)
		}
	}
	
	// Canvas
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.bindTexture(gl.TEXTURE_2D, targetTexture)
	gl.uniform1ui(isPostLocation, 1)
	
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientWidth)
	gl.drawArrays(gl.TRIANGLES, 0, 6)
	
	if (EVENT_WINDOW) await wait(500)
	requestAnimationFrame(draw)
}

requestAnimationFrame(draw)

//=========//
// Dropper //
//=========//
let DROPPER_SIZE = 1

let dropperDown = false
let dropperX = 0
let dropperY = 0

let previousDown = false
let previousX = 0
let previousY = 0

const ZOOM_SPEED = 0.05
on.mousewheel((e) => {
	if (Keyboard.Shift) {
		if (e.deltaY < 0) {
			DROPPER_SIZE++
			//if (DROPPER_SIZE > 15) DROPPER_SIZE = 15
		}
		else if (e.deltaY > 0) {
			DROPPER_SIZE--
			if (DROPPER_SIZE < 1) DROPPER_SIZE = 1
		}
	}
	else {
		if (e.deltaY < 0) {
			const zoomStep = (ZOOM - ZOOM * (1 - ZOOM_SPEED))
			ZOOM += zoomStep
			const [x, y] = getTheoreticalDropperPos()
			const xRatio = (x / WORLD_WIDTH)
			const yRatio = (y / WORLD_WIDTH)
			PAN_POSITION_X += zoomStep * xRatio
			PAN_POSITION_Y += zoomStep * yRatio
			updateDropperPos()
		}
		else if (e.deltaY > 0) {
			const zoomStep = (ZOOM - ZOOM * (1 - ZOOM_SPEED))
			ZOOM -= zoomStep
			const [x, y] = getTheoreticalDropperPos()
			const xRatio = (x / WORLD_WIDTH)
			const yRatio = (y / WORLD_WIDTH)
			PAN_POSITION_X -= zoomStep * xRatio
			PAN_POSITION_Y -= zoomStep * yRatio
			updateDropperPos()
		}
	}
})


const getTheoreticalDropperPos = () => {
	const x = Math.round(((Mouse.x/canvas.clientWidth) + PAN_POSITION_X) * WORLD_WIDTH/ZOOM)
	const yRatio = canvas.clientWidth / canvas.clientHeight
	const yDiff = canvas.clientHeight - canvas.clientWidth
	const y = ((WORLD_WIDTH)/ZOOM - Math.round(((Mouse.y - yDiff)/canvas.clientWidth - PAN_POSITION_Y) * WORLD_WIDTH/ZOOM))
	return [x, y]
}

const updateDropperPos = (reset = false) => {
	[dropperX, dropperY] = getTheoreticalDropperPos()
	return
	;dropperX = Math.round((((Mouse.x - canvas.offsetLeft) / canvas.clientWidth) + PAN_POSITION_X) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round((((Mouse.y - CANVAS_MARGIN) / canvas.clientWidth) - PAN_POSITION_Y) * WORLD_WIDTH)
	if (reset) {
		previousX = dropperX
		previousY = dropperY
	}
}

canvas.on.mousemove((e) => {
	return updateDropperPos()
	/*dropperX = Math.round(((e.offsetX / canvas.clientWidth) + PAN_POSITION_X) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.offsetY / canvas.clientHeight) - PAN_POSITION_Y) * WORLD_WIDTH)*/
})

canvas.on.touchstart(e => {
	dropperX = Math.round(((e.changedTouches[0].clientX - canvas.offsetLeft) / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.changedTouches[0].clientY - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
	e.preventDefault()
})

canvas.on.touchmove(e => {
	dropperX = Math.round(((e.changedTouches[0].clientX - canvas.offsetLeft) / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.changedTouches[0].clientY - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
	e.preventDefault()
})

