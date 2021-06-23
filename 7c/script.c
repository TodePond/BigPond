#include <stdint.h>
#include <stdbool.h>

#define WORLD_SIZE 1500
#define SPEED 1
int WORLD_AREA = WORLD_SIZE * WORLD_SIZE;
int IMAGE_DATA_LENGTH = WORLD_SIZE * WORLD_SIZE * 4;

void print(int message);

typedef struct Space Space;
struct Space {

	// Used for setting image data	
	int offset;

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
	return y * WORLD_SIZE + x;
}

Space *getSpaceFromPosition(int x, int y) {
	int id = getIdFromPosition(x, y);
	return &world[id];
}

void setup() {
	// Set ids and offset
	for (int x = 0; x < WORLD_SIZE; x++) {
		for (int y = 0; y < WORLD_SIZE; y++) {
			int id = getIdFromPosition(x, y);
			Space *space = &world[id];
			//space->id = id;
			space->offset = id*4 + 3;
			imageData[space->offset - 3] = (uint8_t) 254;
			imageData[space->offset - 2] = (uint8_t) 204;
			imageData[space->offset - 1] = (uint8_t) 70;
		}
	}

	// Link neighbours
	for (int x = 0; x < WORLD_SIZE; x++) {
		for (int y = 0; y < WORLD_SIZE; y++) {
			int id = getIdFromPosition(x, y);
			Space *space = &world[id];
			space->below = getSpaceFromPosition(x, y+1);
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

void updateWorld() {
	for (int t = 0; t < SPEED; t++) for (int id = WORLD_AREA-1; id >= 0; id--) {
		Space *space = &world[id];
		if (space->element) {
			if (!space->below->element) {
				setSpace(space->below, true);
				setSpace(space, false);
			}
		}
	}
}
