/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

const BASE_PERMISSIONS = [
  { name: "*", description: "All permissions" },
  { name: "posts:*", description: "All post permissions" },
  { name: "posts:list", description: "Allow listing all posts" },
  { name: "posts:view", description: "Allow viewing a post" },
  { name: "posts:create", description: "Allow creating a post" },
  { name: "posts:update", description: "Allow updating a post" },
  { name: "posts:delete", description: "Allow deleting a post" },
  { name: "events:*", description: "All event permissions" },
  { name: "events:list", description: "Allow listing all events" },
  { name: "events:view", description: "Allow viewing a single event" },
  { name: "events:view", description: "Allow viewing registrations for an event" },
  { name: "events:create", description: "Allow creating an event" },
  { name: "events:update", description: "Allow updating an event" },
  { name: "events:delete", description: "Allow deleting an event" },
  { name: "users:*", description: "Allow creating users from the admin panel" },
  { name: "users:create", description: "Allow creating users from the admin panel" },
  { name: "users:list", description: "Allow listing users from the admin panel" },
  { name: "users:view", description: "Allow viewing user details from the admin panel" },
  { name: "users:update", description: "Allow updating users from the admin panel" },
  { name: "users:delete", description: "Allow deleting users from the admin panel" },
  { name: "roles:*", description: "Allow listing roles" },
  { name: "roles:list", description: "Allow listing roles" },
  { name: "roles:create", description: "Allow creating roles" },
  { name: "roles:update", description: "Allow updating roles" },
  { name: "roles:delete", description: "Allow deleting roles" },
  { name: "permissions:*", description: "Allow listing permissions" },
  { name: "permissions:list", description: "Allow listing permissions" }
];

const deriveWildcardPermissions = () => {
  const wildcardMap = new Map();

  BASE_PERMISSIONS.forEach(({ name }) => {
    const segments = name.split(":");
    if (segments.length <= 1) {
      return;
    }
    segments.pop();
    const moduleKey = segments.join(":");
    const wildcardName = `${moduleKey}:*`;

    if (!wildcardMap.has(wildcardName)) {
      const humanReadableModule = moduleKey.replace(/\./g, " ").replace(/-/g, " ");
      wildcardMap.set(wildcardName, {
        name: wildcardName,
        description: `Allow all ${humanReadableModule} permissions`
      });
    }
  });

  return Array.from(wildcardMap.values());
};

const WILDCARD_PERMISSIONS = deriveWildcardPermissions();
const PERMISSION_CATALOG = [...BASE_PERMISSIONS ];
const WILDCARD_PERMISSION_NAMES = WILDCARD_PERMISSIONS.map((permission) => permission.name);

const buildRows = (Sequelize) =>
  PERMISSION_CATALOG.map((permission) => ({
    disp_name: permission.name,
    description: permission.description,
    status: 1,
    created_at: Sequelize.literal("CURRENT_TIMESTAMP"),
    updated_at: Sequelize.literal("CURRENT_TIMESTAMP")
  }));

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const { Op } = Sequelize;

    try {
      const rows = buildRows(Sequelize);
      const names = rows.map((row) => row.disp_name);

      await queryInterface.bulkDelete(
        "tbl_meta_permission",
        { disp_name: { [Op.in]: names } },
        { transaction }
      );

      await queryInterface.bulkInsert("tbl_meta_permission", rows, { transaction });

      const [adminRole] = await queryInterface.sequelize.query(
        `
          SELECT id
          FROM tbl_meta_user_role
          WHERE disp_name = :adminRoleName
          LIMIT 1
        `,
        {
          replacements: { adminRoleName: "Admin" },
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (adminRole?.id && WILDCARD_PERMISSION_NAMES.length > 0) {
        const [permissionRows] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM tbl_meta_permission
            WHERE disp_name IN (:permissionNames)
          `,
          {
            replacements: { permissionNames: WILDCARD_PERMISSION_NAMES },
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        if (Array.isArray(permissionRows) && permissionRows.length > 0) {
          const permissionIds = permissionRows.map((permission) => permission.id);

          await queryInterface.bulkDelete(
            "tbl_xref_role_permission",
            {
              role_id: adminRole.id,
              permission_id: { [Op.in]: permissionIds }
            },
            { transaction }
          );

          const timestampLiteral = Sequelize.literal("CURRENT_TIMESTAMP");
          const adminAssignments = permissionIds.map((permissionId) => ({
            role_id: adminRole.id,
            permission_id: permissionId,
            status: 1,
            created_at: timestampLiteral,
            updated_at: timestampLiteral
          }));

          await queryInterface.bulkInsert("tbl_xref_role_permission", adminAssignments, {
            transaction
          });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize;
    const names = PERMISSION_CATALOG.map((permission) => permission.name);

    await queryInterface.bulkDelete(
      "tbl_meta_permission",
      { disp_name: { [Op.in]: names } }
    );
  }
};
