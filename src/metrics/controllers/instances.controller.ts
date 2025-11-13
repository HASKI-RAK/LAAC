// Implements REQ-FN-017: Instance Metadata Controller
// REST endpoint for LRS instance metadata

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequireScopes } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { InstancesService } from '../services/instances.service';
import { InstancesResponseDto } from '../dto/instance.dto';

/**
 * Instances Controller
 * Provides REST endpoint for LRS instance metadata
 * Implements REQ-FN-017: Instance Metadata Endpoint
 */
@ApiTags('Instances')
@ApiBearerAuth('JWT-auth')
@Controller('instances')
@UseGuards(JwtAuthGuard, ScopesGuard)
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  /**
   * Get list of configured LRS instances
   * Returns metadata including id, name, status, lastSync
   *
   * Implements REQ-FN-017: GET /api/v1/instances endpoint
   *
   * @returns List of LRS instances with health status
   */
  @Get()
  @RequireScopes('analytics:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all configured LRS instances',
    description:
      'Returns metadata for all configured LRS instances. ' +
      'Each instance includes id, name, health status, and last sync timestamp. ' +
      'Requires analytics:read scope. ' +
      'Implements REQ-FN-017: Multi-Instance Support',
  })
  @ApiResponse({
    status: 200,
    description: 'Instances retrieved successfully',
    type: InstancesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing required scope: analytics:read',
  })
  async getInstances(): Promise<InstancesResponseDto> {
    return await this.instancesService.getInstances();
  }
}
