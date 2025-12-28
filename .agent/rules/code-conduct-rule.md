---
trigger: always_on
---

## Règle de Code Conduct : Architecture Composants & Pages

### Structure des composants

- Tous les composants réutilisables doivent être créés dans le dossier `src/lib/components` (ou `src/components` si préféré).  
- Les composants doivent être indépendants des pages et ne jamais être placés dans des sous-dossiers spécifiques aux pages (ex: `components/page-compagnie` interdit).  
- Exemple : un composant `Card.svelte` doit être dans `src/lib/components/Card.svelte` et non dans `src/lib/components/page-compagnie/Card.svelte`.  
- Les composants doivent être exportés via `index.js` ou `+page.svelte` si nécessaire pour faciliter l’import.

### Création et gestion des pages

- Chaque page doit être créée dans le dossier `src/routes` (ou équivalent selon ta configuration SvelteKit).  
- Les pages doivent se limiter à la logique de routage, d’accès aux données (fetch, CRUD), et à l’affichage des composants.  
- Les pages doivent utiliser les composants existants autant que possible et ne pas dupliquer le code.  
- Exemple : pour une page de gestion des compagnies, utiliser `Card.svelte` pour afficher chaque compagnie.

### CRUD et composants

- Toutes les pages CRUD doivent utiliser des composants spécifiques pour chaque action :  
  - `CreateForm.svelte` : pour la création.  
  - `UpdateForm.svelte` : pour la modification.  
  - `DeleteConfirmation.svelte` : pour la suppression (jamais de suppression directe sans confirmation).  
- Les composants de formulaire et confirmation doivent être réutilisables et paramétrables (props).

### Accès aux pages via query-parameters

- L’accès aux pages se fait via les query-parameters de l’URL :  
  - `/compagnie?id=xxxx&state=update/view/delete`  
  - La page doit lire ces paramètres et afficher le composant approprié (`UpdateForm`, `ViewCard`, `DeleteConfirmation`).  
  - Exemple :  
    - `state=view` → afficher un composant `CompanyView` (lecture seule).  
    - `state=update` → afficher `UpdateForm` avec les données pré-remplies.  
    - `state=delete` → afficher `DeleteConfirmation` (avec un bouton de confirmation avant envoi de la requête).

### Exemple de structure

```
src/
├── lib/
│   └── components/
│       ├── Card.svelte
│       ├── CreateForm.svelte
│       ├── UpdateForm.svelte
│       └── DeleteConfirmation.svelte
├── routes/
│   └── compagnie/
│       └── +page.svelte
```

### Bonnes pratiques

- Toujours documenter les props des composants dans un commentaire JSDoc.  
- Préférer les composants de base (Card, Form, Button) pour garantir la cohérence visuelle et fonctionnelle.  
- Les pages ne doivent pas contenir de logique métier complexe : celle-ci doit être dans les composants ou dans des services.