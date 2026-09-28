/**
 * El sprite Gigamax de cada forma que puede gigamaxizar.
 *
 * PokeAPI tiene las 34 formas Gigamax con sprite home (normal y shiny), pero
 * el GAME_MASTER no dice cuál es cuál: aquí va a mano, de la forma normal
 * (su `spriteId`) al id de PokeAPI de su versión Gigamax. Toxtricity y Urshifu
 * gigamaxizan distinto según la forma, por eso la clave es el sprite y no el
 * número de Pokédex.
 */
export const GIGAMAX_SPRITE = {
  3: 10195, // Venusaur
  6: 10196, // Charizard
  9: 10197, // Blastoise
  12: 10198, // Butterfree
  25: 10199, // Pikachu
  52: 10200, // Meowth
  68: 10201, // Machamp
  94: 10202, // Gengar
  99: 10203, // Kingler
  131: 10204, // Lapras
  133: 10205, // Eevee
  143: 10206, // Snorlax
  569: 10207, // Garbodor
  809: 10208, // Melmetal
  812: 10209, // Rillaboom
  815: 10210, // Cinderace
  818: 10211, // Inteleon
  823: 10212, // Corviknight
  826: 10213, // Orbeetle
  834: 10214, // Drednaw
  839: 10215, // Coalossal
  841: 10216, // Flapple
  842: 10217, // Appletun
  844: 10218, // Sandaconda
  849: 10219, // Toxtricity (Amped)
  10184: 10228, // Toxtricity (Low Key)
  851: 10220, // Centiskorch
  858: 10221, // Hatterene
  861: 10222, // Grimmsnarl
  869: 10223, // Alcremie
  879: 10224, // Copperajah
  884: 10225, // Duraludon
  892: 10226, // Urshifu (Single Strike)
  10191: 10227 // Urshifu (Rapid Strike)
}

/** El sprite Gigamax de esa forma, o el suyo si no tiene. */
export const gigamaxSpriteId = (spriteId) => GIGAMAX_SPRITE[spriteId] ?? spriteId
