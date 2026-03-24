#!/bin/bash

# Script pour appliquer les migrations Supabase dans l'ordre recommandé.
# Prérequis : Supabase CLI installée et projet lié (supabase link --project-ref <id>).

MIGRATIONS_DIR="supabase/migrations"

# Liste ordonnée des migrations basée sur le README.md
MIGRATIONS=(
  "supabase-rls-salles.sql"
  "supabase-schema.sql"
  "supabase-migration-utilisateurs.sql"
  "supabase-migration-commune-id.sql"
  "supabase-migration-city-info.sql"
  "supabase-migration-city-info-logo.sql"
  "supabase-migration-rename-table.sql"
  "supabase-migration-gps.sql"
  "supabase-migration-signalements-city-id.sql"
  "supabase-migration-add-reponse.sql"
  "supabase-migration-add-archive-status.sql"
  "supabase-migration-signalements-user-id.sql"
  "supabase-migration-push-notifications.sql"
  "supabase-migration-notifications.sql"
  "supabase-rls-signalements.sql"
  "supabase-rls-reservations-salles.sql"
  "supabase-rls-reservations.sql"
  "supabase-rls-municipal-info.sql"
  "supabase-fix-city-info-table.sql"
  "supabase-fix-city-info-rls.sql"
  "supabase-fix-missing-salle-id.sql"
  "supabase-fix-notifications-rls.sql"
  "supabase-migration-municipal-info-event-date.sql"
  "supabase-migration-propositions.sql"
  "supabase-migration-proposition-votes-email.sql"
  "supabase-migration-push-tokens-email.sql"
  "supabase-migration-utilisateur-is-active.sql"
  "supabase-migrate-room-name-to-salle-id.sql"
  "supabase-migrate-room-name-to-salle-id-v2.sql"
  "supabase-migrate-reservations-salles-to-reservations.sql"
  "supabase-rename-reservations-to-reservations-salles.sql"
  "supabase-drop-reservations-salles.sql"
  "supabase-migration.sql"
)

echo "🚀 Début de l'application des migrations..."

# Vérifier si on est lié à un projet
if ! supabase projects list &> /dev/null; then
  echo "❌ Erreur : Vous n'êtes pas connecté ou aucun projet n'est lié."
  echo "Utilisez 'supabase login' puis 'supabase link --project-ref <votre-id-projet>'."
  exit 1
fi

echo "🚀 Préparation du renommage des migrations..."

# Étape 1 : Supprimer les anciens préfixes pour repartir sur une base propre
for f in "$MIGRATIONS_DIR"/*.sql; do
  if [[ $(basename "$f") =~ ^20260323142000[0-9]*_ ]]; then
    base_name=$(basename "$f" | sed -E 's/^20260323142000[0-9]*_//')
    if [ "$base_name" != "README.md" ]; then
       mv "$f" "$MIGRATIONS_DIR/$base_name"
    fi
  fi
done

TIMESTAMP="20260323142000"
COUNT=1

for migration in "${MIGRATIONS[@]}"; do
  FILE_PATH="$MIGRATIONS_DIR/$migration"
  if [ -f "$FILE_PATH" ]; then
    # Formatage du compteur avec des zéros à gauche (ex: 01, 02...)
    SUFFIX=$(printf "%03d" $COUNT)
    NEW_NAME="${TIMESTAMP}${SUFFIX}_${migration}"
    echo "🔄 Renommage de $migration en $NEW_NAME..."
    mv "$FILE_PATH" "$MIGRATIONS_DIR/$NEW_NAME"
    ((COUNT++))
  else
    echo "⚠️ Warning : Fichier $migration non trouvé dans $MIGRATIONS_DIR. Passage au suivant."
  fi
done

echo "✅ Renommage terminé. Lancement de la synchronisation vers la production..."
echo "💡 Note : Vous devrez peut-être saisir votre mot de passe de base de données."

# Lancement de la commande standard Supabase pour pousser les migrations
supabase db push

if [ $? -eq 0 ]; then
  echo "🎉 Toutes les migrations ont été poussées avec succès sur la production !"
else
  echo "❌ Échec de 'supabase db push'. Vérifiez les erreurs ci-dessus."
  exit 1
fi
