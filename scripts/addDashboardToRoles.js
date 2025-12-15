const sequelize = require("../dist/config/database").default;
const RoleSidebar = require("../dist/models/RoleSidebar").default;

const addDashboardToRoles = async () => {
  try {
    const roleIds = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // All roles except Public (2)
    const sidebarId = 12; // Dashboard

    for (const roleId of roleIds) {
      const [record, created] = await RoleSidebar.findOrCreate({
        where: { roleId, sidebarId },
        defaults: {
          roleId,
          sidebarId,
          status: 1,
          createdBy: 999999,
          updatedBy: 999999
        }
      });

      if (!created) {
        await record.update({ status: 1, updatedBy: 999999 });
        console.log(`Updated Dashboard for role ${roleId}`);
      } else {
        console.log(`Created Dashboard for role ${roleId}`);
      }
    }

    console.log("✅ Dashboard added to all non-Public roles");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding dashboard:", error);
    process.exit(1);
  }
};

addDashboardToRoles();
