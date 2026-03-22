# Constantes de validation (doivent correspondre au client)
XP_VICTOIRE_MIN = 100
XP_VICTOIRE_MAX = 250
XP_DEFAITE_MIN = 10
XP_DEFAITE_MAX = 100
XP_PAR_KILL = 5
GOLD_PAR_NIVEAU = 50
GOLD_VICTOIRE = 50
XP_PAR_NIVEAU = 1000


def calculer_niveau(xp_total):
    """Calcule le niveau a partir de l'XP total (1000 XP par niveau)."""
    niveau = 1
    xp_restant = xp_total
    while xp_restant >= XP_PAR_NIVEAU:
        xp_restant -= XP_PAR_NIVEAU
        niveau += 1
    return {
        'niveau': niveau,
        'xp_dans_niveau': xp_restant,
        'xp_requis': XP_PAR_NIVEAU
    }
