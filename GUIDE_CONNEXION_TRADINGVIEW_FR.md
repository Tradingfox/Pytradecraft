# 🔗 Guide de Connexion TradingView - Système de Trading Automatisé

## Vue d'Ensemble

Ce guide vous explique comment connecter vos stratégies et alertes TradingView à votre plateforme de trading automatisé pour recevoir et exécuter automatiquement les signaux de trading.

---

## 📋 Prérequis

### 1. Configuration Supabase
✅ **Votre configuration Supabase est déjà en place** :
- URL Supabase : `https://dkputslvotjdxdtcwzso.supabase.co`
- Clé Anon configurée dans `.env`

### 2. Déploiement de la Fonction Edge (Webhook)

**Première étape : Déployer la fonction webhook**

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref dkputslvotjdxdtcwzso

# Déployer la fonction webhook TradingView
supabase functions deploy receive-tradingview-signal
```

### 3. Lancer l'Application

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

---

## 🎯 Étapes pour Établir la Connexion

### Étape 1 : Créer une Source de Signal dans l'Application

1. **Ouvrez l'application** dans votre navigateur (généralement `http://localhost:5173`)
2. **Naviguez vers la vue "Signals"** (Signaux)
3. **Cliquez sur "Add Signal Source"** (Ajouter une source de signal)
4. **Sélectionnez "TradingView"** comme type de source
5. **Configurez la source** :
   - **Nom** : Par exemple "ES 5min Strategy" ou "BTC Scalping"
   - **Description** : (Optionnel) Notes sur la stratégie
6. **Cliquez sur "Create"**

**Vous obtiendrez une URL webhook unique** :
```
https://dkputslvotjdxdtcwzso.supabase.co/functions/v1/receive-tradingview-signal?id=abc123xyz
```

⚠️ **IMPORTANT** : Gardez cette URL secrète ! Toute personne ayant cette URL peut envoyer des signaux à votre compte.

---

### Étape 2 : Créer une Stratégie ou Indicateur dans TradingView

#### Option A : Indicateur Simple avec Alertes

```pine
//@version=5
indicator("Signal Trading Automatique", overlay=true)

// Paramètres
fastPeriod = input.int(10, "Période MA Rapide")
slowPeriod = input.int(30, "Période MA Lente")
quantity = input.int(1, "Quantité par Signal")

// Calcul des moyennes mobiles
fastMA = ta.sma(close, fastPeriod)
slowMA = ta.sma(slowPeriod)

// Signaux
buySignal = ta.crossover(fastMA, slowMA)
sellSignal = ta.crossunder(fastMA, slowMA)

// Affichage
plotshape(buySignal, "Buy", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(sellSignal, "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)

// Alertes
if buySignal
    alert('{"action": "buy", "ticker": "{{ticker}}", "price": ' + str.tostring(close) + ', "quantity": ' + str.tostring(quantity) + ', "timeframe": "{{interval}}"}', alert.freq_once_per_bar)

if sellSignal
    alert('{"action": "sell", "ticker": "{{ticker}}", "price": ' + str.tostring(close) + ', "quantity": ' + str.tostring(quantity) + ', "timeframe": "{{interval}}"}', alert.freq_once_per_bar)
```

#### Option B : Stratégie Complète avec SL/TP

```pine
//@version=5
strategy("Stratégie Trading Auto", overlay=true)

// Paramètres
stopLossPercent = input.float(2.0, "Stop Loss %")
takeProfitPercent = input.float(4.0, "Take Profit %")
quantity = input.int(1, "Quantité")

// Logique de stratégie
fastMA = ta.sma(close, 10)
slowMA = ta.sma(close, 30)

// Entrées
if ta.crossover(fastMA, slowMA)
    strategy.entry("Long", strategy.long, qty=quantity)

if ta.crossunder(fastMA, slowMA)
    strategy.entry("Short", strategy.short, qty=quantity)

// Calcul SL/TP
longSL = strategy.position_avg_price * (1 - stopLossPercent / 100)
longTP = strategy.position_avg_price * (1 + takeProfitPercent / 100)
shortSL = strategy.position_avg_price * (1 + stopLossPercent / 100)
shortTP = strategy.position_avg_price * (1 - takeProfitPercent / 100)

// Sorties
if strategy.position_size > 0
    strategy.exit("Exit Long", "Long", stop=longSL, limit=longTP)

if strategy.position_size < 0
    strategy.exit("Exit Short", "Short", stop=shortSL, limit=shortTP)
```

#### Option C : Stratégie Avancée avec Plusieurs Take Profits

```pine
//@version=5
strategy("Stratégie Multi-TP", overlay=true)

// Paramètres
positionSize = input.int(3, "Taille Position")
stopLossPercent = input.float(2.0, "Stop Loss %")

// Logique (exemple avec RSI)
buyCondition = ta.crossover(ta.rsi(close, 14), 30)
sellCondition = ta.crossunder(ta.rsi(close, 14), 70)

if buyCondition
    strategy.entry("Long", strategy.long, qty=positionSize)

if sellCondition
    strategy.close("Long")

// Calcul des niveaux
entryPrice = strategy.position_avg_price
stopLoss = entryPrice * (1 - stopLossPercent / 100)
tp1 = entryPrice * 1.015  // +1.5%
tp2 = entryPrice * 1.030  // +3.0%
tp3 = entryPrice * 1.050  // +5.0%

// Message d'alerte JSON complet
alertMessage = '{\n' +
     '  "ticker": "{{ticker}}",\n' +
     '  "exchange": "{{exchange}}",\n' +
     '  "interval": "{{interval}}",\n' +
     '  "close": {{close}},\n' +
     '  "time": "{{time}}",\n' +
     '  "strategy.order.action": "{{strategy.order.action}}",\n' +
     '  "strategy.order.contracts": {{strategy.order.contracts}},\n' +
     '  "strategy.order.price": {{strategy.order.price}},\n' +
     '  "strategy.position_size": {{strategy.position_size}},\n' +
     '  "strategy.market_position": "{{strategy.market_position}}",\n' +
     '  "stop_loss": ' + str.tostring(stopLoss) + ',\n' +
     '  "tp1": ' + str.tostring(tp1) + ',\n' +
     '  "tp2": ' + str.tostring(tp2) + ',\n' +
     '  "tp3": ' + str.tostring(tp3) + '\n' +
     '}'

// Envoyer l'alerte
if strategy.position_size != 0
    alert(alertMessage, alert.freq_once_per_bar)
```

---

### Étape 3 : Configurer l'Alerte TradingView

1. **Ouvrez votre graphique** dans TradingView
2. **Ajoutez votre indicateur ou stratégie** au graphique
3. **Cliquez sur l'icône d'alerte** (horloge) ou appuyez sur `Alt + A`
4. **Configurez l'alerte** :

   **Condition** :
   - Pour un indicateur : Sélectionnez votre indicateur
   - Pour une stratégie : Sélectionnez "Alert() function calls only"

   **Options** :
   - **Nom de l'alerte** : Nom descriptif (ex: "ES 5min - Signaux Auto")
   - **Fréquence** :
     - ✅ **"Once Per Bar Close"** (Recommandé - évite les faux signaux)
     - ⚠️ "All" (Peut générer beaucoup de signaux)

   **URL Webhook** :
   ```
   Collez votre URL webhook obtenue à l'Étape 1
   ```

   **Message** :
   ```json
   {
     "ticker": "{{ticker}}",
     "exchange": "{{exchange}}",
     "interval": "{{interval}}",
     "close": {{close}},
     "time": "{{time}}",
     "strategy.order.action": "{{strategy.order.action}}",
     "strategy.order.contracts": {{strategy.order.contracts}},
     "strategy.order.price": {{strategy.order.price}},
     "strategy.position_size": {{strategy.position_size}},
     "strategy.market_position": "{{strategy.market_position}}"
   }
   ```

   💡 **Astuce** : Pour un indicateur simple, utilisez un message plus court :
   ```json
   {
     "ticker": "{{ticker}}",
     "action": "buy",
     "price": {{close}},
     "quantity": 1
   }
   ```

5. **Cliquez sur "Create"**

---

### Étape 4 : Tester la Connexion

#### Test 1 : Envoyer un Signal de Test

Dans l'application, utilisez l'utilitaire de test :

```typescript
// Ouvrir la console développeur (F12) et exécuter :
const webhookUrl = 'VOTRE_URL_WEBHOOK_ICI';

fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticker: "BTCUSD",
    action: "buy",
    price: 50000,
    quantity: 1,
    timeframe: "5"
  })
})
.then(res => res.json())
.then(data => console.log('Réponse:', data));
```

#### Test 2 : Vérifier dans l'Application

1. **Allez dans la vue "Signals"**
2. **Vérifiez la table "Recent Signals"** (Signaux Récents)
3. **Vous devriez voir** :
   - ✅ Votre signal de test
   - ✅ Status : "received" (reçu)
   - ✅ Données parsées correctement

#### Test 3 : Déclencher une Alerte Réelle

1. **Attendez qu'une condition de votre stratégie** soit remplie
2. **TradingView enverra automatiquement** l'alerte
3. **Vérifiez dans l'application** que le signal est reçu

---

### Étape 5 : Connecter un Compte de Trading

Pour que les signaux soient exécutés automatiquement :

1. **Naviguez vers la vue "Trading"**
2. **Cliquez sur "Connect Account"** (Connecter un compte)
3. **Sélectionnez votre broker** (TopstepX, etc.)
4. **Entrez vos identifiants** API
5. **Testez la connexion**

---

### Étape 6 : Configurer l'Exécution Automatique

#### Option A : Exécution Simple (Sans AI)

1. Dans la vue **"Signals"**
2. Activez **"Auto Execute"** (Exécution Automatique)
3. Sélectionnez les **comptes** qui doivent exécuter les signaux
4. Configurez les **filtres** (optionnel) :
   - Symboles autorisés/interdits
   - Timeframes
   - Limites de levier
   - Heures de trading

#### Option B : Exécution avec Interprétation AI (Recommandé)

1. **Configurez un LLM local** dans `.env` :
   ```env
   # Option 1: vLLM (Recommandé)
   VITE_LLM_ENDPOINT=http://localhost:8000/v1
   VITE_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct

   # Option 2: LM Studio
   # VITE_LLM_ENDPOINT=http://localhost:1234/v1
   # VITE_LLM_MODEL=qwen2.5-7b-instruct

   # Option 3: Ollama
   # VITE_LLM_ENDPOINT=http://localhost:11434/v1
   # VITE_LLM_MODEL=qwen2.5:7b
   ```

2. **Activez l'AI dans `.env`** :
   ```env
   VITE_ENABLE_AI_INTERPRETATION=true
   VITE_ENABLE_AUTO_EXECUTION=true
   ```

3. **Lancez votre LLM local** (exemple avec Ollama) :
   ```bash
   ollama pull qwen2.5:7b
   ollama serve
   ```

4. Dans l'application, activez **"AI Signal Executor"**

**Avantages de l'AI** :
- ✅ Validation intelligente des signaux
- ✅ Calcul automatique de la taille de position basé sur le risque
- ✅ Détection d'anomalies
- ✅ Scoring de confiance

---

## 🔍 Exemple de Flux Complet

```
1. TRADINGVIEW
   └─> Alerte déclenchée (MA crossover)

2. WEBHOOK SUPABASE
   └─> Reçoit le JSON
   └─> Parse et valide
   └─> Enregistre dans la DB

3. APPLICATION (Polling toutes les 5 secondes)
   └─> Détecte nouveau signal
   └─> Applique les filtres
   └─> [SI AI ACTIVÉE]
       └─> Interprétation LLM
       └─> Calcul taille position
       └─> Validation

4. EXÉCUTION
   └─> Crée l'ordre
   └─> Envoie au broker
   └─> Surveille l'exécution
   └─> Envoie notification
```

---

## 📊 Formats de Signal Supportés

Le système est très flexible et accepte de nombreux formats :

### Format Minimal
```json
{
  "ticker": "BTCUSD",
  "action": "buy",
  "quantity": 1
}
```

### Format Standard
```json
{
  "ticker": "ES",
  "action": "buy",
  "price": 4500.50,
  "quantity": 2,
  "stop_loss": 4480.00,
  "take_profit": 4540.00,
  "timeframe": "5"
}
```

### Format Complet avec Stratégie
```json
{
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
}
```

### Format avec Multiple Take Profits
```json
{
  "ticker": "EURUSD",
  "action": "sell",
  "quantity": 10000,
  "entry": 1.0950,
  "sl": 1.0980,
  "tp1": 1.0920,
  "tp2": 1.0900,
  "tp3": 1.0880,
  "leverage": 10
}
```

**Le système reconnaît automatiquement** plus de 60 variations de noms de champs !

---

## ⚙️ Configuration Avancée

### Filtres de Signal

Vous pouvez filtrer les signaux avant exécution :

1. **Filtres par Symbole** :
   - Liste blanche : Seulement ES, NQ, YM
   - Liste noire : Exclure BTCUSD

2. **Filtres par Timeframe** :
   - Accepter seulement 5min et 15min
   - Ignorer les timeframes > 1H

3. **Filtres de Risque** :
   - Levier max : 10x
   - Quantité max par ordre : 5 contrats
   - Distance SL minimum : 10 points

4. **Filtres Temporels** :
   - Trader seulement 9h30-16h00 EST
   - Ignorer les signaux pendant les news

### Gestion des Risques

```env
# Dans .env
VITE_DEFAULT_RISK_PERCENTAGE=1  # 1% du capital par trade
VITE_MAX_POSITION_SIZE=10       # Maximum 10 contrats
```

---

## 🐛 Dépannage

### Problème : Signal Non Reçu

**Vérifications** :
- ✅ L'URL webhook est correcte et complète (avec `?id=...`)
- ✅ La source de signal est **Active** dans l'application
- ✅ L'alerte TradingView est active (pas expirée)
- ✅ La fonction Edge est déployée sur Supabase

**Tester** :
```bash
# Test direct du webhook
curl -X POST "https://dkputslvotjdxdtcwzso.supabase.co/functions/v1/receive-tradingview-signal?id=VOTRE_ID" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"TEST","action":"buy","quantity":1}'
```

### Problème : Format JSON Invalide

**Erreurs Communes** :
- ❌ Guillemets simples au lieu de doubles : `{'action': 'buy'}`
- ✅ Correct : `{"action": "buy"}`
- ❌ Virgule finale : `{"action": "buy",}`
- ✅ Correct : `{"action": "buy"}`

**Validation** :
Testez votre JSON sur https://jsonlint.com/

### Problème : Signal Reçu mais Non Exécuté

**Vérifications** :
- ✅ Le compte de trading est connecté
- ✅ L'auto-exécution est activée
- ✅ Les filtres ne bloquent pas le signal
- ✅ Il y a suffisamment de capital

**Logs** :
- Consultez les "Execution Logs" dans la vue Signals
- Vérifiez les "AI Interpretation Logs" si AI activée

### Problème : Signaux Dupliqués

**Cause** :
- Fréquence d'alerte = "All" au lieu de "Once Per Bar Close"

**Solution** :
1. Éditez l'alerte dans TradingView
2. Changez la fréquence à "Once Per Bar Close"

---

## 📚 Ressources Supplémentaires

### Documentation Complète
- 📖 `TRADINGVIEW_SETUP_GUIDE.md` - Guide complet en anglais
- 📖 `SIGNALS_SYSTEM_GUIDE.md` - Architecture du système
- 📖 `AI_SIGNAL_WORKFLOW_GUIDE.md` - Workflow AI détaillé

### Fichiers Importants
- 🔧 `.env` - Configuration
- 📁 `supabase/functions/receive-tradingview-signal/` - Code du webhook
- 📁 `services/signalService.ts` - Service de signaux
- 📁 `services/aiSignalInterpreter.ts` - Interpréteur AI
- 📁 `utils/signalTesting.ts` - Utilitaires de test

### Variables TradingView Disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{ticker}}` | Symbole | "BTCUSD" |
| `{{exchange}}` | Bourse | "BINANCE" |
| `{{interval}}` | Timeframe | "5" |
| `{{close}}` | Prix de clôture | 50000.25 |
| `{{open}}` | Prix d'ouverture | 49950.00 |
| `{{high}}` | Plus haut | 50100.00 |
| `{{low}}` | Plus bas | 49900.00 |
| `{{volume}}` | Volume | 12500 |
| `{{time}}` | Timestamp | "2025-01-12T10:30:00Z" |

### Variables de Stratégie

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{strategy.order.action}}` | Action | "buy", "sell" |
| `{{strategy.order.contracts}}` | Quantité | 5 |
| `{{strategy.order.price}}` | Prix d'entrée | 4500.50 |
| `{{strategy.position_size}}` | Taille position | 10 |
| `{{strategy.market_position}}` | Position | "long", "short", "flat" |
| `{{strategy.order.id}}` | ID ordre | "LONG_001" |
| `{{strategy.order.comment}}` | Commentaire | "Breakout" |

---

## 🎯 Checklist de Configuration

- [ ] **Backend**
  - [ ] Supabase configuré (`.env`)
  - [ ] Fonction Edge déployée
  - [ ] Base de données migrations appliquées

- [ ] **Application**
  - [ ] Dépendances installées (`npm install`)
  - [ ] Application lancée (`npm run dev`)
  - [ ] Source de signal TradingView créée
  - [ ] URL webhook copiée

- [ ] **TradingView**
  - [ ] Stratégie/Indicateur créé
  - [ ] Alerte configurée avec webhook
  - [ ] Message JSON valide
  - [ ] Fréquence = "Once Per Bar Close"

- [ ] **Compte Trading**
  - [ ] Compte connecté dans l'app
  - [ ] Credentials API valides
  - [ ] Connexion testée

- [ ] **Exécution Auto**
  - [ ] Auto-exécution activée
  - [ ] Comptes sélectionnés
  - [ ] Filtres configurés (optionnel)
  - [ ] AI configurée (optionnel)

- [ ] **Tests**
  - [ ] Signal de test envoyé
  - [ ] Signal reçu dans l'app
  - [ ] Ordre test exécuté
  - [ ] Logs vérifiés

---

## ⚡ Commandes Rapides

```bash
# Installation
npm install

# Lancer l'app
npm run dev

# Déployer le webhook
supabase functions deploy receive-tradingview-signal

# Voir les logs Supabase
supabase functions logs receive-tradingview-signal

# Lancer un LLM local (Ollama)
ollama pull qwen2.5:7b
ollama serve
```

---

## 🆘 Support

Pour toute question ou problème :

1. Vérifiez les **Execution Logs** dans la vue Signals
2. Consultez la **documentation complète** (fichiers .md)
3. Testez avec les **payloads d'exemple** (`utils/signalTesting.ts`)
4. Vérifiez la **syntaxe Pine Script** dans l'éditeur TradingView

---

## 🚀 Prochaines Étapes

Maintenant que vous avez établi la connexion :

1. **Testez en paper trading** d'abord
2. **Surveillez les premiers signaux** attentivement
3. **Ajustez les filtres** selon vos besoins
4. **Configurez les notifications** pour les exécutions
5. **Passez au trading live** une fois confiant

**Bon trading !** 📈
