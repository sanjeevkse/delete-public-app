import { Sequelize } from "sequelize";

import env from "./env";

const sequelize = new Sequelize(env.database.name, env.database.user, env.database.password, {
  host: env.database.host,
  port: env.database.port,
  dialect: env.database.dialect,
  define: {
    underscored: false,
    freezeTableName: true,
    timestamps: false
  },
  logging: env.nodeEnv === "development" ? console.log : false
});

export default sequelize;
