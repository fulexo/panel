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
    return await this.requestWithRetry(() =>
      this.httpService.post(url, payload, { headers: this.getHeaders() })
    );
  }

  async createShipment(payload: any): Promise<any> {
    this.assertConfigured();
    const url = `${this.karrioApiUrl}/v1/proxy/shipping`;
    this.logger.debug(`Creating shipment with Karrio for reference: ${payload.reference}`);
    return await this.requestWithRetry(() =>
      this.httpService.post(url, payload, { headers: this.getHeaders() })
    );
  }

  async trackShipment(carrierName: string, trackingNumber: string): Promise<any> {
    this.assertConfigured();
    const url = `${this.karrioApiUrl}/v1/proxy/tracking/${carrierName}/${trackingNumber}`;
    this.logger.debug(`Tracking shipment with Karrio: ${carrierName}/${trackingNumber}`);
    return await this.requestWithRetry(() =>
      this.httpService.get(url, { headers: this.getHeaders() })
    );
  }

  private async requestWithRetry<T>(requestFactory: () => any, maxAttempts = 3, baseDelayMs = 300): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data } = await firstValueFrom(
          requestFactory().pipe(
            catchError((error) => {
              const status = error?.response?.status as number | undefined;
              const isTransient = status === 429 || (status !== undefined && status >= 500);
              if (!isTransient) {
                throw new HttpException(
                  'Carrier request failed',
                  status || HttpStatus.BAD_GATEWAY,
                );
              }
              throw error;
            }),
          ),
        );
        return data as T;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 100);
          const delay = baseDelayMs * attempt + jitter;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }
    const status = (lastError?.response?.status as number | undefined) || HttpStatus.BAD_GATEWAY;
    this.logger.error('Karrio request failed after retries', { status });
    throw new HttpException('Carrier service unavailable', status);
  }
}
