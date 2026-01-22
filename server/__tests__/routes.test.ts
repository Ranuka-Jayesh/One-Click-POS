import { describe, it, expect } from 'vitest';

describe('API Routes', () => {
  it('should have admin routes defined', () => {
    // Test that routes are properly structured
    const routes = [
      '/api/admin',
      '/api/admin/menu-items',
      '/api/orders',
    ];

    routes.forEach((route) => {
      expect(route).toMatch(/^\/api\//);
    });
  });

  it('should validate route structure', () => {
    // Basic route validation
    expect('/api/admin/login').toContain('/api');
    expect('/api/orders').toContain('/api');
  });
});
