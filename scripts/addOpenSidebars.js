const sequelize = require("../dist/config/database").default;
const Sidebar = require("../dist/models/Sidebar").default;

const addOpenSidebars = async () => {
  try {
    const sidebarsToAdd = [
      {
        id: 901,
        dispName: "Requests",
        screenName: "REQUESTS_SCREEN",
        icon: "copy",
        createdBy: 999999,
        updatedBy: 999999,
        status: 1
      },
      {
        id: 902,
        dispName: "Profile",
        screenName: "PROFILE_SCREEN",
        icon: "id-card",
        createdBy: 999999,
        updatedBy: 999999,
        status: 1
      },
      {
        id: 950,
        dispName: "Dashboard",
        screenName: "DASHBOARD_SCREEN",
        icon: "tachometer-alt",
        createdBy: 999999,
        updatedBy: 999999,
        status: 1
      }
    ];

    for (const sidebar of sidebarsToAdd) {
      const [record, created] = await Sidebar.findOrCreate({
        where: { id: sidebar.id },
        defaults: sidebar
      });

      if (!created) {
        await record.update(sidebar);
        console.log(`Updated sidebar ${sidebar.id}: ${sidebar.disp_name}`);
      } else {
        console.log(`Created sidebar ${sidebar.id}: ${sidebar.disp_name}`);
      }
    }

    console.log("✅ Open sidebars and dashboard added successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding sidebars:", error);
    process.exit(1);
  }
};

addOpenSidebars();
