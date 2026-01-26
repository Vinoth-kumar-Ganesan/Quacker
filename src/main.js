import { createApp } from "vue";
import App from "./App.vue";
import 'primeicons/primeicons.css';
import '@lumino/default-theme/style/index.css';
import PrimeVue  from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ContextMenu from "primevue/contextmenu";

const app = createApp(App)

app.use(PrimeVue,{
    theme:{
        preset:Aura,
    }
})
app.component("ContextMenu", ContextMenu);
app.mount("#app");
