import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { CustomersService } from './customers.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('customers')
  findAllCustomers(@Req() req: any) {
    return this.customersService.findAllCustomers(req.user.tenantId);
  }

  @Get('customers/:id')
  findOneCustomer(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOneCustomer(req.user.tenantId, id);
  }

  @Post('customers')
  createCustomer(@Req() req: any, @Body() dto: any) {
    return this.customersService.createCustomer(req.user.tenantId, dto);
  }

  @Put('customers/:id')
  updateCustomer(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.updateCustomer(req.user.tenantId, id, dto);
  }

  @Get('suppliers')
  findAllSuppliers(@Req() req: any) {
    return this.customersService.findAllSuppliers(req.user.tenantId);
  }

  @Get('suppliers/:id')
  findOneSupplier(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOneSupplier(req.user.tenantId, id);
  }

  @Post('suppliers')
  createSupplier(@Req() req: any, @Body() dto: any) {
    return this.customersService.createSupplier(req.user.tenantId, dto);
  }

  @Put('suppliers/:id')
  updateSupplier(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.updateSupplier(req.user.tenantId, id, dto);
  }
}
