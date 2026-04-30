import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, profileType, useCase, currentCountry, lastCountry, orgType, intendedUse, applicantVolume, problem, consent } = body

    if (!email || !profileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.LOOPS_API_KEY
    if (!apiKey) {
      console.error('LOOPS_API_KEY is not set')
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const contact: Record<string, unknown> = {
      email,
      source: 'waitlist',
      userGroup: profileType,
      subscribed: consent ?? false,
    }

    if (profileType === 'individual') {
      if (useCase?.length) contact.useCase = Array.isArray(useCase) ? useCase.join(', ') : useCase
      if (currentCountry) contact.currentCountry = currentCountry
      if (lastCountry) contact.lastCountry = lastCountry
      if (problem) contact.problemStatement = problem
    }

    if (profileType === 'business') {
      if (orgType) contact.orgType = orgType
      if (intendedUse?.length) contact.intendedUse = Array.isArray(intendedUse) ? intendedUse.join(', ') : intendedUse
      if (applicantVolume) contact.applicantVolume = applicantVolume
      if (problem) contact.problemStatement = problem
    }

    const loopsRes = await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contact),
    })

    if (!loopsRes.ok) {
      const text = await loopsRes.text()
      console.error('Loops API error:', loopsRes.status, text)
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Register interest error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
