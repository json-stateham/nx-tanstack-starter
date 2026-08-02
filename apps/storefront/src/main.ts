import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.config.errorHandler = (error) => {
  /* 
    handle error
    TODO: Sentry 
  */
  console.error(error);
};

app.mount("#app");
