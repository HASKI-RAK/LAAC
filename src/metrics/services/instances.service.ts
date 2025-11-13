// Implements REQ-FN-017: Instance Metadata Service
// Provides LRS instance metadata and health status

import { Injectable } from '@nestjs/common';
import { LRSClient } from '../../data-access/clients/lrs.client';
import { LoggerService } from '../../core/logger';
import { LRSInstanceDto, InstancesResponseDto } from '../dto/instance.dto';

/**
 * Instances Service
 * Provides metadata about configured LRS instances
 * Implements REQ-FN-017: Instance Metadata Endpoint
 *
 * @remarks
 * - Returns list of all configured LRS instances
 * - Includes health status (healthy/degraded/unavailable)
 * - Supports multi-LRS configuration from REQ-FN-026
 */
@Injectable()
export class InstancesService {
  constructor(
    private readonly lrsClient: LRSClient,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('InstancesService');
  }

  /**
   * Get list of all configured LRS instances with metadata
   * Implements REQ-FN-017: GET /api/v1/instances endpoint
   *
   * @returns List of LRS instances with health status
   */
  async getInstances(): Promise<InstancesResponseDto> {
    this.logger.log('Fetching LRS instances metadata');

    try {
      // For now, we have a single default LRS instance
      // TODO: REQ-FN-026 will add support for multi-LRS from configuration
      const instanceId = this.lrsClient.instanceId;

      // Get health status from LRS client
      const health = await this.lrsClient.getInstanceHealth();

      const instance: LRSInstanceDto = {
        id: instanceId,
        name: this.getInstanceName(instanceId),
        status: this.mapHealthStatus(health.healthy),
        // lastSync removed - will be added when actual sync tracking is implemented (REQ-FN-026)
      };

      const response: InstancesResponseDto = {
        instances: [instance],
      };

      this.logger.log('LRS instances metadata retrieved', {
        count: response.instances.length,
      });

      return response;
    } catch (error) {
      this.logger.error(
        'Failed to fetch LRS instances metadata',
        error as Error,
      );

      // Return empty list or default instance with unavailable status
      const instanceId = this.lrsClient.instanceId;
      return {
        instances: [
          {
            id: instanceId,
            name: this.getInstanceName(instanceId),
            status: 'unavailable',
          },
        ],
      };
    }
  }

  /**
   * Map health boolean to status string
   * @param healthy - Health check result
   * @returns Status string for API response
   * @private
   */
  private mapHealthStatus(
    healthy: boolean,
  ): 'healthy' | 'degraded' | 'unavailable' {
    return healthy ? 'healthy' : 'unavailable';
  }

  /**
   * Get human-readable name for instance ID
   * @param instanceId - Instance identifier
   * @returns Human-readable name
   * @private
   */
  private getInstanceName(instanceId: string): string {
    // Default mapping for known instance IDs
    const nameMap: Record<string, string> = {
      'hs-ke': 'Hochschule Kempten',
      'hs-rv': 'Hochschule Ravensburg-Weingarten',
      default: 'Default LRS',
    };

    return nameMap[instanceId] || `LRS Instance ${instanceId}`;
  }
}
