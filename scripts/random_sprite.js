const SPRITES = [
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Battle (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Hit (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Spell (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Status.gif",
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Victory.gif",
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Walk (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/crono/Crono - Walk (Left).gif",
  "/assets/images/games/sprites/chrono_trigger/Frog/Frog - Victory.gif",
  "/assets/images/games/sprites/chrono_trigger/Frog/Frog - Walk (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/Frog/Frog - Walk (Left).gif",
  "/assets/images/games/sprites/chrono_trigger/Lucca/Lucca - Mallet (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/Lucca/Lucca - Status.gif",
  "/assets/images/games/sprites/chrono_trigger/Lucca/Lucca - Walk (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/Lucca/Lucca - Walk (Left).gif",
  "/assets/images/games/sprites/chrono_trigger/Magus/Magus - Cloak (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/Magus/Magus - Status.gif",
  "/assets/images/games/sprites/chrono_trigger/Magus/Magus - Summon.gif",
  "/assets/images/games/sprites/chrono_trigger/Magus/Magus - Walk (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/Magus/Magus - Walk (Left).gif",
  "/assets/images/games/sprites/chrono_trigger/Marle/Marle - Spell (Front).gif",
  "/assets/images/games/sprites/chrono_trigger/Marle/Marle - Status.gif",
  "/assets/images/games/sprites/chrono_trigger/Marle/Marle - Victory.gif",
  "/assets/images/games/sprites/chrono_trigger/Marle/Marle - Walk (Front).gif",
  "/assets/images/games/sprites/earthbound/Ness/Ness - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil1-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil1-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil1-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil2-Magic.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil2-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil2-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Cecil/Cecil2-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Edge/Edge-Magic.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Edge/Edge-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Edge/Edge-Throw.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Edge/Edge-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Edge/Edge-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Edge/Edge-Walk.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Kain/Kain-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Kain/Kain-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Kain/Kain-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rosa/Rosa-Magic.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rosa/Rosa-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rosa/Rosa-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rosa/Rosa-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rosa/Rosa-Walk.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rydia/Rydia2-Magic.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rydia/Rydia2-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rydia/Rydia2-Summon.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rydia/Rydia2-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Rydia/Rydia2-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Tellah/Tellah-Magic.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Tellah/Tellah-Status.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Tellah/Tellah-Walk-Front.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Tellah/Tellah-Walk-Left.gif",
  "/assets/images/games/sprites/final_fantasy_iv/Tellah/Tellah-Walk.gif",
  "/assets/images/games/sprites/final_fantasy_v/Earth/Dragoon1 - Walk.gif",
  "/assets/images/games/sprites/final_fantasy_v/Earth/Dragoon1.gif",
  "/assets/images/games/sprites/final_fantasy_v/Fire/Ninja1 - Defend.gif",
  "/assets/images/games/sprites/final_fantasy_v/Fire/Ninja1 - Walk.gif",
  "/assets/images/games/sprites/final_fantasy_v/Wind/Black Mage1 - Cast.gif",
  "/assets/images/games/sprites/final_fantasy_v/Wind/Black Mage1 - Walk.gif",
  "/assets/images/games/sprites/final_fantasy_v/Wind/Black Mage1.gif",
  "/assets/images/games/sprites/final_fantasy_v/Wind/Knight1 - Walk.gif",
  "/assets/images/games/sprites/final_fantasy_v/Wind/Knight1.gif",
  "/assets/images/games/sprites/final_fantasy_v/Wind/White Mage1 - Walk.gif",
  "/assets/images/games/sprites/final_fantasy_vi/Celes/Celes - Status.gif",
  "/assets/images/games/sprites/final_fantasy_vi/Celes/Celes - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Celes/Celes - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Edgar/Edgar - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Edgar/Edgar - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Locke/Locke - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Locke/Locke - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Mog/Mog - Victory (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Mog/Mog - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Mog/Mog - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Setzer/Setzer - Status.gif",
  "/assets/images/games/sprites/final_fantasy_vi/Setzer/Setzer - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Setzer/Setzer - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Shadow/Shadow - Status.gif",
  "/assets/images/games/sprites/final_fantasy_vi/Shadow/Shadow - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Shadow/Shadow - Walk (Left).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Terra/Terra - Status.gif",
  "/assets/images/games/sprites/final_fantasy_vi/Terra/Terra - Walk (Front).gif",
  "/assets/images/games/sprites/final_fantasy_vi/Terra/Terra - Walk (Left).gif",
  "/assets/images/games/sprites/metroid/Metroid.gif",
  "/assets/images/games/sprites/metroid/SamusAranFront.png",
  "/assets/images/games/sprites/metroid/SamusRunningR.gif",
  // SamusBall.gif is intentionally excluded — used elsewhere
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
        img.style.transform = 'scaleX(-1)';
    };

    img.src = src;
    container.appendChild(img);
});
