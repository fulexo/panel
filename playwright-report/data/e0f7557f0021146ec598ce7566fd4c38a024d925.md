# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "Ce site est inaccessible" [level=1] [ref=e7]
    - paragraph [ref=e8]: La connexion a été réinitialisée.
    - generic [ref=e9]:
      - paragraph [ref=e10]: "Voici quelques conseils :"
      - list [ref=e11]:
        - listitem [ref=e12]: Vérifier la connexion
        - listitem [ref=e13]:
          - link "Vérifier le proxy et le pare-feu" [ref=e14] [cursor=pointer]:
            - /url: "#buttons"
        - listitem [ref=e15]:
          - link "Exécutez les diagnostics réseau de Windows" [ref=e16] [cursor=pointer]:
            - /url: javascript:diagnoseErrors()
    - generic [ref=e17]: ERR_CONNECTION_RESET
  - generic [ref=e18]:
    - button "Actualiser" [ref=e20] [cursor=pointer]
    - button "Détails" [ref=e21] [cursor=pointer]
```