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

const ensureEmploymentIncludes = (config: MetaTableConfig): MetaTableConfig => {
  if (config.name !== "employment") {
    return config;
  }

  const includes = Array.isArray(config.customIncludes) ? [...config.customIncludes] : [];
  const hasEmploymentGroup = includes.some((inc: any) => inc?.association === "employmentGroup");
  const hasEmploymentStatus = includes.some(
    (inc: any) => inc?.association === "employmentStatus"
  );

  if (!hasEmploymentGroup) {
    includes.push({ association: "employmentGroup", attributes: ["id", "dispName"], required: false });
  }
  if (!hasEmploymentStatus) {
    includes.push({
      association: "employmentStatus",
      attributes: ["id", "dispName"],
      required: false
    });
  }

  return {
    ...config,
    customIncludes: includes
  };
};

const getRegistryByTableName = async (): Promise<Record<string, MetaTableConfig>> => {
  if (!registryByTableName) {
    const rawRegistry = await buildRegistryByTableName();
    registryByTableName = Object.fromEntries(
      Object.entries(rawRegistry).map(([key, config]) => [key, ensureEmploymentIncludes(config)])
    );
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
