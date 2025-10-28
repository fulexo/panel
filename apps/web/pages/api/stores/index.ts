import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/database'
import { getToken } from 'next-auth/jwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication
    const token = await getToken({ req })
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    switch (req.method) {
      case 'GET':
        const stores = await prisma.store.findMany({
          where: { tenantId: token.tenantId }
        })
        return res.json(stores)

      case 'POST':
        const newStore = await prisma.store.create({
          data: {
            ...req.body,
            tenantId: token.tenantId
          }
        })
        return res.json(newStore)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}