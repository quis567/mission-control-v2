import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const { packageTemplateId, addonTemplateIds, customServices } = await req.json();

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const created: any[] = [];

    // Assign package
    if (packageTemplateId) {
      const template = await prisma.serviceTemplate.findUnique({ where: { id: packageTemplateId } });
      if (template) {
        const service = await prisma.service.create({
          data: {
            clientId,
            serviceType: template.name,
            status: 'active',
            billingType: template.billingType,
            price: template.price,
            notes: template.description,
            startDate: new Date(),
          },
        });
        created.push(service);
      }
    }

    // Assign add-ons
    if (addonTemplateIds?.length) {
      for (const templateId of addonTemplateIds) {
        const template = await prisma.serviceTemplate.findUnique({ where: { id: templateId } });
        if (template) {
          const service = await prisma.service.create({
            data: {
              clientId,
              serviceType: template.name,
              status: 'active',
              billingType: template.billingType,
              price: template.price,
              notes: template.description,
              startDate: new Date(),
            },
          });
          created.push(service);
        }
      }
    }

    // Custom services
    if (customServices?.length) {
      for (const cs of customServices) {
        const service = await prisma.service.create({
          data: {
            clientId,
            serviceType: cs.name,
            status: 'active',
            billingType: cs.billingType || 'one-time',
            price: cs.price || 0,
            notes: cs.description || null,
            startDate: new Date(),
          },
        });
        created.push(service);
      }
    }

    // Recalculate monthly revenue
    const allServices = await prisma.service.findMany({ where: { clientId, status: 'active' } });
    const monthlyRevenue = allServices
      .filter(s => s.billingType === 'monthly')
      .reduce((sum, s) => sum + (s.price || 0), 0);

    await prisma.client.update({ where: { id: clientId }, data: { monthlyRevenue } });

    return NextResponse.json({ success: true, created: created.length, monthlyRevenue });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
