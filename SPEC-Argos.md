# Argos — Outil de gestion clients, tickets et facturation

Spec fonctionnelle et technique. À passer à Claude Code comme document de référence du projet.

---

## 1. Contexte

Je suis consultant IT et sécurité indépendant à Lyon. Je gère l'infrastructure Microsoft 365 et la sécurité de très petites entreprises (2 à 5 postes chacune). Aujourd'hui : 2 clients, environ 5 postes au total. Objectif à 2 ans : 10 à 15 clients.

Je n'ai aucun outil. Les demandes arrivent par mail et par téléphone, je n'ai aucune trace du temps passé, et je facture au doigt mouillé. C'est ce que cet outil doit régler.

**Argos doit répondre à trois questions, et rien d'autre :**

1. Qu'est-ce que ce client possède ? (postes, licences, comptes, tenant)
2. Qu'est-ce que j'ai fait pour lui ce mois-ci, et combien de temps ça m'a pris ?
3. Combien je dois lui facturer, et comment je le lui prouve ?

## 2. Modèle économique à implémenter

C'est la logique métier centrale, elle doit être respectée à la lettre.

**Abonnement supervision : 39 € HT / mois / client.**
Couvre la revue des alertes Defender, la vérification des politiques Intune et des mises à jour, le contrôle des comptes et des accès, et surtout **un rapport écrit envoyé chaque mois au client**. C'est la contrepartie visible de l'abonnement : sans rapport, la ligne n'est pas facturable.

**Tout le reste au temps passé : 30 € HT / heure.**
Support, administration, projets, déploiements. Tarif unique.

**Règles de calcul, à implémenter précisément :**

- Minimum facturable : **30 minutes par intervention**.
- Au-delà du minimum : arrondi **à la tranche de 15 minutes supérieure**.
- L'arrondi s'applique **au niveau du ticket et par journée**, pas par saisie. Si je saisis 10 min le matin et 10 min l'après-midi sur le même ticket le même jour, cela fait 20 min réelles, donc 30 min facturées (le minimum), et non deux fois 30 min.
- Hors horaires ouvrés (lundi au vendredi, 9h00-18h00) ou en urgence : **majoration de 50 %**, soit 45 € HT/h. Le taux est déterminé par l'heure de début de l'intervention, avec possibilité de forcer manuellement le flag « urgence ».
- Les taux, le minimum, la tranche et le prix de l'abonnement sont **stockés en base par client**, jamais en constantes dans le code. Ils changeront.

**Point critique, à respecter absolument : Argos ne génère PAS de factures.**
La réforme française de la facturation électronique impose, à partir de septembre 2027 pour les micro-entreprises, l'émission via une plateforme agréée dans un format structuré. Un générateur de PDF maison serait non conforme et à jeter. Argos produit un **« bon à facturer »** mensuel (récapitulatif détaillé, exportable en CSV et PDF) que je saisis ensuite dans mon outil de facturation conforme. Ne code pas de numérotation de factures, pas de mentions légales fiscales, pas de suivi de TVA.

## 3. Architecture et stack

**Contrainte imposée : application 100 % statique, déployée sur GitHub Pages. Aucun serveur applicatif, aucun backend à héberger.**

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** comme unique backend : base PostgreSQL, authentification, API REST auto-générée, appelée directement depuis le navigateur via `@supabase/supabase-js`. Région d'hébergement **EU** (données de clients professionnels).
- **Déploiement** : GitHub Actions qui build et publie sur GitHub Pages. Routeur configuré pour un sous-chemin (`/argos/`), avec fallback SPA (copie de `index.html` en `404.html`).
- **PDF** : génération **côté navigateur** (rapport mensuel et bon à facturer), via `jsPDF` + `html2canvas` ou `react-pdf`.
- **Langue** : toute l'interface est en français. Le code, les noms de variables et les commentaires sont en anglais.

### Sécurité, à traiter dès le premier commit

- La clé `anon` de Supabase est publique par conception, elle peut figurer dans le bundle. **Ce qui protège les données, c'est le Row Level Security.**
- **RLS activé sur toutes les tables, sans exception**, avec des politiques du type `auth.uid() = owner_id`. Une table sans RLS est une base ouverte sur internet.
- Authentification Supabase par email et mot de passe, **un seul compte** (le mien). Inscription publique désactivée côté Supabase.
- Jamais de `service_role key` dans le front. Jamais.
- `.env` dans `.gitignore` et `.env.example` commité dès le premier commit. Variables injectées au build via les secrets GitHub Actions.
- Le repo peut rester privé (GitHub Pages sur repo privé nécessite un plan GitHub Pro).

### Mode hors ligne

L'application doit rester utilisable sans réseau pour la saisie de temps (locaux clients parfois sans couverture). File d'attente locale des saisies en IndexedDB, synchronisée avec Supabase au retour du réseau. Ne pas complexifier au-delà : dernière écriture gagnante, je suis seul utilisateur.

## 4. Modèle de données

Toutes les tables portent une colonne `owner_id` (uuid, référence `auth.users`), utilisée par les politiques RLS.

```
clients
  id, owner_id, name, siret, address
  tenant_id (M365), tenant_domain
  subscription_active (bool), subscription_price (défaut 39)
  hourly_rate (défaut 30), after_hours_multiplier (défaut 1.5)
  billing_minimum_minutes (défaut 30), billing_increment_minutes (défaut 15)
  notes, created_at, archived_at

contacts
  id, owner_id, client_id, first_name, last_name, email, phone, role
  is_primary (bool)

devices
  id, owner_id, client_id, hostname, serial_number, model
  os, purchase_date, warranty_end
  assigned_contact_id (nullable)
  intune_enrolled (bool), defender_onboarded (bool)
  status (active | stock | retired)
  notes

licenses
  id, owner_id, client_id, product (ex: "M365 Business Premium")
  quantity, assigned_contact_id (nullable)
  renewal_date, monthly_cost (information seule : aucune marge, aucune refacturation)

tickets
  id, owner_id, reference (auto: TKT-2026-0001)
  client_id, contact_id (demandeur)
  title, description
  category (support | admin | securite | projet | supervision)
  priority (bloquant | normal | bas)
  status (nouveau | en_cours | attente_client | resolu | ferme)
  billable (bool, défaut true)
  created_at, resolved_at, closed_at
  resolution (texte, obligatoire pour passer à resolu)

time_entries
  id, owner_id, ticket_id
  date, start_time, duration_minutes (temps réel saisi)
  after_hours (bool, calculé automatiquement, surchargeable)
  description (ce que j'ai fait)
  created_at

monthly_reports
  id, owner_id, client_id, month (YYYY-MM)
  defender_alerts_reviewed, defender_alerts_resolved
  devices_compliant, devices_total
  updates_status (texte)
  accounts_reviewed (texte)
  recommendations (texte)
  generated_at, sent_at

billing_summaries   // le "bon à facturer", PAS une facture
  id, owner_id, client_id, month (YYYY-MM)
  subscription_amount
  billable_minutes, billable_amount
  after_hours_minutes, after_hours_amount
  total_amount
  lines (jsonb : détail par ticket)
  status (brouillon | valide | facture_externe)
  exported_at
```

## 5. Écrans

**Tableau de bord.** Tickets ouverts par client, heures non encore facturées du mois en cours, montant prévisionnel du mois, rapports mensuels non générés, alerte si une résolution manque avant clôture.

**Clients.** Liste, puis fiche client avec onglets : Vue d'ensemble (contrat, tarifs appliqués, chiffres du mois), Postes, Licences, Contacts, Tickets, Rapports, Facturation.

**Tickets.** Liste filtrable (client, statut, priorité, période). Fiche ticket avec le fil des saisies de temps, un bouton de saisie rapide, et le montant facturable calculé en temps réel, avec le détail de l'arrondi affiché (« 20 min réelles, 30 min facturées, minimum appliqué »). Cette transparence est indispensable : c'est ce qui me permet de défendre une ligne de facture face au client.

**Saisie de temps.** Doit être quasi instantanée : deux clics maximum, et parfaitement utilisable sur mobile, parce que je saisirai souvent depuis mon téléphone juste après une intervention. C'est le point de vie ou de mort de l'outil : si la saisie est pénible, je ne l'utiliserai pas et tout le reste devient inutile. Prévoir un chrono démarrable depuis la fiche ticket, et une saisie manuelle rapide (durée + description).

**Rapport mensuel.** Formulaire de saisie des constats de supervision, avec récupération automatique des tickets du mois, puis génération d'un PDF client. Le rapport doit être valorisant : ce que j'ai surveillé, ce que j'ai traité, ce qui va bien, ce qui est à améliorer. C'est le livrable qui justifie l'abonnement.

**Bon à facturer.** Par client et par mois : abonnement + lignes de temps passé (par ticket), total. Export CSV et PDF. Bouton « marquer comme facturé ».

## 6. Roadmap

Livre par phases, chacune fonctionnelle et testable. Ne passe pas à la suivante avant que je valide.

**Phase 1 — Le socle.** Projet Vite, déploiement GitHub Pages fonctionnel dès le départ (ne le garde pas pour la fin), schéma Supabase avec les politiques RLS, authentification, CRUD clients / contacts / postes / licences, données de départ avec mes deux clients réels (LSM Logistics, 2 postes ; Eurofret, 3 postes).

**Phase 2 — Tickets et temps.** CRUD tickets, saisie de temps, moteur de calcul du facturable avec les règles d'arrondi. **Le moteur de calcul est une fonction pure, isolée, couverte par des tests unitaires (Vitest).** C'est la seule partie du code où un bug me coûte de l'argent ou ma crédibilité. Cas à couvrir au minimum : 10 min → 30 min ; 35 min → 45 min ; 46 min → 60 min ; deux saisies de 10 min le même jour sur le même ticket → 30 min ; intervention démarrée à 20h → taux majoré ; ticket non facturable → 0 €.

**Phase 3 — Rapport mensuel.** Formulaire, agrégation des tickets du mois, génération PDF. C'est le module qui rend l'abonnement défendable, il ne doit pas être repoussé.

**Phase 4 — Bon à facturer.** Agrégation mensuelle, exports CSV et PDF.

**Phase 5 — Confort.** Tableau de bord, recherche, filtres, mode hors ligne, statistiques (temps par client, taux horaire effectif réellement obtenu).

## 7. Design

Interface d'outil interne, dense et rapide, pas une landing page. Priorité à la lisibilité des chiffres et à la vitesse de saisie. Pas d'animations décoratives. Tout doit rester pleinement utilisable sur mobile.

## 8. Ce que tu ne dois PAS construire

- Un générateur de factures légales (voir section 2).
- Un portail client. Le client ne se connecte pas, il reçoit un PDF.
- Du multi-utilisateurs, des rôles, des permissions, une page d'inscription.
- Du RMM : pas de collecte d'inventaire automatique, pas d'agent, pas d'API Microsoft Graph en phase 1. Intune et Defender restent les sources de vérité, je saisis les constats à la main dans le rapport. Une intégration Graph pourra venir plus tard, ce n'est pas le sujet.
- De la gestion de marge sur les licences : le client achète en direct, je ne revends rien.
- Un backend Node, Express ou Next : l'application reste statique.
