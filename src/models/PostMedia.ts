import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import { MediaType } from "../types/enums";
import type Post from "./Post";

class PostMedia extends Model<InferAttributes<PostMedia>, InferCreationAttributes<PostMedia>> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare mediaType: MediaType;
  declare mediaUrl: string;
  declare thumbnailUrl: CreationOptional<string | null>;
  declare mimeType: CreationOptional<string | null>;
  declare durationSecond: CreationOptional<number | null>;
  declare positionNumber: CreationOptional<number>;
  declare caption: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare post?: NonAttribute<Post>;
}

PostMedia.init(
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
    mediaType: {
      field: "media_type",
      type: DataTypes.ENUM(MediaType.PHOTO, MediaType.VIDEO),
      allowNull: false
    },
    mediaUrl: {
      field: "media_url",
      type: DataTypes.STRING(500),
      allowNull: false
    },
    thumbnailUrl: {
      field: "thumbnail_url",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    mimeType: {
      field: "mime_type",
      type: DataTypes.STRING(100),
      allowNull: true
    },
    durationSecond: {
      field: "duration_second",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    positionNumber: {
      field: "position_number",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
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
    tableName: "tbl_post_media",
    modelName: "PostMedia",
    timestamps: false
  }
);

export default PostMedia;
export type PostMediaAttributes = InferAttributes<PostMedia>;
export type PostMediaCreationAttributes = InferCreationAttributes<PostMedia>;
