/* Local-only copy: select once per popup opening, with no tracking or requests. */
(() => {
  "use strict";
  const messages = Object.freeze([
    "Time saved. Side quest unlocked: buy the dev a coffee.",
    "You skipped the grind. Help the dev refill their mana.",
    "Monthly Log boss defeated. Drop a coffee in the loot chest?",
    "More time for games, less time for forms. Coffee is optional DLC.",
    "Achievement unlocked: reclaimed free time. Reward the dev with coffee?",
    "Your timesheet got a speedrun. My coffee could use a refill.",
    "You gained +10 free time. A coffee gives the dev +10 stamina.",
    "No paywall, no battle pass. Just a tiny coffee side quest.",
    "The paperwork NPC has been handled. Tip your friendly dev a coffee.",
    "If this saved your evening, send a coffee to the respawn point.",
    "Less clicking, more critical hits. Fuel the dev with a coffee.",
    "Your monthly grind got nerfed. Coffee buffs are welcome.",
    "Fast travel through your timesheet. Leave a coffee at the waypoint?",
    "You kept your weekends. The dev would love a coffee potion.",
    "This tool tanked the paperwork. Buy your support class a coffee.",
    "Inventory full of free time? Trade one coffee with the dev.",
    "Quest complete: fewer boring clicks. Optional reward: one coffee.",
    "The real endgame is free time. Coffee keeps this dev in the party.",
    "You dodged the paperwork damage. Send a coffee healing potion?",
    "Your APM belongs in games, not forms. Buy the dev a coffee.",
    "Autofill used Haste. It was super effective. Coffee, anyone?",
    "Less time logging, more time leveling. Coffee powers the next patch.",
    "You found the time-saving shortcut. Leave a coffee at the bonfire?",
    "Paperwork difficulty: easy mode. Dev fuel: coffee mode.",
    "GG, monthly grind. A coffee is a pretty great victory emote.",
    "This was the tutorial boss. Coffee helps me build the next level.",
    "No loot boxes here. Just a dev hoping for a legendary coffee.",
    "Your free time just leveled up. Celebrate with a coffee for the dev.",
    "Thanks for playing Monthly Autofill. The tip jar accepts coffee loot.",
    "Saved enough time for one more match? Buy the dev one more coffee."
  ]);
  const message = document.getElementById("coffee-message");
  if (message) message.textContent = messages[Math.floor(Math.random() * messages.length)];
})();
