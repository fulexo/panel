import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class KarrioService {
  private readonly logger = new Logger(KarrioService.name);
  private readonly karrioApiUrl: string;
  private readonly apiToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const rawApiUrl = this.configService.get<string>('KARRIO_API_URL');
    this.karrioApiUrl = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : '';
    this.apiToken = this.configService.get<string>('FULEXO_TO_KARRIO_API_TOKEN') || '';
  }

  private getHeaders() {
    this.assertConfigured();
    return {
      Authorization: `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private assertConfigured() {
    if (!this.karrioApiUrl || !this.apiToken) {
      throw new HttpException('Karrio integration is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async getRates(payload: any): Promise<any> {
    this.assertConfigured();
    const url = `${this.karrioApiUrl}/v1/proxy/rates`;
    this.logger.debug(`Requesting rates from Karrio for reference: ${payload.reference}`);
    const { data } = await firstValueFrom(
      this.httpService.post(url, payload, { headers: this.getHeaders() }).pipe(
        catchError((error) => {
          this.logger.error('Karrio rate request failed!', error.response?.data);
          throw new HttpException('Failed to get rates from carrier.', error.response?.status || 500);
        }),
      ),
    );
    return data;
  }

  async createShipment(payload: any): Promise<any> {
    this.assertConfigured();
    const url = `${this.karrioApiUrl}/v1/proxy/shipping`;
    this.logger.debug(`Creating shipment with Karrio for reference: ${payload.reference}`);
    const { data } = await firstValueFrom(
      this.httpService.post(url, payload, { headers: this.getHeaders() }).pipe(
        catchError((error) => {
          this.logger.error('Karrio shipment creation failed!', error.response?.data);
          throw new HttpException('Failed to create shipment.', error.response?.status || 500);
        }),
      ),
    );
    return data;
  }

  async trackShipment(carrierName: string, trackingNumber: string): Promise<any> {
    this.assertConfigured();
    const url = `${this.karrioApiUrl}/v1/proxy/tracking/${carrierName}/${trackingNumber}`;
    this.logger.debug(`Tracking shipment with Karrio: ${carrierName}/${trackingNumber}`);
    const { data } = await firstValueFrom(
      this.httpService.get(url, { headers: this.getHeaders() }).pipe(
        catchError((error) => {
          this.logger.error('Karrio shipment tracking failed!', error.response?.data);
          throw new HttpException('Failed to track shipment.', error.response?.status || 500);
        }),
      ),
    );
    return data;
  }
}
