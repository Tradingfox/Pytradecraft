#!/bin/bash

# Script de test du webhook TradingView
# Usage: ./scripts/test-webhook.sh [WEBHOOK_ID]

WEBHOOK_ID=$1

if [ -z "$WEBHOOK_ID" ]; then
    echo "❌ Erreur : ID webhook manquant"
    echo ""
    echo "Usage: ./scripts/test-webhook.sh WEBHOOK_ID"
    echo ""
    echo "Exemple: ./scripts/test-webhook.sh abc123xyz"
    echo ""
    echo "💡 Obtenez votre ID webhook en créant une source de signal dans l'application"
    exit 1
fi

WEBHOOK_URL="https://dkputslvotjdxdtcwzso.supabase.co/functions/v1/receive-tradingview-signal?id=$WEBHOOK_ID"

echo "🧪 Test du webhook TradingView..."
echo "📡 URL : $WEBHOOK_URL"
echo ""

# Test 1 : Signal d'achat simple
echo "📤 Test 1 : Signal d'achat simple"
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "BTCUSD",
    "action": "buy",
    "price": 50000,
    "quantity": 1,
    "timeframe": "5"
  }')

echo "📥 Réponse :"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 2 : Signal avec SL/TP
echo "📤 Test 2 : Signal avec Stop Loss et Take Profit"
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "ES",
    "action": "sell",
    "price": 4500.50,
    "quantity": 2,
    "stop_loss": 4520.00,
    "take_profit": 4470.00,
    "timeframe": "15"
  }')

echo "📥 Réponse :"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3 : Signal de stratégie avec multiple TPs
echo "📤 Test 3 : Signal avec multiples Take Profits"
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NQ",
    "exchange": "CME",
    "interval": "5",
    "close": 15000.25,
    "strategy.order.action": "buy",
    "strategy.order.contracts": 3,
    "strategy.order.price": 15000.25,
    "strategy.position_size": 3,
    "stop_loss": 14950.00,
    "tp1": 15050.00,
    "tp2": 15100.00,
    "tp3": 15150.00
  }')

echo "📥 Réponse :"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

echo "✅ Tests terminés !"
echo ""
echo "📝 Vérifiez dans l'application (vue Signals) que les 3 signaux ont été reçus."
echo ""
