# Simulatore Spese

Web app statica pensata per essere pubblicata su **GitHub Pages**.

## Funzioni incluse

- Inserimento **saldo attuale**
- Inserimento **soglia minima di sicurezza**
- Gestione **spese certe**
- Gestione **movimenti futuri** come **spese** o **entrate**
- Possibilità di **includere/escludere** ogni movimento dal calcolo
- Calcolo automatico di:
  - totale spese certe
  - impatto netto dei movimenti futuri
  - saldo finale simulato
  - margine sopra/sotto soglia
- **Salvataggio automatico** nel browser tramite `localStorage`
- **Esportazione** e **importazione** dati in JSON
- Layout **responsive** per PC e smartphone

## Struttura file

```text
simulatore-spese/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Come pubblicarla su GitHub Pages

1. Crea una nuova repository su GitHub, ad esempio: `simulatore-spese`
2. Carica questi file nella root della repository
3. Vai in **Settings** > **Pages**
4. In **Build and deployment** scegli:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Salva
6. Dopo qualche secondo/minuto la tua app sarà online.

## Nota importante

I dati vengono salvati **solo nel browser** del dispositivo che stai usando.
Se vuoi in futuro una versione con database online, storico e sincronizzazione multi-dispositivo, si può fare una **Versione 2** con backend.
