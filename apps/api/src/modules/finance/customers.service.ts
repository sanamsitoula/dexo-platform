import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAllCustomers(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { invoices: true, paymentsReceived: true } } },
    });
  }

  async findOneCustomer(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        paymentsReceived: { orderBy: { paymentDate: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async createCustomer(tenantId: string, dto: any) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        customerCode: dto.customerCode,
        name: dto.name,
        pan: dto.pan,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        creditLimit: dto.creditLimit || 0,
        isVatRegistered: dto.isVatRegistered || false,
        taxGroupId: dto.taxGroupId || null,
      },
    });
  }

  async updateCustomer(tenantId: string, id: string, dto: any) {
    await this.findOneCustomer(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        customerCode: dto.customerCode,
        name: dto.name,
        pan: dto.pan,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        creditLimit: dto.creditLimit,
        isVatRegistered: dto.isVatRegistered,
        taxGroupId: dto.taxGroupId,
        isActive: dto.isActive,
      },
    });
  }

  async findAllSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { bills: true } } },
    });
  }

  async findOneSupplier(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: { bills: { orderBy: { billDate: 'desc' }, take: 10 } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async createSupplier(tenantId: string, dto: any) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        supplierCode: dto.supplierCode,
        name: dto.name,
        pan: dto.pan,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        isVatRegistered: dto.isVatRegistered || false,
        paymentTermsDays: dto.paymentTermsDays || 30,
        taxGroupId: dto.taxGroupId || null,
      },
    });
  }

  async updateSupplier(tenantId: string, id: string, dto: any) {
    await this.findOneSupplier(tenantId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        supplierCode: dto.supplierCode,
        name: dto.name,
        pan: dto.pan,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        isVatRegistered: dto.isVatRegistered,
        paymentTermsDays: dto.paymentTermsDays,
        taxGroupId: dto.taxGroupId,
        isActive: dto.isActive,
      },
    });
  }
}
