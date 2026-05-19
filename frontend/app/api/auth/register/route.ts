// frontend/app/api/auth/register/route.ts
// PRIORITAIRE sur [...nextauth]/route.ts car route statique
// Évite le bug où NextAuth tente de gérer /api/auth/register

import { NextResponse } from 'next/server'

const API_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_URL
  || process.env.API_URL
  || 'http://localhost:3001'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Forward vers le backend (avec /api forcé)
    const apiBase = API_URL.replace(/\/$/, '')
    const target = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`

    const res = await fetch(`${target}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({ success: false, message: 'Réponse invalide du serveur' }))
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
