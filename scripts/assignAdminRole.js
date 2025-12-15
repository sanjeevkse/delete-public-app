const sequelize = require("../dist/config/database").default;
const UserRole = require("../dist/models/UserRole").default;

const assignAdminRole = async () => {
  try {
    const [record, created] = await UserRole.findOrCreate({
      where: { userId: 30, roleId: 1 }, // User 30, Admin role
      defaults: {
        userId: 30,
        roleId: 1,
        status: 1,
        createdBy: 999999,
        updatedBy: 999999
      }
    });

    if (created) {
      console.log("✅ Admin role assigned to user 30");
    } else {
      console.log("ℹ️  User 30 already has Admin role");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

assignAdminRole();
