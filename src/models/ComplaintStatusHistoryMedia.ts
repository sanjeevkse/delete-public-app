import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes
} from "sequelize";
import sequelize from "../config/database";

class ComplaintStatusHistoryMedia extends Model<
  InferAttributes<ComplaintStatusHistoryMedia>,
  InferCreationAttributes<ComplaintStatusHistoryMedia>
> {
  declare id: CreationOptional<number>;
  declare complaintStatusHistoryId: number;
  declare mediaType: "PHOTO" | "VIDEO" | "DOCUMENT";
  declare mediaUrl: string;
  declare thumbnailUrl: string | null;
  declare mimeType: string | null;
  declare fileSize: number | null;
  declare positionNumber: CreationOptional<number>;
  declare caption: string | null;
  declare status: CreationOptional<number>;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedBy: number | null;
  declare updatedAt: CreationOptional<Date>;
}

ComplaintStatusHistoryMedia.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    complaintStatusHistoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "complaint_status_history_id"
    },
    mediaType: {
      type: DataTypes.ENUM("PHOTO", "VIDEO", "DOCUMENT"),
      allowNull: false,
      field: "media_type"
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "media_url"
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "thumbnail_url"
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "mime_type"
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "file_size"
    },
    positionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "position_number"
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "updated_by"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "tbl_complaint_status_history_media",
    modelName: "ComplaintStatusHistoryMedia",
    timestamps: false
  }
);

export default ComplaintStatusHistoryMedia;
