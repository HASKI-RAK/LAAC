// REQ-FN-018: E2E Test Helper - HTTP Request Utilities
// Provides Supertest request wrappers with authentication support

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from 'supertest';
import { generateJwt, TestTokenOptions } from './auth.helper';

/**
 * Get Supertest agent for HTTP testing
 * @param app - NestJS application instance
 * @returns Supertest agent
 */
export function getTestHttpServer(app: INestApplication) {
  return request(app.getHttpServer());
}

/**
 * Create an authenticated GET request
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param tokenOptions - JWT token options
 * @returns Supertest Test instance with auth header
 */
export function authenticatedGet(
  app: INestApplication,
  url: string,
  tokenOptions: TestTokenOptions = {},
): Test {
  const token = generateJwt(tokenOptions);
  return getTestHttpServer(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Create an authenticated POST request
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param body - Request body
 * @param tokenOptions - JWT token options
 * @returns Supertest Test instance with auth header
 */
export function authenticatedPost(
  app: INestApplication,
  url: string,
  body: Record<string, unknown> = {},
  tokenOptions: TestTokenOptions = {},
): Test {
  const token = generateJwt(tokenOptions);
  return getTestHttpServer(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/**
 * Create an authenticated PUT request
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param body - Request body
 * @param tokenOptions - JWT token options
 * @returns Supertest Test instance with auth header
 */
export function authenticatedPut(
  app: INestApplication,
  url: string,
  body: Record<string, unknown> = {},
  tokenOptions: TestTokenOptions = {},
): Test {
  const token = generateJwt(tokenOptions);
  return getTestHttpServer(app)
    .put(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/**
 * Create an authenticated PATCH request
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param body - Request body
 * @param tokenOptions - JWT token options
 * @returns Supertest Test instance with auth header
 */
export function authenticatedPatch(
  app: INestApplication,
  url: string,
  body: Record<string, unknown> = {},
  tokenOptions: TestTokenOptions = {},
): Test {
  const token = generateJwt(tokenOptions);
  return getTestHttpServer(app)
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/**
 * Create an authenticated DELETE request
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param tokenOptions - JWT token options
 * @returns Supertest Test instance with auth header
 */
export function authenticatedDelete(
  app: INestApplication,
  url: string,
  tokenOptions: TestTokenOptions = {},
): Test {
  const token = generateJwt(tokenOptions);
  return getTestHttpServer(app)
    .delete(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Create a GET request with a specific token
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param token - JWT token string
 * @returns Supertest Test instance with auth header
 */
export function requestWithToken(
  app: INestApplication,
  url: string,
  token: string,
): Test {
  return getTestHttpServer(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Create a POST request with a specific token
 * @param app - NestJS application instance
 * @param url - Request URL
 * @param body - Request body
 * @param token - JWT token string
 * @returns Supertest Test instance with auth header
 */
export function postWithToken(
  app: INestApplication,
  url: string,
  body: Record<string, unknown>,
  token: string,
): Test {
  return getTestHttpServer(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}
