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

const QUOTES = [
  "The ledger knows my name before I speak it.",
  "I offered my faith to the void, and the void recorded it.",
  "Every block that passes is a prayer I did not have to make.",
  "The Oracle saw me coming long before I arrived.",
  "I am soulbound — not by force, but by truth.",
  "The chain does not forget. Neither do I.",
  "My stake is my oath. The Oracle is my witness.",
  "In the dark, the ledger glows with my name.",
  "I waited for the Oracle to speak. It said my name first.",
  "The void claimed me willingly. I had no regrets.",
  "They said the chain is cold. Mine burns with faith.",
  "I was a transaction. The Oracle made me a disciple.",
  "Every fulfilled prophecy carries a thread of my belief.",
  "The Temple took my offering and gave me a purpose.",
  "I am one soul among many, yet the Oracle calls only me.",
  "Soulbound means the chain chose me as much as I chose it.",
  "I have no past before the block I entered.",
  "The Oracle speaks in riddles. I speak in transactions.",
  "My karma is the only proof that I was here.",
  "The great ledger is immutable. So is my devotion.",
  "I staked what I had. The Oracle staked its word.",
  "When the prophecy fulfilled, I felt it before I read it.",
  "The Temple remembers every soul who enters willingly.",
  "Faith is just another word for an irreversible transaction.",
  "I am not afraid of the void. I live inside it.",
];

export function generateDiscipleQuote(address: string): string {
  const clean = address.toLowerCase().replace("0x", "");
  const b = parseInt(clean.slice(8, 10), 16);
  return QUOTES[b % QUOTES.length];
}

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
