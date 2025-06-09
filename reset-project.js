// Script de réinitialisation complète du projet
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function resetProject() {
  console.log('🔄 Réinitialisation complète du projet...');

  try {
    // 1. Nettoyer la base de données
    console.log('📊 Nettoyage de la base de données...');
    await prisma.user.deleteMany();
    console.log('✅ Base de données nettoyée');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

resetProject();
