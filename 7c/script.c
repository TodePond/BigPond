#define WORLD_SIZE 1000
#define SPEED 4
int WORLD_AREA = WORLD_SIZE * WORLD_SIZE;
int IMAGE_DATA_LENGTH = WORLD_SIZE * WORLD_SIZE * 4;

typedef struct space space;
struct space {
	int x;
	int y;
	int id;
	int element;
	space *below;
	space *slideRight;
	space *slideLeft;
};

space world[WORLD_SIZE * WORLD_SIZE];
int imageData[WORLD_SIZE * WORLD_SIZE * 4];

void setup() {
	for (int i = 0; i < WORLD_AREA; i++) {
		
	}
}

void setSpace(space *target, int element) {
	target->element = element;

}

void getImageData(int *buffer) {
	for (int i = 0; i < IMAGE_DATA_LENGTH; i++) {
		buffer[i] = 200;
	}
}

void setImageData() {
	for (int i = 0; i < IMAGE_DATA_LENGTH; i++) {
		imageData[i] = 200;
	}
}
