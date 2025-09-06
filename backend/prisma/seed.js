const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cards = [];
  // couleurs et valeurs
  const suits = ['BLACK','GREEN','PURPLE','YELLOW'];
  for (const s of suits) {
    for (let v = 1; v <= 14; v++) {
      cards.push({ code: `${v}_${s}`, label: `${v} ${s.toLowerCase()}`, cardType: 'NUMBER', suit: s, rank: v });
    }
  }
  // pirates (5)
  for (let i = 1; i <= 5; i++) cards.push({ code: `PIRATE_${i}`, label: `Pirate ${i}`, cardType: 'PIRATE', suit: null, rank: null });
  // skullking
  cards.push({ code: 'SKULLKING', label: 'Skull King', cardType: 'SKULLKING', suit: null, rank: null });
  // tigress
  cards.push({ code: 'TIGRESS', label: 'Tigresse', cardType: 'TIGRESS', suit: null, rank: null });
  // mermaids (2)
  for (let i = 1; i <= 2; i++) cards.push({ code: `MERMAID_${i}`, label: `Sirène ${i}`, cardType: 'MERMAID', suit: null, rank: null });
  // escapes (5)
  for (let i = 1; i <= 5; i++) cards.push({ code: `ESCAPE_${i}`, label: 'Fuite', cardType: 'ESCAPE', suit: null, rank: null });
  // white whale
  cards.push({ code: 'WHITEWHALE', label: 'Baleine Blanche', cardType: 'WHITEWHALE', suit: null, rank: null });
  // kraken
  cards.push({ code: 'KRAKEN', label: 'Kraken', cardType: 'KRAKEN', suit: null, rank: null });
  // loot cards (2)
  for (let i = 1; i <= 2; i++) cards.push({ code: `LOOT_${i}`, label: `Loot ${i}`, cardType: 'LOOT', suit: null, rank: null });

  for (const c of cards) {
    await prisma.card.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log('Seeded', cards.length, 'cards');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
