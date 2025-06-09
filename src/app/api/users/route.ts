import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidUsername } from '@/lib/utils';

// GET /api/users/check?username=xxx - Vérifier si un nom d'utilisateur est disponible
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur invalide' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    return NextResponse.json({
      available: !existingUser,
      username: username.trim()
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du nom d\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/users/create - Créer un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur invalide' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { username: trimmedUsername }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ce nom d\'utilisateur est déjà pris' },
        { status: 409 }
      );
    }

    // Créer l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        isOnline: true
      }
    });

    return NextResponse.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        isOnline: newUser.isOnline
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
