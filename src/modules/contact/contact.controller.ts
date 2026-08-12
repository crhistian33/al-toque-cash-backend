import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ApiResponse, ok } from '../../common';

@ApiTags('Contact')
@Controller('contact')
@UseGuards(ThrottlerGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar un mensaje de contacto desde la web pública' })
  @SwaggerResponse({ status: 200, description: 'Mensaje enviado correctamente' })
  @SwaggerResponse({ status: 400, description: 'Datos del formulario inválidos' })
  @SwaggerResponse({ status: 429, description: 'Demasiadas solicitudes (rate limit)' })
  @SwaggerResponse({ status: 502, description: 'Error al enviar el email por proveedor de correo' })
  async sendContact(@Body() createContactDto: CreateContactDto): Promise<ApiResponse<{ success: boolean }>> {
    await this.contactService.sendContactEmail(createContactDto);
    return ok({ success: true }, 'Mensaje enviado correctamente');
  }
}
