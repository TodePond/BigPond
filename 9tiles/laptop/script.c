#include <stdint.h>
#include <stdbool.h>

#define WORLD_SIZE 1500
#define SPEED 1
int WORLD_AREA = WORLD_SIZE * WORLD_SIZE;
int IMAGE_DATA_LENGTH = WORLD_SIZE * WORLD_SIZE * 4;

void print(int message);
void offerSand(int x);

typedef struct Space Space;
struct Space {

	// Used for setting image data	
	int offset;

	// Used for transmitting sand to next tile
	int x;
	bool isBottom;
	bool isOffered;

	// Used for processing behaviour
	bool element;
	Space *below;
	Space *slideRight;
	Space *slideLeft;
};

Space world[WORLD_SIZE * WORLD_SIZE];
uint8_t imageData[WORLD_SIZE * WORLD_SIZE * 4];

int getIdFromPosition(int x, int y) {
	if (x >= WORLD_SIZE) return -1;
	if (y >= WORLD_SIZE) return -1;
	if (x < 0) return -1;
	if (y < 0) return -1;
	int xOffset = y % 2 == 0? x : (WORLD_SIZE - x);
	return y * WORLD_SIZE + xOffset;
}

int getOffsetFromPosition(int x, int y) {
	int baseOffset = y * WORLD_SIZE + x;
	return baseOffset*4 + 3;
}

Space *getSpaceFromPosition(int x, int y) {
	int id = getIdFromPosition(x, y);
	return &world[id];
}


// https://stackoverflow.com/questions/52514296/simplest-random-number-generator-without-c-library
static unsigned int g_seed;

// Used to seed the generator.           
void fast_srand(int seed) {
	g_seed = seed;
}

// Compute a pseudorandom integer.
// Output value in range [0, 32767]
int fast_rand(void) {
	g_seed = (214013*g_seed+2531011);
	return (g_seed>>16)&0x7FFF;
}

void setup() {
	fast_srand(0);

	// Set ids and offset
	for (int x = 0; x < WORLD_SIZE; x++) {
		for (int y = 0; y < WORLD_SIZE; y++) {
			int id = getIdFromPosition(x, y);
			Space *space = &world[id];
			
			space->offset = getOffsetFromPosition(x, y);
			space->below = getSpaceFromPosition(x, y+1);
			space->x = x;
			space->isBottom = y == WORLD_SIZE-1;
			space->slideRight = getSpaceFromPosition(x+1, y+1);
			space->slideLeft = getSpaceFromPosition(x-1, y+1);

			imageData[space->offset - 3] = (uint8_t) 254;
			imageData[space->offset - 2] = (uint8_t) 204;
			imageData[space->offset - 1] = (uint8_t) 70;
		}
	}
}

void setSpace(Space *space, bool element) {
	space->element = element;
	uint8_t transparency = space->element? 255 : 0;
	imageData[space->offset] = transparency;
}

void setSpaceById(int id, bool element) {
	Space *space = &world[id];
	setSpace(space, element);
}

void setSpaceByPosition(int x, int y, bool element) {
	int id = getIdFromPosition(x, y);
	setSpaceById(id, element);
}

void redrawWorld() {
	for (int id = 0; id < WORLD_AREA; id++) {
		Space *space = &world[id];
		int offset = space->offset;
		uint8_t transparency = space->element? 255 : 0;
		imageData[offset] = transparency;
	}
}

//bool direction = true;
void updateWorld() {
	for (int id = WORLD_AREA-1; id >= 0; id--) {
		//direction = !direction;
		Space *space = &world[id];
		if (space->element) {
			if (space->isBottom) {
				//offerSand(space->x);
				//space->isOffered = true;
				continue;
			}
			Space *below = space->below;
			if (!below->element) {
				setSpace(below, true);
				setSpace(space, false);
				continue;
			}
			bool direction = fast_rand() & 1;
			Space *slideRight = direction? space->slideLeft : space->slideRight;
			if (!slideRight->element) {
				setSpace(slideRight, true);
				setSpace(space, false);
				continue;
			}
		}
	}
	//direction = !direction;
}
