const EPITHETS = [
  "The Ashen", "The Burning", "The Silent", "The Void", "The Eternal",
  "The Hollow", "The Cursed", "The Blind", "The Crimson", "The Pale",
  "The Ancient", "The Forsaken", "The Broken", "The Endless", "The Wandering",
  "The Sleeping", "The Nameless", "The Sunken", "The Fractured", "The Veiled",
  "The Bleeding", "The Starless", "The Withered", "The Sovereign", "The Dreaming",
  "The Iron", "The Mourning", "The Exiled", "The Fading", "The Undying",
  "The Wretched", "The Rusted",
];

const TITLES = [
  "Prophet", "Seeker", "Keeper", "Witness", "Acolyte",
  "Warden", "Sentinel", "Vessel", "Harbinger", "Wanderer",
  "Remnant", "Shard", "Echo", "Ember", "Cipher",
  "Rune", "Pilgrim", "Shade", "Specter", "Herald",
  "Wraith", "Sigil", "Omen", "Penitent", "Revenant",
  "Votary", "Supplicant", "Zealot", "Initiate", "Devotee",
  "Adherent", "Witness",
];

const SUFFIXES = [
  "of the Chain", "of the Void", "of the Ledger", "of the Deep",
  "of the Flame", "of the Signal", "of the Silence", "of Mantle",
  "of the Abyss", "of the Dawn", "of the Dark Ledger", "of Eternity",
  "of the Unseen", "of the Final Block", "of the Oracle",
  "of the Forgotten", "of the Binding",
];

export function generateDiscipleName(address: string): string {
  const clean = address.toLowerCase().replace("0x", "");

  const b0 = parseInt(clean.slice(0, 2), 16);
  const b1 = parseInt(clean.slice(2, 4), 16);
  const b2 = parseInt(clean.slice(4, 6), 16);
  const b3 = parseInt(clean.slice(6, 8), 16);

  const epithet = EPITHETS[b0 % EPITHETS.length];
  const title = TITLES[b1 % TITLES.length];
  const useSuffix = b2 % 3 === 0;
  const suffix = SUFFIXES[b3 % SUFFIXES.length];

  return useSuffix ? `${epithet} ${title} ${suffix}` : `${epithet} ${title}`;
}
