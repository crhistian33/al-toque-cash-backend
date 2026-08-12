import { Injectable, Logger, BadGatewayException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { CreateContactDto } from "./dto/create-contact.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>("RESEND_API_KEY") || "dummy-key";
    this.resend = new Resend(apiKey);
  }

  async sendContactEmail(dto: CreateContactDto): Promise<void> {
    const fromEmail = this.configService.get<string>(
      "RESEND_FROM_EMAIL",
      "onboarding@resend.dev",
    );
    const toEmail = this.configService.get<string>("CONTACT_TO_EMAIL");

    if (!toEmail) {
      this.logger.error(
        "CONTACT_TO_EMAIL is not defined in environment variables",
      );
      throw new BadGatewayException("Error de configuración interno");
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `Al Toque Cash Contacto <${fromEmail}>`,
        to: [toEmail],
        replyTo: dto.email,
        subject: `[WEB] Nueva consulta de contacto - ${dto.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #047857;">Nueva consulta desde el formulario de contacto</h2>
            <p><strong>Nombre:</strong> ${dto.name}</p>
            <p><strong>Email:</strong> ${dto.email}</p>
            ${dto.phone ? `<p><strong>Teléfono:</strong> ${dto.phone}</p>` : ""}
            <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #047857;">
              <p style="margin: 0;"><strong>Mensaje:</strong></p>
              <p style="white-space: pre-wrap; margin-top: 10px;">${dto.message}</p>
            </div>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend API error: ${error.message}`, error);
        throw new BadGatewayException(
          "No se pudo enviar el mensaje en este momento",
        );
      }

      this.logger.log(
        `Email de contacto enviado exitosamente para ${dto.email}, resend id: ${data?.id}`,
      );
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado enviando email de contacto: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadGatewayException(
        "No se pudo enviar el mensaje en este momento",
      );
    }
  }
}
