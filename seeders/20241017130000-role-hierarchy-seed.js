/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

const ROLE_CATALOG = [
  { name: "Admin", description: "Overall administrator" },
  { name: "Operation Incharge", description: "Oversees operational aspects" },
  { name: "Ward Incharge", description: "Responsible for ward-level operations" },
  { name: "Booth Incharge", description: "Manages individual booths" },
  { name: "Booth Sub Incharge", description: "Supports booth level operations" },
  { name: "Page Paramukh", description: "Grassroot coordinator" },
  { name: "Community Incharge", description: "Engages with community stakeholders" },
  { name: "Office Administration Incharge", description: "Manages office administration" },
  { name: "Personal Assistant", description: "Supports administrative tasks" },
  { name: "Help Desk", description: "Handles incoming requests and assistance" },
  { name: "Public Hospitality", description: "Manages hospitality initiatives" },
  { name: "Sector Incharge", description: "Oversees sector specific operations" },
  { name: "Social Media", description: "Handles social media outreach" },
  { name: "Society Implements", description: "Coordinates society level implementations" },
  { name: "Health Sector", description: "Manages health related initiatives" },
  { name: "Education Sector", description: "Handles education programs" },
  { name: "Gov Schemes", description: "Tracks government schemes" },
  { name: "public", description: "Default public user role" }
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const roleNames = ROLE_CATALOG.map((role) => role.name);

      await queryInterface.bulkDelete(
        "tbl_meta_user_role",
        { disp_name: roleNames },
        { transaction }
      );

      const roleRows = ROLE_CATALOG.map((role) => ({
        disp_name: role.name,
        description: role.description,
        status: 1,
        created_at: Sequelize.literal("CURRENT_TIMESTAMP"),
        updated_at: Sequelize.literal("CURRENT_TIMESTAMP")
      }));

      await queryInterface.bulkInsert("tbl_meta_user_role", roleRows, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const roleNames = ROLE_CATALOG.map((role) => role.name);
    await queryInterface.bulkDelete(
      "tbl_meta_user_role",
      { disp_name: roleNames }
    );
  }
};
