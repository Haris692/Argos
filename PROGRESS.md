# Argos — Suivi d'avancement

## Session du 13/07/2026 (suite) — Phase 3

### Fait
- Phase 2 validée par Haris.
- Écran « Rapports » : liste des rapports par client/mois avec statut
  (brouillon / généré / envoyé), création via sélection client + mois.
- Éditeur de rapport (`/rapports/:clientId/:month`) : constats Defender
  (alertes revues/traitées), conformité Intune (postes conformes/total,
  préremplissage du total depuis l'inventaire), mises à jour, comptes et accès,
  recommandations. Upsert sur (client, mois).
- Agrégation automatique des tickets du mois (temps réel par ticket, repris
  dans le PDF).
- Génération PDF côté navigateur (jsPDF, chargé à la demande — code-split) :
  rapport valorisant avec sections sécurité / conformité / interventions /
  recommandations, pied de page paginé.
- Boutons « Générer le PDF » (horodate generated_at) et « Marquer comme
  envoyé » (sent_at — condition de facturabilité de l'abonnement).

### Prochaine étape
- Validation Phase 3 par Haris, puis Phase 4 : bon à facturer (CSV + PDF).

## Session du 13/07/2026 (suite) — Phase 2

### Fait
- Phase 1 validée par Haris (connexion OK, clients seedés visibles).
- Moteur de calcul du facturable : `src/lib/billing.ts`, fonction pure
  `computeTicketBilling` — minimum par ticket et par jour, arrondi à la tranche
  supérieure, répartition pro rata normal / hors horaires, tarifs venant du client.
- 15 tests Vitest (`src/lib/billing.test.ts`) couvrant tous les cas exigés par la
  spec (10→30, 35→45, 46→60, 2×10 min même jour→30, 20h→majoré, non facturable→0 €)
  plus jours séparés, tarifs personnalisés, `isAfterHours`. Tests ajoutés au CI.
- CRUD tickets : liste filtrable (client/statut/priorité via URL), fiche ticket,
  changement de statut avec résolution obligatoire (dialog + contrainte DB).
- Saisie de temps : formulaire rapide (chips 15/30/45/60 min, hors-horaires
  auto-calculé surchargeable) + chrono persistant (localStorage) depuis la fiche.
- Panneau « Facturable » en temps réel avec détail par jour
  (« 20 min réelles, 30 min facturées, minimum appliqué »).

### Prochaine étape
- Validation Phase 2 par Haris, puis Phase 3 : rapport mensuel + PDF.

## Session du 13/07/2026

### Fait
- Scaffold Vite + React + TypeScript + Tailwind v4 + shadcn/ui, alias `@/`, base `/Argos/`.
- Schéma Supabase (`supabase/migrations/0001_initial_schema.sql`) : 8 tables de la spec,
  RLS `auth.uid() = owner_id` partout, référence ticket auto (TKT-AAAA-NNNN),
  résolution obligatoire pour clore, tarifs stockés par client.
- Seed (`supabase/seed/0001_seed_clients.sql`) : LSM Logistics (2 postes), Eurofret (3 postes).
- Auth email/mot de passe (compte unique), layout protégé.
- Écrans : login, tableau de bord minimal, liste clients, fiche client avec onglets
  Vue d'ensemble / Contacts / Postes / Licences (CRUD complet).
- Repo GitHub `Haris692/Argos` (passé en public pour Pages), secrets
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, workflow Actions.
- **Déployé et en ligne : https://haris692.github.io/Argos/**

### Reste à faire (actions manuelles Haris)
- [ ] Exécuter la migration SQL dans le SQL editor Supabase.
- [ ] Désactiver l'inscription publique (Authentication → Sign In/Providers).
- [ ] Créer l'utilisateur unique (Authentication → Users → Add user).
- [ ] Optionnel : exécuter le seed avec l'UUID de l'utilisateur.

### Prochaine étape
- Validation de la Phase 1 par Haris, puis Phase 2 : tickets, saisie de temps,
  moteur de calcul du facturable (fonction pure + tests Vitest).

### Notes
- Spec demandait React 18 ; le scaffold est en React 19 (aucun impact).
- Repo passé de privé à public le 13/07/2026 (Pages indisponible en privé sur plan gratuit).
