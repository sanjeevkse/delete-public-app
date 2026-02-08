import type { ModelStatic } from "sequelize";

import MetaTableRegistry from "../models/MetaTableRegistry";

interface MetaTableConfig {
  name: string;
  tableName: string;
  displayName: string;
  model: ModelStatic<any>;
  description: string;
  primaryKey: string;
  searchableFields: string[];
  hasStatus?: boolean;
  customIncludes?: any[];
}

const modelCache = new Map<string, ModelStatic<any>>();
let registryByTableName: Record<string, MetaTableConfig> | null = null;

const loadModel = (modelName: string): ModelStatic<any> => {
  if (modelCache.has(modelName)) {
    return modelCache.get(modelName)!;
  }

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const modelModule = require(`../models/${modelName}`);
  const model = modelModule.default || modelModule;
  modelCache.set(modelName, model);
  return model;
};

const buildRegistryByTableName = async (): Promise<Record<string, MetaTableConfig>> => {
  const registry: Record<string, MetaTableConfig> = {};

  const configs = await MetaTableRegistry.findAll({
    attributes: [
      "name",
      "tableName",
      "displayName",
      "description",
      "primaryKey",
      "searchableFields",
      "hasStatus",
      "customIncludes",
      "modelName"
    ]
  });

  for (const config of configs) {
    const model = loadModel(config.modelName);
    registry[config.tableName] = {
      name: config.name,
      tableName: config.tableName,
      displayName: config.displayName,
      description: config.description || "",
      primaryKey: config.primaryKey,
      searchableFields: config.searchableFields,
      hasStatus: config.hasStatus === 1,
      customIncludes: config.customIncludes || undefined,
      model
    };
  }

  return registry;
};

const getRegistryByTableName = async (): Promise<Record<string, MetaTableConfig>> => {
  if (!registryByTableName) {
    registryByTableName = await buildRegistryByTableName();
  }
  return registryByTableName;
};

export const getMetaTableByTableName = async (
  tableName: string
): Promise<MetaTableConfig | null> => {
  const registry = await getRegistryByTableName();
  return registry[tableName] ?? null;
};

export const invalidateMetaTableRegistryCache = (): void => {
  registryByTableName = null;
};
