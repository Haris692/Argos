# Argos — Suivi d'avancement

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
