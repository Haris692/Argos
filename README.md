# Argos

Outil interne de gestion clients, tickets et facturation pour consultant IT indépendant.
Spécification complète : [SPEC-Argos.md](./SPEC-Argos.md).

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (PostgreSQL + Auth + API REST, région EU) — seul backend
- Déploiement statique sur GitHub Pages sous `/argos/`

## Démarrage local

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs Supabase
npm run dev
```

## Mise en place Supabase (une seule fois)

1. Créer le projet Supabase (région EU).
2. Exécuter `supabase/migrations/0001_initial_schema.sql` dans le SQL editor
   (tables + RLS `auth.uid() = owner_id` sur toutes les tables).
3. Désactiver l'inscription publique : Authentication → Sign In / Providers →
   décocher « Allow new users to sign up ».
4. Créer l'unique utilisateur : Authentication → Users → Add user (email + mot de passe).
5. Optionnel : exécuter `supabase/seed/0001_seed_clients.sql` en remplaçant
   `<OWNER_ID>` par l'UUID de l'utilisateur créé (clients LSM Logistics et Eurofret).

## Déploiement

GitHub Actions (`.github/workflows/deploy.yml`) build et publie sur GitHub Pages
à chaque push sur `main`. Secrets à créer dans le repo :
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
Dans Settings → Pages, choisir « GitHub Actions » comme source.

## Sécurité

- La clé `anon`/publishable est publique par conception ; la protection des
  données repose sur le Row Level Security, activé sur toutes les tables.
- Jamais de `service_role key` côté front.
- `.env` est ignoré par git ; les variables sont injectées au build via les
  secrets GitHub Actions.

## Roadmap

- [x] Phase 1 — Socle : Vite + Pages + schéma RLS + auth + CRUD clients/contacts/postes/licences
- [ ] Phase 2 — Tickets et saisie de temps + moteur de calcul du facturable (testé Vitest)
- [ ] Phase 3 — Rapport mensuel PDF
- [ ] Phase 4 — Bon à facturer (CSV + PDF)
- [ ] Phase 5 — Tableau de bord complet, recherche, mode hors ligne, statistiques
