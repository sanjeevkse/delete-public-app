import { Sequelize } from "sequelize";

import env from "./env";
import { benchmarkLogger } from "./queryLogger";
import { watcherEmitter } from "@lensjs/watchers";

// Custom logger that filters out Telescope queries
const customLogger = (sql: string, timing?: number) => {
  // Skip logging Telescope's own queries
  if (sql.includes("telescope")) {
    return;
  }
  console.log(sql);

  if (typeof timing === "number") {
    try {
      void watcherEmitter.emit("sequelizeQuery", {
        sql,
        timing
      });
    } catch (error) {
      console.warn("Failed to emit query to Lens", error);
    }
  }
};

const sequelize = new Sequelize(env.database.name, env.database.user, env.database.password, {
  host: env.database.host,
  port: env.database.port,
  dialect: env.database.dialect,
  define: {
    underscored: false,
    freezeTableName: true,
    timestamps: false
  },
  logging: env.nodeEnv === "development" ? customLogger : false,
  benchmark: true, // Enable benchmark mode to get query timing
  logQueryParameters: true // Log query parameters for better debugging
});

// Add Telescope query logging hook
if (process.env.TELESCOPE_ENABLED !== "false") {
  sequelize.addHook("afterQuery", (options: any, query: any) => {
    if (query && options.benchmark !== undefined) {
      benchmarkLogger(query.sql || "", options.benchmark);
    }
  });
}

export default sequelize;
