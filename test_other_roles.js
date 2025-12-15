const { sequelize } = require("./dist/models");
const MetaUserRole = require("./dist/models/MetaUserRole").default;
const RoleSidebar = require("./dist/models/RoleSidebar").default;

async function testOtherRoles() {
  try {
    // Get all roles
    const allRoles = await MetaUserRole.findAll({
      attributes: ["id", "dispName"],
      order: [["id", "ASC"]]
    });

    console.log("\n=== All Roles ===");
    allRoles.forEach(role => {
      console.log(`${role.id}: ${role.dispName}`);
    });

    // Get sidebar assignments for each role
    console.log("\n=== Sidebar Assignments by Role ===");
    for (const role of allRoles) {
      const sidebars = await RoleSidebar.findAll({
        where: { roleId: role.id, status: 1 },
        attributes: ["sidebarId"],
        raw: true
      });
      
      const sidebarIds = sidebars.map(s => s.sidebarId).sort((a, b) => a - b);
      console.log(`Role ${role.id} (${role.dispName}): [${sidebarIds.join(", ")}]`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testOtherRoles();
