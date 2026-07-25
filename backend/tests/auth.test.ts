import request from 'supertest';
import app from '../src/app';

// Mock DB synchronization and authentication
jest.mock('../src/config/db', () => ({
  sequelize: {
    sync: jest.fn().mockResolvedValue(true),
    authenticate: jest.fn().mockResolvedValue(true),
  },
  connectDB: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    geoAdd: jest.fn().mockResolvedValue(true),
    publish: jest.fn().mockResolvedValue(true),
  },
  connectRedis: jest.fn().mockResolvedValue(true),
}));

describe('Authentication API Endpoints', () => {
  it('GET / should return system online status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'online');
  });

  it('POST /api/v1/auth/login should fail validation with missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /api/v1/auth/register should fail validation with missing field parameters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@gmail.com' });
    expect(res.statusCode).toEqual(400);
  });
});
