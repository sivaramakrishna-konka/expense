const request = require('supertest');
const express = require('express');
const app = require('../app'); // Assuming your Express app is exported

describe('Health Check', () => {
  it('GET /health should return 200 and health message', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Server is healthy');
  });
});

describe('GET /api/entries', () => {
  it('should return entries from the API', async () => {
    const res = await request(app).get('/api/entries');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true); // Assuming it returns an array
  });
});
