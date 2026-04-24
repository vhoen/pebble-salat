#01
- créer en utilisant l'api alloy une application pebble time 2 et pebble round 2 qui va afficher le nom d'une ville et le code pays, tous deux configurables dans les paramètres de l'appli (par défaut : Paris / FR)
- afficher le nom des 5 prières musulmanes l'une en dessous de l'autre sous ce format : "Nom de prière : 00:00"

#02
- chercher les horaires de prières (Islam) de la journée en cours pour la ville configuré une seule fois par jour
- en utilisant cette api :https://aladhan.com/prayer-times-api#tag/daily-prayer-times/GET/timingsByCity/{date} (passer la date du jour et les infos ville/pays), spécifiquement ce endpoint : get/timingsByCity/{date}
- remplacer l'heure de prière à côté de chaque prière correspondante