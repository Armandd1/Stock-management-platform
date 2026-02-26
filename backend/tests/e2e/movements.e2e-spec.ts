import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('MovementsController (e2e)', () => {
  let app: NestFastifyApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api/v1');
    await app.register(fastifyCookie, { secret: 'test-secret' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Login as admin to get token (using seeded credentials)
    const loginRes = await request(app.getHttpServer() as any)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!',
      });

    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should prevent OUT movement if stock is insufficient', async () => {
    // 1. Create a transient product
    const productRes = await request(app.getHttpServer() as any)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sku: 'TEST-NEG-STOCK-' + Date.now(),
        name: 'Negative Stock Test Product',
        price: 100,
      });

    const productId = productRes.body.id;

    // 2. Add some initial stock (10 units)
    await request(app.getHttpServer() as any)
      .post('/api/v1/movements')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'IN',
        productId,
        quantity: 10,
        toWarehouseId: 1,
      });

    // 3. Attempt to take OUT 11 units -> should fail
    const outRes = await request(app.getHttpServer() as any)
      .post('/api/v1/movements')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'OUT',
        productId,
        quantity: 11,
        fromWarehouseId: 1,
      });

    expect(outRes.status).toBe(400);
    expect(outRes.body.error.message).toContain('Insufficient stock');
  });
});
