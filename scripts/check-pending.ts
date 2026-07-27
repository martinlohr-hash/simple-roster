import 'dotenv/config'
import { prisma } from '@/lib/db'

async function main() {
  const pending = await prisma.pendingEmail.findMany({
    where: { sentAt: null },
    select: { id: true, type: true, userId: true, scheduledFor: true, createdAt: true }
  })
  console.log('⏰ Pending emails:', pending.length)
  console.log('Now:', new Date().toISOString())
  pending.forEach(p => {
    const ready = p.scheduledFor <= new Date()
    console.log(`  - ${p.type} for user ${p.userId.slice(0,6)}... ${ready ? '✅ READY' : '⏳ waiting'} (${p.scheduledFor.toISOString()})`)
  })
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
