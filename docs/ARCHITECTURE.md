# Architecture technique

## Vue d'ensemble

```
Navigateur (app.html)
        │
        │  Supabase JS SDK v2 (CDN)
        ▼
Supabase (eu-north-1)
  ├── PostgreSQL (données métier)
  ├── Auth (sessions utilisateurs)
  └── RLS (Row Level Security)
```

L'application est volontairement une **SPA sans framework**, sans build step, sans Node.js.  
Tout est dans un seul fichier `app.html` pour maximiser la simplicité de déploiement et de maintenance.

---

## Pourquoi ce choix architectural

| Contrainte | Décision |
|------------|----------|
| Hébergement gratuit (GitHub Pages) | Pas de serveur — fichiers statiques uniquement |
| Pas de pipeline de build | Tout en vanilla JS/CSS, pas de transpilation |
| Maintenance par non-développeurs possible | Un seul fichier à modifier, pas de `node_modules` |
| Multi-utilisateurs avec données partagées | Supabase comme backend-as-a-service |
| Déploiement instantané | Push git → déploiement automatique via GitHub Actions |

---

## Structure de `app.html`

Le fichier suit une structure linéaire en 4 zones :

```
app.html
├── <head>          Métadonnées, imports (Inter font, Supabase CDN)
├── <style>         Tout le CSS (~230 lignes)
├── <body> static   Spinner de chargement + 5 modals (formulaires)
└── <script>        Toute la logique JS (~740 lignes)
    ├── CONFIG      URL et clé Supabase
    ├── STATE       Variables globales (currentUser, S.*, editId.*)
    ├── INIT        Vérification de session au démarrage
    ├── AUTH        showLogin(), doLogin(), doLogout(), doGoogleLogin()
    ├── APP SHELL   showApp() — injection du HTML principal
    ├── DATA        loadAll(), loadClients(), loadArticles()…
    ├── NAV         goTab() — navigation entre modules
    ├── HELPERS     fmt(), toast(), nextNumero(), fillClientSelect()…
    ├── BADGES      bTypeClient(), bStatutInterv()… (rendu HTML)
    ├── MODULES     renderDashboard(), renderClients()… + CRUD complet
    └── START       init()
```

---

## Système de design (V2)

Variables CSS définies dans `:root` :

```css
--bg: #F7F7F5        /* Fond principal (warm off-white, style Notion) */
--surface: #FFFFFF   /* Cartes, modals */
--sidebar: #191919   /* Sidebar sombre */
--text: #1A1A1A      /* Texte principal */
--muted: #787774     /* Texte secondaire */
--border: #E9E9E7    /* Bordures légères */
--blue: #2383E2      /* Couleur principale / actions */
--green: #0F9D58     /* Succès, payé, terminé */
--yellow: #D97706    /* Avertissement, en cours */
--red: #E03E3E       /* Erreur, retard, suppression */
```

Police : **Inter** (Google Fonts, weights 400/500/600/700/800)

---

## Gestion de l'état

L'état applicatif est stocké dans des variables globales JavaScript :

```javascript
let currentUser = null;          // Objet session Supabase
let S = {                        // Cache des données chargées
  clients: [],
  articles: [],
  categories: [],
  devis: [],
  interventions: [],
  factures: []
};
let editId = {                   // ID de l'entité en cours d'édition
  client, article, devis, interv, facture
};
let dLignes = [], fLignes = [];  // Lignes devis / facture en cours
let calDate = new Date();        // Date courante du calendrier
let calViewMode = 'list';        // 'list' | 'calendar'
```

Pas de state management externe — le modèle est `load → render → user action → save → reload → render`.

---

## Flux d'authentification

```
Chargement de la page
        │
        ▼
sb.auth.getSession()
        │
   ┌────┴────┐
   │ session │  ──────────▶  showApp()  ──▶  loadAll()  ──▶  renderDashboard()
   └────┬────┘
        │ pas de session
        ▼
   showLogin()
        │
   user soumet email + password
        │
        ▼
sb.auth.signInWithPassword()
        │
        ▼
onAuthStateChange('SIGNED_IN')  ──▶  showApp()
```

---

## Numérotation automatique des documents

| Type | Format | Exemple |
|------|--------|---------|
| Interventions | `INT-YYYY-NNN` | `INT-2025-007` |
| Devis | `DEV-YYYY-NNN` | `DEV-2025-003` |
| Factures | `FAC-YYYY-NNN` | `FAC-2025-012` |
| Articles | `ART-NNNN` | `ART-0023` |

Le compteur est calculé via un `COUNT` sur la table avec `LIKE 'PREFIX%'` — simple et sans séquence SQL dédiée.

---

## TVA UAE

Taux fixe de **5%** appliqué sur toutes les lignes de devis et factures.  
Calcul : `HT × 1.05 = TTC`  
Les colonnes `montant_ht`, `montant_tva`, `montant_ttc` sont calculées à l'insertion/modification.

---

## Responsive

- **≥ 701px** : sidebar visible, layout côte-à-côte
- **≤ 700px** : sidebar masquée, bottom nav fixe (6 boutons)
- Modals : drawer depuis le bas sur mobile, centered dialog sur desktop

---

## Limites connues et évolutions prévues

| Limite actuelle | Solution prévue |
|-----------------|-----------------|
| Tout dans un fichier | Acceptable tant que < ~1500 lignes |
| Pas de rôles (admin/tech/compta) | Prévu V3 — table `profils.role` existe déjà |
| Pas de PDF | Génération côté client avec `jsPDF` (V3) |
| Pas de module RH | Prévu V3 — employés, congés, véhicules |
| Pas de notifications push | Hors scope pour l'instant |
