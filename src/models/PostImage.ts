import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type Post from "./Post";

import sequelize from "../config/database";

class PostImage extends Model<InferAttributes<PostImage>, InferCreationAttributes<PostImage>> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare imageUrl: string;
  declare caption: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare post?: NonAttribute<Post>;
}

PostImage.init(
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
    imageUrl: {
      field: "image_url",
      type: DataTypes.STRING(500),
      allowNull: false
    },
    caption: {
      type: DataTypes.STRING(255),
      allowNull: true
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
    tableName: "tbl_post_image",
    modelName: "PostImage",
    timestamps: false
  }
);

export default PostImage;
export type PostImageAttributes = InferAttributes<PostImage>;
export type PostImageCreationAttributes = InferCreationAttributes<PostImage>;
