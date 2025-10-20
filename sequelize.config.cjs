require("dotenv").config();

const defaultConfig = {
  username: process.env.DB_USER ?? "dev",
  password: process.env.DB_PASSWORD ?? "devpass",
  database: process.env.DB_NAME ?? "appdb",
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number.parseInt(process.env.DB_PORT ?? "3306", 10),
  dialect: process.env.DB_DIALECT ?? "mysql",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  define: {
    underscored: false,
    freezeTableName: true
  }
};

module.exports = {
  development: defaultConfig,
  test: {
    ...defaultConfig,
    database: process.env.DB_NAME_TEST ?? `${defaultConfig.database}_test`
  },
  production: {
    ...defaultConfig,
    logging: false
  }
};
