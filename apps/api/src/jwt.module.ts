import { Module, Global, OnModuleInit } from '@nestjs/common';
import { JwtService } from './jwt';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: JwtService,
      useFactory: async (prisma: PrismaService) => {
        const jwtService = new JwtService(prisma);
        await jwtService.init();
        return jwtService;
      },
      inject: [PrismaService],
    },
    PrismaService,
  ],
  exports: [JwtService],
})
export class JwtModule implements OnModuleInit {
  constructor(private jwtService: JwtService) {}

  async onModuleInit() {
    // JWT service is already initialized in the factory
  }
}
