#define WORLD_SIZE 1000
#define SPEED 4
int WORLD_AREA = WORLD_SIZE * WORLD_SIZE;

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

int add(int a, int b) {
	return a + b;
}
