const SPRITES = [
  "/assets/images/sprites/chrono_trigger/crono/Crono - Battle (Front).gif",
  "/assets/images/sprites/chrono_trigger/crono/Crono - Spell (Front).gif",
  "/assets/images/sprites/chrono_trigger/crono/Crono - Walk (Front).gif",
  "/assets/images/sprites/chrono_trigger/crono/Crono - Walk (Right).gif",
  "/assets/images/sprites/chrono_trigger/Frog/Frog - Walk (Front).gif",
  "/assets/images/sprites/chrono_trigger/Frog/Frog - Walk (Right).gif",
  "/assets/images/sprites/chrono_trigger/Lucca/Lucca - Walk (Front).gif",
  "/assets/images/sprites/chrono_trigger/Lucca/Lucca - Walk (Right).gif",
  "/assets/images/sprites/chrono_trigger/Magus/Magus - Cloak (Front).gif",
  "/assets/images/sprites/chrono_trigger/Magus/Magus - Summon.gif",
  "/assets/images/sprites/chrono_trigger/Magus/Magus - Walk (Front).gif",
  "/assets/images/sprites/chrono_trigger/Magus/Magus - Walk (Right).gif",
  "/assets/images/sprites/chrono_trigger/Marle/Marle - Spell (Front).gif",
  "/assets/images/sprites/chrono_trigger/Marle/Marle - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_iv/Cecil/Cecil1-Walk-Front.gif",
  "/assets/images/sprites/final_fantasy_iv/Cecil/Cecil1-Walk-Right.gif",
  "/assets/images/sprites/final_fantasy_iv/Cecil/Cecil2-Magic.gif",
  "/assets/images/sprites/final_fantasy_iv/Edge/Edge-Walk-Front.gif",
  "/assets/images/sprites/final_fantasy_iv/Edge/Edge-Walk-Right.gif",
  "/assets/images/sprites/final_fantasy_iv/Kain/Kain-Walk-Front.gif",
  "/assets/images/sprites/final_fantasy_iv/Kain/Kain-Walk-Right.gif",
  "/assets/images/sprites/final_fantasy_iv/Rydia/Rydia2-Walk-Front.gif",
  "/assets/images/sprites/final_fantasy_iv/Rydia/Rydia2-Walk-Right.gif",
  "/assets/images/sprites/final_fantasy_iv/Tellah/Tellah-Magic-Right.gif",
  "/assets/images/sprites/final_fantasy_iv/Tellah/Tellah-Walk-Right.gif",
  "/assets/images/sprites/final_fantasy_v/Earth/Dragoon1 - Walk.gif",
  "/assets/images/sprites/final_fantasy_v/Fire/Ninja1 - Walk.gif",
  "/assets/images/sprites/final_fantasy_v/Wind/Black Mage1 - Cast.gif",
  "/assets/images/sprites/final_fantasy_v/Wind/Black Mage1 - Walk.gif",
  "/assets/images/sprites/final_fantasy_v/Wind/Knight1 - Walk.gif",
  "/assets/images/sprites/final_fantasy_v/Wind/White Mage1 - Walk.gif",
  "/assets/images/sprites/final_fantasy_vi/Celes/Celes - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Celes/Celes - Walk (Right).gif",
  "/assets/images/sprites/final_fantasy_vi/Edgar/Edgar - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Edgar/Edgar - Walk (Right).gif",
  "/assets/images/sprites/final_fantasy_vi/Locke/Locke - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Locke/Locke - Walk (Right).gif",
  "/assets/images/sprites/final_fantasy_vi/Mog/Mog - Victory (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Mog/Mog - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Mog/Mog - Walk (Right).gif",
  "/assets/images/sprites/final_fantasy_vi/Setzer/Setzer - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Setzer/Setzer - Walk (Right).gif",
  "/assets/images/sprites/final_fantasy_vi/Shadow/Shadow - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Shadow/Shadow - Walk (Right).gif",
  "/assets/images/sprites/final_fantasy_vi/Terra/Terra - Walk (Front).gif",
  "/assets/images/sprites/final_fantasy_vi/Terra/Terra - Walk (Right).gif",
  "/assets/images/sprites/metroid/Metroid.gif",
  // SamusAranFront.png, Samus.gif, and SamusBall.gif are excluded (easter eggs).
];

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('random-sprite-container');
    if (!container) return;

    const src = SPRITES[Math.floor(Math.random() * SPRITES.length)];
    const img = document.createElement('img');
    img.alt = '';
    img.style.imageRendering = 'pixelated';
    img.style.display = 'block';
    img.style.margin = '0 auto';

    const TARGET = 96; // px — largest dimension scales to this
    img.onload = function () {
        const scale = TARGET / Math.max(img.naturalWidth, img.naturalHeight);
        img.style.width  = Math.round(img.naturalWidth  * scale) + 'px';
        img.style.height = Math.round(img.naturalHeight * scale) + 'px';
    };

    img.src = src;
    container.appendChild(img);
});

// C or the / menu (scripts/menu.js): the next sprite, dealt from a shuffled deck
// kept in localStorage key sprite_deck (top card last), so every sprite turns
// up before any repeats. Skips the one already showing.
window.nextSprite = function () {
    const img = document.querySelector('#random-sprite-container img');
    if (!img) return false;
    const showing = img.getAttribute('src');
    let deck = [];
    try { deck = (JSON.parse(localStorage.getItem('sprite_deck')) || []).filter(s => SPRITES.includes(s)); } catch (e) { /* private mode etc. */ }
    if (!deck.length || (deck.length === 1 && deck[0] === showing)) {
        deck = SPRITES.slice();
        for (let i = deck.length - 1; i > 0; i--) { // Fisher–Yates
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }
    let i = deck.length - 1;
    if (deck[i] === showing) i--;
    const src = deck.splice(i, 1)[0];
    try { localStorage.setItem('sprite_deck', JSON.stringify(deck)); } catch (e) { /* private mode etc. */ }
    img.src = src; // the onload above rescales it
    return true;
};
