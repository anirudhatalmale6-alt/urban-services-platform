import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@urbanserv.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@urbanserv.com',
      password: adminPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  })

  // Create sample provider
  const providerPassword = await bcrypt.hash('provider123', 12)
  const provider = await prisma.user.upsert({
    where: { email: 'provider@test.com' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'provider@test.com',
      phone: '+91 98765 43210',
      password: providerPassword,
      role: 'PROVIDER',
      isVerified: true,
    },
  })

  await prisma.providerProfile.upsert({
    where: { userId: provider.id },
    update: {},
    create: {
      userId: provider.id,
      bio: 'Experienced home cleaning professional with 5+ years of experience.',
      experience: 5,
      isApproved: true,
      approvedAt: new Date(),
      rating: 4.8,
      totalReviews: 124,
      serviceAreaCity: 'Mumbai',
    },
  })

  // Create sample consumer
  const consumerPassword = await bcrypt.hash('consumer123', 12)
  await prisma.user.upsert({
    where: { email: 'consumer@test.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'consumer@test.com',
      phone: '+91 98765 12345',
      password: consumerPassword,
      role: 'CONSUMER',
      isVerified: true,
    },
  })

  // Create service categories
  const categories = [
    { name: 'Home Cleaning', slug: 'home-cleaning', icon: '🏠', description: 'Professional home cleaning services', sortOrder: 1 },
    { name: 'Beauty & Spa', slug: 'beauty-spa', icon: '💆', description: 'Salon services at your doorstep', sortOrder: 2 },
    { name: 'Plumbing', slug: 'plumbing', icon: '🔧', description: 'Expert plumbing repairs and installation', sortOrder: 3 },
    { name: 'Electrician', slug: 'electrician', icon: '⚡', description: 'Electrical repairs and installation', sortOrder: 4 },
    { name: 'Carpentry', slug: 'carpentry', icon: '🪚', description: 'Furniture repair and custom woodwork', sortOrder: 5 },
    { name: 'Painting', slug: 'painting', icon: '🎨', description: 'Interior and exterior painting', sortOrder: 6 },
    { name: 'Pest Control', slug: 'pest-control', icon: '🐛', description: 'Pest elimination and prevention', sortOrder: 7 },
    { name: 'Appliance Repair', slug: 'appliance-repair', icon: '🔌', description: 'AC, washing machine, fridge repair', sortOrder: 8 },
  ]

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }

  // Create services under categories
  const cleaningCat = await prisma.serviceCategory.findUnique({ where: { slug: 'home-cleaning' } })
  const beautyCat = await prisma.serviceCategory.findUnique({ where: { slug: 'beauty-spa' } })
  const plumbingCat = await prisma.serviceCategory.findUnique({ where: { slug: 'plumbing' } })
  const electricianCat = await prisma.serviceCategory.findUnique({ where: { slug: 'electrician' } })

  if (cleaningCat) {
    const cleaningServices = [
      { name: 'Full Home Deep Cleaning', slug: 'full-home-deep-cleaning', basePrice: 2499, duration: 240, description: 'Complete deep cleaning of your entire home' },
      { name: 'Bathroom Cleaning', slug: 'bathroom-cleaning', basePrice: 499, duration: 60, description: 'Thorough bathroom scrubbing and sanitization' },
      { name: 'Kitchen Cleaning', slug: 'kitchen-cleaning', basePrice: 699, duration: 90, description: 'Deep kitchen cleaning including chimney' },
      { name: 'Sofa Cleaning', slug: 'sofa-cleaning', basePrice: 599, duration: 60, description: 'Professional sofa shampooing and cleaning' },
    ]
    for (const svc of cleaningServices) {
      await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {},
        create: { ...svc, categoryId: cleaningCat.id },
      })
    }
  }

  if (beautyCat) {
    const beautyServices = [
      { name: 'Women\'s Haircut & Styling', slug: 'womens-haircut', basePrice: 499, duration: 45, description: 'Professional haircut and blow dry at home' },
      { name: 'Facial & Cleanup', slug: 'facial-cleanup', basePrice: 799, duration: 60, description: 'Rejuvenating facial with premium products' },
      { name: 'Manicure & Pedicure', slug: 'mani-pedi', basePrice: 699, duration: 75, description: 'Nail care with spa treatment' },
      { name: 'Full Body Massage', slug: 'full-body-massage', basePrice: 1299, duration: 60, description: 'Relaxing full body massage at home' },
    ]
    for (const svc of beautyServices) {
      await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {},
        create: { ...svc, categoryId: beautyCat.id },
      })
    }
  }

  if (plumbingCat) {
    const plumbingServices = [
      { name: 'Tap & Mixer Repair', slug: 'tap-mixer-repair', basePrice: 199, duration: 30, description: 'Fix leaking taps and mixers' },
      { name: 'Toilet Repair', slug: 'toilet-repair', basePrice: 349, duration: 45, description: 'Flush tank, seat, blockage repair' },
      { name: 'Pipe Leakage Fix', slug: 'pipe-leakage', basePrice: 299, duration: 45, description: 'Fix leaking and burst pipes' },
      { name: 'Water Tank Cleaning', slug: 'water-tank-cleaning', basePrice: 999, duration: 120, description: 'Complete water tank cleaning and sanitization' },
    ]
    for (const svc of plumbingServices) {
      await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {},
        create: { ...svc, categoryId: plumbingCat.id },
      })
    }
  }

  if (electricianCat) {
    const electricianServices = [
      { name: 'Fan Installation/Repair', slug: 'fan-repair', basePrice: 249, duration: 30, description: 'Ceiling and exhaust fan services' },
      { name: 'Switchboard Repair', slug: 'switchboard-repair', basePrice: 199, duration: 30, description: 'Switch, socket, and MCB repair' },
      { name: 'Wiring & Cabling', slug: 'wiring-cabling', basePrice: 499, duration: 60, description: 'New wiring and cable installation' },
      { name: 'Inverter/UPS Installation', slug: 'inverter-installation', basePrice: 399, duration: 45, description: 'Install and configure inverter/UPS' },
    ]
    for (const svc of electricianServices) {
      await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {},
        create: { ...svc, categoryId: electricianCat.id },
      })
    }
  }

  console.log('Seed data created successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
