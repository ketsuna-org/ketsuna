import Pocketbase, { LocalAuthStore } from "pocketbase";

const authStore = new LocalAuthStore("ketsuna:auth");

const initedDb = new Pocketbase("https://api.ketsuna.com", authStore);
export default initedDb;