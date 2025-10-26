/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

const PERMISSION_GROUP_DEFINITIONS = [
  {
    action: "*",
    label: "Global Access",
    description: "Platform-wide access controls",
    permissions: [{ name: "*", description: "All permissions" }]
  },
  {
    action: "posts:*",
    label: "Post Management",
    description: "Manage community posts",
    permissions: [
      { name: "posts:*", description: "Allow all posts actions" },
      { name: "posts:list", description: "Allow listing all posts" },
      { name: "posts:view", description: "Allow viewing a post" },
      { name: "posts:create", description: "Allow creating a post" },
      { name: "posts:update", description: "Allow updating a post" },
      { name: "posts:delete", description: "Allow deleting a post" }
    ]
  },
  {
    action: "events:*",
    label: "Event Management",
    description: "Coordinate events and registrations",
    permissions: [
      { name: "events:*", description: "Allow all events actions" },
      { name: "events:list", description: "Allow listing all events" },
      { name: "events:view", description: "Allow viewing a single event" },
      {
        name: "events:registrations:list",
        description: "Allow viewing registrations for an event"
      },
      { name: "events:create", description: "Allow creating an event" },
      { name: "events:update", description: "Allow updating an event" },
      { name: "events:delete", description: "Allow deleting an event" }
    ]
  },
  {
    action: "users:*",
    label: "User Administration",
    description: "Manage member accounts",
    permissions: [
      { name: "users:*", description: "Allow all users actions" },
      { name: "users:create", description: "Allow creating users from the admin panel" },
      { name: "users:list", description: "Allow listing users from the admin panel" },
      { name: "users:view", description: "Allow viewing user details from the admin panel" },
      { name: "users:update", description: "Allow updating users from the admin panel" },
      { name: "users:delete", description: "Allow deleting users from the admin panel" }
    ]
  },
  {
    action: "roles:*",
    label: "Role Administration",
    description: "Manage system roles",
    permissions: [
      { name: "roles:*", description: "Allow all roles actions" },
      { name: "roles:list", description: "Allow listing roles" },
      { name: "roles:create", description: "Allow creating roles" },
      { name: "roles:update", description: "Allow updating roles" },
      { name: "roles:delete", description: "Allow deleting roles" }
    ]
  },
  {
    action: "permissions:*",
    label: "Permission Catalog",
    description: "Inspect platform permissions",
    permissions: [
      { name: "permissions:*", description: "Allow all permissions actions" },
      { name: "permissions:list", description: "Allow listing permissions" }
    ]
  }
];

const GROUP_ACTIONS = PERMISSION_GROUP_DEFINITIONS.map((group) => group.action);

const PERMISSION_CATALOG = PERMISSION_GROUP_DEFINITIONS.flatMap((group) =>
  group.permissions.map((permission) => ({
    ...permission,
    groupAction: group.action
  }))
);

const PERMISSION_NAMES = PERMISSION_CATALOG.map((permission) => permission.name);

const buildGroupRows = (Sequelize) =>
  PERMISSION_GROUP_DEFINITIONS.map((group) => ({
    label: group.label,
    description: group.description,
    action: group.action,
    action_url: null,
    status: 1,
    created_at: Sequelize.literal("CURRENT_TIMESTAMP"),
    updated_at: Sequelize.literal("CURRENT_TIMESTAMP")
  }));

const buildPermissionRows = (Sequelize, groupIdLookup) =>
  PERMISSION_CATALOG.map((permission) => {
    const permissionGroupId = groupIdLookup.get(permission.groupAction);
    if (!permissionGroupId) {
      throw new Error(`Missing permission group for action ${permission.groupAction}`);
    }

    return {
      disp_name: permission.name,
      description: permission.description,
      permission_group_id: permissionGroupId,
      status: 1,
      created_at: Sequelize.literal("CURRENT_TIMESTAMP"),
      updated_at: Sequelize.literal("CURRENT_TIMESTAMP")
    };
  });

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const { Op } = Sequelize;

    try {
      const groupRows = buildGroupRows(Sequelize);

      await queryInterface.bulkDelete(
        "tbl_meta_permission",
        { disp_name: { [Op.in]: PERMISSION_NAMES } },
        { transaction }
      );

      await queryInterface.bulkDelete(
        "tbl_meta_permission_group",
        { action: { [Op.in]: GROUP_ACTIONS } },
        { transaction }
      );

      await queryInterface.bulkInsert(
        "tbl_meta_permission_group",
        groupRows,
        { transaction }
      );

      const groupRecords = await queryInterface.sequelize.query(
        `
          SELECT id, action
          FROM tbl_meta_permission_group
          WHERE action IN (:actions)
        `,
        {
          replacements: { actions: GROUP_ACTIONS },
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (!Array.isArray(groupRecords) || groupRecords.length === 0) {
        throw new Error("Failed to resolve permission group records.");
      }

      const groupIdLookup = new Map();
      groupRecords.forEach((record) => {
        groupIdLookup.set(record.action, record.id);
      });

      if (groupIdLookup.size !== GROUP_ACTIONS.length) {
        throw new Error("Failed to resolve all permission groups for seeding.");
      }

      const permissionRows = buildPermissionRows(Sequelize, groupIdLookup);

      await queryInterface.bulkInsert(
        "tbl_meta_permission",
        permissionRows,
        { transaction }
      );

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

      if (adminRole?.id && PERMISSION_NAMES.length > 0) {
        const permissionRows = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM tbl_meta_permission
            WHERE disp_name IN (:permissionNames)
          `,
          {
            replacements: { permissionNames: PERMISSION_NAMES },
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

    await queryInterface.bulkDelete(
      "tbl_meta_permission",
      { disp_name: { [Op.in]: PERMISSION_NAMES } }
    );

    await queryInterface.bulkDelete(
      "tbl_meta_permission_group",
      { action: { [Op.in]: GROUP_ACTIONS } }
    );
  }
};
