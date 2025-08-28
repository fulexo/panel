import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import fetch from 'node-fetch';

@Injectable()
export class BaseLinkerService {
  private readonly logger = new Logger(BaseLinkerService.name);

  constructor(private settingsService: SettingsService) {}

  async makeRequest(tenantId: string, method: string, parameters: any = {}) {
    // Get API settings from database
    const settings = await this.settingsService.getSettingsByCategory(
      tenantId,
      'baselinker'
    );

    if (!settings.api_key) {
      throw new Error('BaseLinker API key not configured');
    }

    const apiUrl = settings.api_url || 'https://api.baselinker.com/connector.php';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-BLToken': settings.api_key,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          method,
          parameters: JSON.stringify(parameters),
        }),
      });

      const data = await response.json();

      if (data.status === 'ERROR') {
        throw new Error(data.error_message || 'BaseLinker API error');
      }

      return data;
    } catch (error) {
      this.logger.error(`BaseLinker API error: ${error.message}`);
      throw error;
    }
  }

  async testConnection(tenantId: string): Promise<boolean> {
    try {
      // Use a simple method to test the connection
      const response = await this.makeRequest(tenantId, 'getInventories');
      return response.status === 'SUCCESS';
    } catch (error) {
      return false;
    }
  }

  // Product methods
  async getProducts(tenantId: string, inventoryId: number, page = 1) {
    return this.makeRequest(tenantId, 'getInventoryProductsList', {
      inventory_id: inventoryId,
      page,
    });
  }

  async updateProductStock(
    tenantId: string,
    productId: string,
    variantId: string,
    quantity: number
  ) {
    return this.makeRequest(tenantId, 'updateInventoryProductsStock', {
      products: {
        [productId]: {
          [variantId]: quantity,
        },
      },
    });
  }

  // Order methods
  async getOrders(tenantId: string, dateFrom?: number, dateTo?: number) {
    const params: any = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return this.makeRequest(tenantId, 'getOrders', params);
  }

  async getOrder(tenantId: string, orderId: number) {
    return this.makeRequest(tenantId, 'getOrders', {
      order_id: orderId,
    });
  }

  async updateOrderStatus(tenantId: string, orderId: number, statusId: number) {
    return this.makeRequest(tenantId, 'setOrderStatus', {
      order_id: orderId,
      status_id: statusId,
    });
  }

  // Inventory methods
  async getInventories(tenantId: string) {
    return this.makeRequest(tenantId, 'getInventories');
  }

  async getInventoryCategories(tenantId: string, inventoryId: number) {
    return this.makeRequest(tenantId, 'getInventoryCategories', {
      inventory_id: inventoryId,
    });
  }

  // Price lists
  async getPriceLists(tenantId: string) {
    return this.makeRequest(tenantId, 'getInventoryPriceLists');
  }

  // Warehouses
  async getWarehouses(tenantId: string) {
    return this.makeRequest(tenantId, 'getInventoryWarehouses');
  }
}