import { NextResponse } from 'next/server'
import { Pool } from 'pg'

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const { email, profileType, useCase, currentCountry, lastCountry, orgType, intendedUse, applicantVolume, problem, consent } = body

    if (!email || !profileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await getPool().query(
      `INSERT INTO waitlist_entries
        (id, email, profile_type, use_case, current_country, last_country, org_type, intended_use, applicant_volume, problem_statement, consent)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET
        profile_type     = EXCLUDED.profile_type,
        use_case         = EXCLUDED.use_case,
        current_country  = EXCLUDED.current_country,
        last_country     = EXCLUDED.last_country,
        org_type         = EXCLUDED.org_type,
        intended_use     = EXCLUDED.intended_use,
        applicant_volume = EXCLUDED.applicant_volume,
        problem_statement = EXCLUDED.problem_statement,
        consent          = EXCLUDED.consent`,
      [
        email,
        profileType,
        Array.isArray(useCase) ? useCase.join(', ') : (useCase ?? null),
        currentCountry ?? null,
        lastCountry ?? null,
        orgType ?? null,
        Array.isArray(intendedUse) ? intendedUse.join(', ') : (intendedUse ?? null),
        applicantVolume ?? null,
        problem ?? null,
        consent ?? false,
      ],
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Register interest error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
