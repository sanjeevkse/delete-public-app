const { sequelize } = require("./dist/models");
const User = require("./dist/models/User").default;
const UserRole = require("./dist/models/UserRole").default;

async function createWardInchargeUser() {
  try {
    const timestamp = Date.now().toString().slice(-10);
    const contactNumber = timestamp;

    const newUser = await User.create({
      contactNumber,
      status: 1,
      createdBy: 1,
      updatedBy: 1
    });

    // Assign Ward Incharge role (id=10) - has only Dashboard
    await UserRole.create({
      userId: newUser.id,
      roleId: 10,
      createdBy: 1,
      updatedBy: 1
    });

    console.log(`Created Ward Incharge user with ID: ${newUser.id}, Contact: ${contactNumber}`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createWardInchargeUser();
