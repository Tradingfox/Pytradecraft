#!/bin/bash

# Script de déploiement du webhook TradingView sur Supabase
# Usage: ./scripts/deploy-webhook.sh

echo "🚀 Déploiement du webhook TradingView sur Supabase..."
echo ""

# Vérifier si Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo ""
    echo "📦 Installation de Supabase CLI..."
    npm install -g supabase
    echo "✅ Supabase CLI installé !"
    echo ""
fi

# Vérifier si le projet est lié
if [ ! -f ".supabase/config.toml" ]; then
    echo "🔗 Liaison au projet Supabase..."
    supabase link --project-ref dkputslvotjdxdtcwzso
    echo ""
fi

# Déployer la fonction
echo "📤 Déploiement de la fonction receive-tradingview-signal..."
supabase functions deploy receive-tradingview-signal

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "🔗 Votre webhook est disponible à :"
echo "   https://dkputslvotjdxdtcwzso.supabase.co/functions/v1/receive-tradingview-signal"
echo ""
echo "📝 Prochaines étapes :"
echo "   1. Créez une source de signal dans l'application"
echo "   2. Copiez l'URL webhook complète (avec ?id=...)"
echo "   3. Configurez l'alerte dans TradingView"
echo ""
