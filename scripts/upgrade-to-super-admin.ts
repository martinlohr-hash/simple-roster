import 'dotenv/config'
import { prisma } from '@/lib/db'

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'm.lohr@me.com' }
  })
  
  if (!user) {
    console.log('User nicht gefunden')
    process.exit(1)
  }
  
  console.log('Aktueller User:', user.name, '-', user.role)
  
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_ADMIN' }
  })
  
  console.log('✓ Rolle geändert auf:', updated.role)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
