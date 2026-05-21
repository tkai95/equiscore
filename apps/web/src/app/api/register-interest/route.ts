import { NextResponse } from 'next/server'
import { db } from '@equiscore/database'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, profileType, useCase, currentCountry, lastCountry, orgType, intendedUse, applicantVolume, problem, consent } = body

    if (!email || !profileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await db.waitlistEntry.upsert({
      where: { email },
      update: {
        profileType,
        useCase: Array.isArray(useCase) ? useCase.join(', ') : (useCase ?? null),
        currentCountry: currentCountry ?? null,
        lastCountry: lastCountry ?? null,
        orgType: orgType ?? null,
        intendedUse: Array.isArray(intendedUse) ? intendedUse.join(', ') : (intendedUse ?? null),
        applicantVolume: applicantVolume ?? null,
        problemStatement: problem ?? null,
        consent: consent ?? false,
      },
      create: {
        email,
        profileType,
        useCase: Array.isArray(useCase) ? useCase.join(', ') : (useCase ?? null),
        currentCountry: currentCountry ?? null,
        lastCountry: lastCountry ?? null,
        orgType: orgType ?? null,
        intendedUse: Array.isArray(intendedUse) ? intendedUse.join(', ') : (intendedUse ?? null),
        applicantVolume: applicantVolume ?? null,
        problemStatement: problem ?? null,
        consent: consent ?? false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Register interest error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
