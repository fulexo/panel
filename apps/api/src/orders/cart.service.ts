import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async getCart(tenantId: string, userId: string, storeId: string) {
    const cart = await this.runTenant(tenantId, async (db) => 
      db.cart.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  stockQuantity: true,
                  images: true,
                  active: true,
                },
              },
            },
          },
        },
      })
    );

    if (!cart) {
      // Create empty cart if it doesn't exist
      return this.runTenant(tenantId, async (db) => 
        db.cart.create({
          data: {
            tenantId,
            userId,
            storeId,
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                    stockQuantity: true,
                    images: true,
                    active: true,
                  },
                },
              },
            },
          },
        })
      );
    }

    return cart;
  }

  async addToCart(tenantId: string, userId: string, storeId: string, dto: AddToCartDto) {
    // Verify product exists and is available
    const product = await this.runTenant(tenantId, async (db) => 
      db.product.findFirst({
        where: {
          id: dto.productId,
          tenantId,
          storeId,
          active: true,
        },
      })
    );

    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    if (product.stockQuantity !== null && product.stockQuantity < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Get or create cart
    let cart = await this.runTenant(tenantId, async (db) => 
      db.cart.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })
    );

    if (!cart) {
      cart = await this.runTenant(tenantId, async (db) => 
        db.cart.create({
          data: {
            tenantId,
            userId,
            storeId,
          },
        })
      );
    }

    // Check if item already exists in cart
    const existingItem = await this.runTenant(tenantId, async (db) => 
      db.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: dto.productId,
          },
        },
      })
    );

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + dto.quantity;
      if (product.stockQuantity !== null && product.stockQuantity < newQuantity) {
        throw new BadRequestException('Insufficient stock for requested quantity');
      }

      return this.runTenant(tenantId, async (db) => 
        db.cartItem.update({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: dto.productId,
            },
          },
          data: {
            quantity: newQuantity,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stockQuantity: true,
                images: true,
                active: true,
              },
            },
          },
        })
      );
    } else {
      // Add new item
      return this.runTenant(tenantId, async (db) => 
        db.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            quantity: dto.quantity,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stockQuantity: true,
                images: true,
                active: true,
              },
            },
          },
        })
      );
    }
  }

  async updateCartItem(tenantId: string, userId: string, storeId: string, productId: string, dto: UpdateCartItemDto) {
    const cart = await this.runTenant(tenantId, async (db) => 
      db.cart.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })
    );

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.runTenant(tenantId, async (db) => 
      db.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        include: {
          product: true,
        },
      })
    );

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    // Check stock availability
    if (cartItem.product.stockQuantity !== null && cartItem.product.stockQuantity < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    if (dto.quantity <= 0) {
      // Remove item from cart
      await this.runTenant(tenantId, async (db) => 
        db.cartItem.delete({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId,
            },
          },
        })
      );
      return null;
    }

    // Update quantity
    return this.runTenant(tenantId, async (db) => 
      db.cartItem.update({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        data: {
          quantity: dto.quantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stockQuantity: true,
              images: true,
              active: true,
            },
          },
        },
      })
    );
  }

  async removeFromCart(tenantId: string, userId: string, storeId: string, productId: string) {
    const cart = await this.runTenant(tenantId, async (db) => 
      db.cart.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })
    );

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.runTenant(tenantId, async (db) => 
      db.cartItem.delete({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      })
    );

    return { message: 'Item removed from cart' };
  }

  async clearCart(tenantId: string, userId: string, storeId: string) {
    const cart = await this.runTenant(tenantId, async (db) => 
      db.cart.findUnique({
        where: {
          userId_storeId: {
            userId,
            storeId,
          },
        },
      })
    );

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.runTenant(tenantId, async (db) => 
      db.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      })
    );

    return { message: 'Cart cleared' };
  }

  async getCartSummary(tenantId: string, userId: string, storeId: string) {
    const cart = await this.getCart(tenantId, userId, storeId);
    
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + (Number(item.product.price) * item.quantity);
    }, 0);

    return {
      cart,
      summary: {
        totalItems,
        totalAmount,
        itemCount: cart.items.length,
      },
    };
  }
}