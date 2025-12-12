import { Request, Response } from "express";
import User from "../models/User";
import MetaUserRole from "../models/MetaUserRole";
import MetaPermission from "../models/MetaPermission";
import MetaPermissionGroup from "../models/MetaPermissionGroup";

export class AdminDashboardController {
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      // Get statistics
      const userCount = await User.count();
      const roleCount = await MetaUserRole.count();
      const permissionCount = await MetaPermission.count();
      const permissionGroupCount = await MetaPermissionGroup.count();

      // Get recent users
      const recentUsers = await User.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]],
        attributes: ["id", "email", "firstName", "lastName", "status", "createdAt"]
      });

      // Get all roles
      const roles = await MetaUserRole.findAll({
        attributes: ["id", "dispName", "description"],
        limit: 10
      });

      res.render("admin/dashboard", {
        title: "Admin Dashboard",
        currentPage: "dashboard",
        stats: {
          users: userCount,
          roles: roleCount,
          permissions: permissionCount,
          permissionGroups: permissionGroupCount
        },
        recentUsers,
        roles,
        user: (req as any).user
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      res.status(500).render("admin/dashboard", {
        title: "Admin Dashboard",
        error: "Failed to load dashboard data",
        stats: { users: 0, roles: 0, permissions: 0, permissionGroups: 0 },
        recentUsers: [],
        roles: [],
        user: (req as any).user
      });
    }
  }
}
