/**
 * Storage adapter factory
 */

import { StorageFormat } from '../types';
import { BaseStorageAdapter } from './base';
import { JsonStorageAdapter } from './json-adapter';
import { YamlStorageAdapter } from './yaml-adapter';

export class StorageAdapterFactory {
  static create(format: StorageFormat, dataDir: string): BaseStorageAdapter {
    switch (format) {
      case StorageFormat.JSON:
        return new JsonStorageAdapter(dataDir);
      case StorageFormat.YAML:
        return new YamlStorageAdapter(dataDir);
      default:
        throw new Error(`Unsupported storage format: ${format}`);
    }
  }
}

export { BaseStorageAdapter };
export { JsonStorageAdapter };
export { YamlStorageAdapter };
