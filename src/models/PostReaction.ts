import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type Post from "./Post";
import type User from "./User";

import sequelize from "../config/database";
import { PostReactionType } from "../types/enums";

class PostReaction extends Model<
  InferAttributes<PostReaction>,
  InferCreationAttributes<PostReaction>
> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare userId: number;
  declare reaction: PostReactionType;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare post?: NonAttribute<Post>;
  declare user?: NonAttribute<User>;
}

PostReaction.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    postId: {
      field: "post_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    reaction: {
      type: DataTypes.ENUM(PostReactionType.LIKE, PostReactionType.DISLIKE),
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "tbl_post_reaction",
    modelName: "PostReaction",
    timestamps: false
  }
);

export default PostReaction;
