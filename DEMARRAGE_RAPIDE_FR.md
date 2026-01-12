# 🚀 Démarrage Rapide - Connexion TradingView

Guide ultra-rapide pour connecter TradingView à votre système de trading en **5 minutes**.

---

## ⚡ Installation en 3 Commandes

```bash
# 1. Installer les dépendances
npm install

# 2. Déployer le webhook sur Supabase
./scripts/deploy-webhook.sh

# 3. Lancer l'application
npm run dev
```

---

## 📱 Configuration dans l'Application (2 minutes)

### Étape 1 : Créer une Source de Signal
1. Ouvrez `http://localhost:5173`
2. Allez dans **"Signals"** (menu gauche)
3. Cliquez **"Add Signal Source"**
4. Choisissez **"TradingView"**
5. Donnez un nom : `"Ma Première Stratégie"`
6. Cliquez **"Create"**

### Étape 2 : Copier l'URL Webhook
Vous obtiendrez une URL comme :
```
https://dkputslvotjdxdtcwzso.supabase.co/functions/v1/receive-tradingview-signal?id=abc123xyz
```
**⚠️ Copiez cette URL - vous en aurez besoin dans TradingView !**

---

## 📊 Configuration dans TradingView (2 minutes)

### Option A : Utiliser un Exemple Prêt à l'Emploi

Nous avons préparé 2 stratégies prêtes à l'emploi :

#### 1️⃣ Indicateur Simple : Croisement de Moyennes Mobiles
📁 Fichier : `tradingview-examples/simple-ma-crossover.pine`

**Instructions** :
1. Ouvrez TradingView
2. Cliquez sur **"Pine Editor"** (en bas)
3. Copiez-collez le contenu de `simple-ma-crossover.pine`
4. Cliquez **"Add to chart"**
5. L'indicateur apparaît sur votre graphique ✅

#### 2️⃣ Stratégie Avancée : RSI avec Multiple Take Profits
📁 Fichier : `tradingview-examples/rsi-strategy-multi-tp.pine`

**Instructions** : Identiques à ci-dessus

---

### Étape 3 : Créer l'Alerte

1. **Cliquez sur l'icône d'alerte** (⏰) ou `Alt + A`
2. **Configurez** :
   - **Condition** : Sélectionnez votre indicateur/stratégie
     - Pour stratégie : Choisir "Alert() function calls only"
   - **Options** :
     - Nom : `"Trading Auto - Test"`
     - Fréquence : **"Once Per Bar Close"** ⚠️ Important !
   - **Webhook URL** : Collez votre URL (étape 2)
   - **Message** : Laissez vide (géré par le script Pine)
3. **Cliquez "Create"**

✅ **C'est tout ! Votre alerte est active.**

---

## 🧪 Tester la Connexion (1 minute)

### Test 1 : Test Manuel du Webhook

```bash
# Remplacez abc123xyz par votre vrai ID webhook
./scripts/test-webhook.sh abc123xyz
```

**Résultat attendu** :
```json
{
  "success": true,
  "message": "Signal received",
  "parsed": {
    "symbol": "BTCUSD",
    "action": "buy",
    ...
  }
}
```

### Test 2 : Vérifier dans l'Application

1. Retournez dans l'application (`http://localhost:5173`)
2. Vue **"Signals"**
3. Vous devriez voir **3 signaux de test** dans "Recent Signals"
4. ✅ Si vous les voyez → **Connexion établie avec succès !**

### Test 3 : Signal Réel de TradingView

1. **Attendez** qu'une condition de votre stratégie soit remplie
   - OU changez de timeframe pour déclencher un signal
2. **Vérifiez** dans l'application que le signal apparaît
3. ✅ Si oui → **Tout fonctionne parfaitement !**

---

## 🎯 Activer l'Exécution Automatique (Optionnel)

### Prérequis : Connecter un Compte de Trading

1. Vue **"Trading"**
2. **"Connect Account"**
3. Choisissez votre broker (TopstepX, etc.)
4. Entrez vos identifiants API
5. Testez la connexion

### Activer l'Auto-Exécution

**Option 1 : Mode Simple (Sans AI)**
1. Vue **"Signals"**
2. Toggle **"Auto Execute"** → ON
3. Sélectionnez vos comptes
4. Les signaux seront exécutés automatiquement ! 🚀

**Option 2 : Mode AI (Recommandé)**

Requiert un LLM local. Installation rapide avec Ollama :

```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger le modèle
ollama pull qwen2.5:7b

# Lancer le serveur
ollama serve
```

Puis dans `.env` :
```env
VITE_LLM_ENDPOINT=http://localhost:11434/v1
VITE_LLM_MODEL=qwen2.5:7b
VITE_ENABLE_AI_INTERPRETATION=true
VITE_ENABLE_AUTO_EXECUTION=true
```

Redémarrez l'app :
```bash
npm run dev
```

Dans l'application, activez **"AI Signal Executor"**.

**Avantages** :
- ✅ Validation intelligente des signaux
- ✅ Calcul automatique de la taille de position
- ✅ Détection d'anomalies
- ✅ Score de confiance par signal

---

## 📊 Exemples de Signaux Reçus

### Signal Simple (Indicateur)
```json
{
  "ticker": "BTCUSD",
  "action": "buy",
  "price": 50000,
  "quantity": 1,
  "timeframe": "5"
}
```

### Signal Complet (Stratégie)
```json
{
  "ticker": "ES",
  "exchange": "CME",
  "interval": "5",
  "strategy.order.action": "buy",
  "strategy.order.contracts": 2,
  "strategy.order.price": 4500.50,
  "stop_loss": 4480.00,
  "take_profit": 4540.00
}
```

### Signal Multi-TP (Stratégie Avancée)
```json
{
  "ticker": "NQ",
  "action": "sell",
  "quantity": 3,
  "entry": 15000.25,
  "sl": 15050.00,
  "tp1": 14950.00,
  "tp2": 14900.00,
  "tp3": 14850.00
}
```

---

## 🔧 Commandes Utiles

```bash
# Lancer l'application
npm run dev

# Déployer le webhook
./scripts/deploy-webhook.sh

# Tester le webhook
./scripts/test-webhook.sh VOTRE_ID

# Voir les logs Supabase
supabase functions logs receive-tradingview-signal

# Build de production
npm run build

# Lancer Ollama (pour AI)
ollama serve
```

---

## 📁 Structure des Fichiers Importants

```
Pytradecraft/
├── 📖 GUIDE_CONNEXION_TRADINGVIEW_FR.md    # Guide complet (20 pages)
├── 📖 DEMARRAGE_RAPIDE_FR.md               # Ce fichier
├── 📖 TRADINGVIEW_SETUP_GUIDE.md           # Guide anglais original
│
├── 📁 scripts/
│   ├── deploy-webhook.sh                   # Script de déploiement
│   └── test-webhook.sh                     # Script de test
│
├── 📁 tradingview-examples/
│   ├── simple-ma-crossover.pine            # Indicateur MA simple
│   └── rsi-strategy-multi-tp.pine          # Stratégie RSI avancée
│
├── 📁 supabase/functions/
│   └── receive-tradingview-signal/
│       └── index.ts                        # Code du webhook
│
├── 📁 services/
│   ├── signalService.ts                    # Service de gestion des signaux
│   ├── aiSignalInterpreter.ts              # Interpréteur AI
│   └── orderWorkflowService.ts             # Workflow d'exécution
│
├── 📁 components/
│   ├── SignalSourceManager.tsx             # Gestion des sources
│   ├── SignalExecutor.tsx                  # Exécuteur simple
│   └── AISignalExecutor.tsx                # Exécuteur AI
│
└── 📁 views/
    └── SignalsView.tsx                     # Dashboard principal
```

---

## ❓ FAQ Rapide

### Q : Le webhook ne fonctionne pas
**R :** Vérifiez :
1. ✅ Fonction déployée : `./scripts/deploy-webhook.sh`
2. ✅ URL complète (avec `?id=...`)
3. ✅ Source de signal = Active dans l'app
4. ✅ Alerte TradingView = Active

### Q : Les signaux arrivent mais ne s'exécutent pas
**R :** Vérifiez :
1. ✅ Compte de trading connecté
2. ✅ Auto-exécution activée
3. ✅ Comptes sélectionnés dans les paramètres
4. ✅ Pas de filtres bloquants

### Q : Format JSON invalide
**R :**
- Utilisez les exemples Pine Script fournis
- Testez votre JSON sur https://jsonlint.com/
- Vérifiez : guillemets doubles, pas de virgules finales

### Q : Signaux dupliqués
**R :** Changez la fréquence d'alerte à **"Once Per Bar Close"**

---

## 🎯 Checklist Finale

- [ ] Application lancée (`npm run dev`)
- [ ] Webhook déployé
- [ ] Source de signal créée
- [ ] URL webhook copiée
- [ ] Stratégie Pine Script ajoutée au graphique
- [ ] Alerte créée avec webhook
- [ ] Tests passés (3 signaux visibles)
- [ ] Compte de trading connecté (optionnel)
- [ ] Auto-exécution activée (optionnel)

---

## 🆘 Besoin d'Aide ?

**Documentation Complète** :
- 📖 `GUIDE_CONNEXION_TRADINGVIEW_FR.md` - Guide détaillé en français
- 📖 `TRADINGVIEW_SETUP_GUIDE.md` - Guide anglais avec exemples avancés
- 📖 `SIGNALS_SYSTEM_GUIDE.md` - Architecture technique

**Logs & Debugging** :
```bash
# Logs du webhook
supabase functions logs receive-tradingview-signal

# Logs de l'app
Console du navigateur (F12)

# Test direct
./scripts/test-webhook.sh VOTRE_ID
```

---

## 🎉 Félicitations !

Votre système de trading automatisé est maintenant connecté à TradingView !

**Prochaines étapes recommandées** :
1. 📊 Testez en **paper trading** d'abord
2. 🧪 Affinez vos stratégies et paramètres
3. 📈 Surveillez les premiers signaux attentivement
4. 🤖 Activez l'AI pour une exécution intelligente
5. 🚀 Passez au trading live quand vous êtes confiant

**Bon trading !** 📈💰
