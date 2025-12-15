const { Op } = require('sequelize');
const MetaUserRole = require('./dist/models/MetaUserRole').default;

(async () => {
  try {
    const roleNames = ["Public"];
    const roles = await MetaUserRole.findAll({
      where: { dispName: { [Op.in]: roleNames } },
      attributes: ["id"],
      raw: true
    });
    console.log("Found roles:", roles);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
