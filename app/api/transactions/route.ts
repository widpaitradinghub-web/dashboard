import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await query(`
      SELECT
        t.*,
        CASE WHEN c.kyc_status = 'verified' THEN c.full_name ELSE NULL END as full_name
      FROM transactions t
      LEFT JOIN customers c ON t.whatsapp_number = c.whatsapp_number
      ORDER BY t.created_at DESC
    `)
    return NextResponse.json({ transactions: result.rows })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
