import { maxMapPoints, maxScanPoints } from './LidarConfig';
import { PointCloudBuffer } from './PointCloudBuffer';
import { PointCloudMapper } from './PointCloudMapper';

export const mappingRuntime = {
  live: new PointCloudBuffer(maxScanPoints),
  mapper: new PointCloudMapper(0.1, maxMapPoints),
};
