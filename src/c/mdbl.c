#include <pebble.h>

static Window *s_main_window;

static void init(void) {
  s_main_window = window_create();
  window_stack_push(s_main_window, true);

  moddable_createMachine(NULL);
}

static void deinit(void) {
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}