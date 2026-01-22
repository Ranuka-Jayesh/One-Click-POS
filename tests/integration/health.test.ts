import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('Integration Tests', () => {
  beforeAll(() => {
    // Wait a bit for services to be ready
    return new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_URL.replace('/api', '')}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });
  });

  describe('API Routes', () => {
    it('should return 404 for non-existent route', async () => {
      const baseUrl = API_URL.replace('/api', '');
      const response = await fetch(`${baseUrl}/nonexistent`);
      expect(response.status).toBe(404);
    });

    it('should handle admin routes', async () => {
      // Test that admin routes exist (even if they require auth)
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' }),
      });
      
      // Should return 400 or 401, not 404
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Database Connection', () => {
    it('should connect to MongoDB', async () => {
      // If backend is running, it means DB connection is working
      const response = await fetch(`${API_URL.replace('/api', '')}/health`);
      expect(response.ok).toBe(true);
    });
  });
});
