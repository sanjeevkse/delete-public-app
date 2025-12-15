const sequelize = require("../dist/config/database").default;
const RoleSidebar = require("../dist/models/RoleSidebar").default;

const assignSidebarsToAdmin = async () => {
  try {
    const adminRoleId = 1;
    const sidebarIds = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // All sidebars except Requests, Profile, Dashboard

    for (const sidebarId of sidebarIds) {
      const [record, created] = await RoleSidebar.findOrCreate({
        where: { roleId: adminRoleId, sidebarId },
        defaults: {
          roleId: adminRoleId,
          sidebarId,
          status: 1,
          createdBy: 999999,
          updatedBy: 999999
        }
      });

      if (created) {
        console.log(`✅ Sidebar ${sidebarId} assigned to Admin`);
      }
    }

    console.log("✅ All sidebars assigned to Admin role");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

assignSidebarsToAdmin();
