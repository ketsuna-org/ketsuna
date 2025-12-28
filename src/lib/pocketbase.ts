import Pocketbase, { LocalAuthStore } from "pocketbase";

const authStore = new LocalAuthStore("ketsuna:auth");

const initedDb = new Pocketbase("https://api.ketsuna.com", authStore);

// Désactiver l'auto-annulation globale pour éviter les erreurs "autocancelled" 
// lors des chargements rapides ou concurrents de données.
initedDb.autoCancellation(false);

export default initedDb;